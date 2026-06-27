import axios from 'axios';
import jwtDecode from 'jwt-decode';

const API_URL = '/api';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let browser set Content-Type for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const REFRESH_TIMEOUT = 10000; // 10s timeout for refresh

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/accounts/token/refresh/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/accounts/token/refresh/`, {
            refresh: refreshToken,
          }, { timeout: REFRESH_TIMEOUT });

          const { access, refresh } = response.data;
          localStorage.setItem('access_token', access);
          if (refresh) localStorage.setItem('refresh_token', refresh);

          processQueue(null, access);

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        } finally {
          isRefreshing = false;
        }
      } else {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: (credentials) => api.post('/accounts/token/', credentials),
  register: (userData) => api.post('/accounts/users/', userData),
  getProfile: () => api.get('/accounts/profiles/'),
  updateProfile: (userId, data) => api.patch(`/accounts/users/${userId}/`, data),
  changePassword: (data) => api.post('/accounts/change-password/', data),
  setupAdmin: (data) => api.post('/accounts/setup-admin/', data),
  loginState: (username) => api.get('/accounts/login-state/', { params: { username } }),
  adminContact: () => api.get('/accounts/admin-contact/'),
  unblockUser: (userId) => api.post(`/accounts/users/${userId}/unblock/`),
};

export const studentService = {
  getAll: (params) => api.get('/students/students/', { params }),
  getById: (id) => api.get(`/students/students/${id}/`),
  create: (data) => api.post('/students/students/', data),
  update: (id, data) => api.patch(`/students/students/${id}/`, data),
  delete: (id) => api.delete(`/students/students/${id}/`),
  getCardPdf: (id, duplicate = false) => api.get(`/students/students/${id}/card_pdf/`, {
    params: { duplicate },
    responseType: 'blob'
  }),
  getListPdf: (params) => api.get('/students/students/list_pdf/', {
    params,
    responseType: 'blob'
  }),
};

export const classService = {
  getAll: (params) => api.get('/classes/classes/', { params }),
  getById: (id) => api.get(`/classes/classes/${id}/`),
  create: (data) => api.post('/classes/classes/', data),
  update: (id, data) => api.put(`/classes/classes/${id}/`, data),
  delete: (id) => api.delete(`/classes/classes/${id}/`),
};

export const cycleService = {
  getAll: (params) => api.get('/classes/cycles/', { params }),
};

export const subjectService = {
  getAll: (params) => api.get('/subjects/subjects/', { params }),
  getById: (id) => api.get(`/subjects/subjects/${id}/`),
  create: (data) => api.post('/subjects/subjects/', data),
  update: (id, data) => api.put(`/subjects/subjects/${id}/`, data),
  delete: (id) => api.delete(`/subjects/subjects/${id}/`),
  byClass: (classId) => api.get('/subjects/subjects/by_class/', { params: { class_id: classId } }),
};

export const teacherService = {
  getAll: (params) => api.get('/teachers/teachers/', { params }),
  getById: (id) => api.get(`/teachers/teachers/${id}/`),
  create: (data) => api.post('/teachers/teachers/', data),
  update: (id, data) => api.patch(`/teachers/teachers/${id}/`, data),
  delete: (id) => api.delete(`/teachers/teachers/${id}/`),
};

export const gradeService = {
  getAll: (params) => api.get('/grades/grades/', { params }),
  getById: (id) => api.get(`/grades/grades/${id}/`),
  create: (data) => api.post('/grades/grades/', data),
  update: (id, data) => api.put(`/grades/grades/${id}/`, data),
  delete: (id) => api.delete(`/grades/grades/${id}/`),
  getAllTerms: (params) => api.get('/grades/terms/', { params }),
  getAllAverages: (params) => api.get('/grades/averages/', { params }),
  recalculateAverages: (data) => api.post('/grades/grades/recalculate_averages/', data),
  getBulletinPdf: (studentId, termId) => api.get('/grades/averages/bulletin_pdf/', {
    params: { student_id: studentId, term_id: termId },
    responseType: 'blob'
  }),
  getBulletinsBatchPdf: (classId, termId) => api.get('/grades/averages/bulletins_batch_pdf/', {
    params: { class_id: classId, term_id: termId },
    responseType: 'blob'
  }),
  initialize: (data) => api.post('/grades/grades/initialize/', data),
  importExcel: (data) => api.post('/grades/grades/import_excel/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getHistory: (params) => api.get('/grades/history/', { params }),
  studentResults: (classId, termId) => api.get('/grades/averages/student_results/', {
    params: { class_id: classId, term_id: termId },
  }),
  resultsPdf: (classId, termId, type = 'all') => api.get('/grades/averages/results_pdf/', {
    params: { class_id: classId, term_id: termId, type },
    responseType: 'blob',
  }),
  resultsExcel: (classId, termId, type = 'all') => api.get('/grades/averages/results_excel/', {
    params: { class_id: classId, term_id: termId, type },
    responseType: 'blob',
  }),
};

export const teacherSubjectService = {
  getAll: (params) => api.get('/subjects/teacher-subjects/', { params }),
  create: (data) => api.post('/subjects/teacher-subjects/', data),
  delete: (id) => api.delete(`/subjects/teacher-subjects/${id}/`),
};

export const attendanceService = {
  getAll: (params) => api.get('/attendance/attendance/', { params }),
  create: (data) => api.post('/attendance/attendance/', data),
  update: (id, data) => api.put(`/attendance/attendance/${id}/`, data),
  delete: (id) => api.delete(`/attendance/attendance/${id}/`),
};

export const paymentService = {
  getAll: (params) => api.get('/payments/payments/', { params }),
  getById: (id) => api.get(`/payments/payments/${id}/`),
  create: (data) => api.post('/payments/payments/', data),
  update: (id, data) => api.patch(`/payments/payments/${id}/`, data),
  delete: (id) => api.delete(`/payments/payments/${id}/`),
  getAllFeeTypes: (params) => api.get('/payments/fee-types/', { params }),
  createFeeType: (data) => api.post('/payments/fee-types/', data),
  updateFeeType: (id, data) => api.patch(`/payments/fee-types/${id}/`, data),
  deleteFeeType: (id) => api.delete(`/payments/fee-types/${id}/`),
  initiateMobilePayment: (data) => api.post('/mobile/providers/initiate_payment/', data),
};

export const communicationService = {
  getAllMessages: (params) => api.get('/communication/messages/', { params }),
  getAllNotifications: (params) => api.get('/communication/notifications/', { params }),
  markAllRead: (userId) => api.post('/communication/notifications/mark_all_read/', { recipient_id: userId }),
  markAsRead: (id) => api.post(`/communication/notifications/${id}/mark_as_read/`),
  deleteNotification: (id) => api.delete(`/communication/notifications/${id}/`),
  getUnreadCount: (userId) => api.get('/communication/notifications/unread_count/', { params: { recipient_id: userId } }),
  sendBulkNotification: (data) => api.post('/communication/notifications/send_bulk/', data),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/dashboard/'),
};

export const timetableService = {
  getAll: (params) => api.get('/classes/schedule/', { params }),
  create: (data) => api.post('/classes/schedule/', data),
  update: (id, data) => api.put(`/classes/schedule/${id}/`, data),
  delete: (id) => api.delete(`/classes/schedule/${id}/`),
};

export const registrationService = {
  getAll: (params) => api.get('/registrations/registrations/', { params }),
  getById: (id) => api.get(`/registrations/registrations/${id}/`),
  create: (data) => api.post('/registrations/registrations/', data),
  update: (id, data) => api.patch(`/registrations/registrations/${id}/`, data),
  delete: (id) => api.delete(`/registrations/registrations/${id}/`),
  registerStudent: (data) => api.post('/registrations/registrations/register_student/', data),
  approve: (id) => api.post(`/registrations/registrations/${id}/approve/`),
};

export const roomService = {
  getAll: (params) => api.get('/rooms/rooms/', { params }),
  getById: (id) => api.get(`/rooms/rooms/${id}/`),
  create: (data) => api.post('/rooms/rooms/', data),
  update: (id, data) => api.patch(`/rooms/rooms/${id}/`, data),
  delete: (id) => api.delete(`/rooms/rooms/${id}/`),
};

export const resultService = {
  getAll: (params) => api.get('/results/results/', { params }),
  getById: (id) => api.get(`/results/results/${id}/`),
  create: (data) => api.post('/results/results/', data),
  update: (id, data) => api.patch(`/results/results/${id}/`, data),
  delete: (id) => api.delete(`/results/results/${id}/`),
  compute: (data) => api.post('/results/results/compute/', data),
  admisList: (classId, termId) => api.get('/results/results/admis_list/', {
    params: { class_id: classId, term_id: termId },
  }),
};

export const academicYearService = {
  getAll: (params) => api.get('/school/academic-years/', { params }),
  get: (id) => api.get(`/school/academic-years/${id}/`),
  create: (data) => api.post('/school/academic-years/', data),
  update: (id, data) => api.put(`/school/academic-years/${id}/`, data),
  delete: (id) => api.delete(`/school/academic-years/${id}/`),
};

export const schoolService = {
  get: () => api.get('/school/school/'),
  update: (data) => api.post('/school/school/', data),
};

export const semesterService = {
  getAll: (params) => api.get('/school/semesters/', { params }),
  get: (id) => api.get(`/school/semesters/${id}/`),
  create: (data) => api.post('/school/semesters/', data),
  update: (id, data) => api.put(`/school/semesters/${id}/`, data),
  delete: (id) => api.delete(`/school/semesters/${id}/`),
};

export const salaryService = {
  getAll: (params) => api.get('/teachers/salary-history/', { params }),
  create: (data) => api.post('/teachers/salary-history/', data),
  update: (id, data) => api.patch(`/teachers/salary-history/${id}/`, data),
  delete: (id) => api.delete(`/teachers/salary-history/${id}/`),
};

export const activityService = {
  getAll: (params) => api.get('/dashboard/activities/', { params }),
  delete: (id) => api.delete(`/dashboard/activities/${id}/`),
  clearAll: () => api.post('/dashboard/activities/clear_all/'),
};

export const userService = {
  getAll: (params) => api.get('/accounts/users/', { params }),
  getById: (id) => api.get(`/accounts/users/${id}/`),
  create: (data) => api.post('/accounts/users/', data),
  update: (id, data) => api.patch(`/accounts/users/${id}/`, data),
  delete: (id) => api.delete(`/accounts/users/${id}/`),
  resetPassword: (id) => api.post(`/accounts/users/${id}/reset_password/`),
  getStats: () => api.get('/accounts/users/stats/'),
  getRoles: () => api.get('/accounts/users/roles/'),
  getActivities: (params) => api.get('/accounts/activities/', { params }),
  deleteActivity: (id) => api.delete(`/accounts/activities/${id}/`),
  bulkDeleteActivities: (ids) => api.post('/accounts/activities/bulk_delete/', { ids }),
  getActivityModules: () => api.get('/accounts/activities/modules/'),
  clearActivities: () => api.post('/accounts/activities/clear_all/'),
  getLoginAttempts: (params) => api.get('/accounts/login-attempts/', { params }),
  getOnline: () => api.get('/accounts/users/online/'),
  getMyProfile: () => api.get('/accounts/me/'),
  updateMyProfile: (data) => api.patch('/accounts/me/', data),
  heartbeat: () => api.post('/accounts/heartbeat/'),
};

export const securityService = {
  getDashboard: () => api.get('/security/dashboard/'),
};

export const roleService = {
  getAll: () => api.get('/accounts/roles/'),
  getByName: (name) => api.get(`/accounts/roles/${name}/`),
  create: (data) => api.post('/accounts/roles/', data),
  update: (name, data) => api.patch(`/accounts/roles/${name}/`, data),
  delete: (name) => api.delete(`/accounts/roles/${name}/`),
  getModules: () => api.get('/accounts/roles/modules/'),
  resetDefaults: (name) => api.post(`/accounts/roles/${name}/reset_defaults/`),
};

export default api;
