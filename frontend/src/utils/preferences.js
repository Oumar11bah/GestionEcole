import { academicYearService } from '../services/api';

let cachedYears = null;

export const fetchAcademicYears = async (force = false) => {
  if (cachedYears && !force) return cachedYears;
  try {
    const res = await academicYearService.getAll();
    cachedYears = Array.isArray(res.data) ? res.data : (res.data?.results || []);
    return cachedYears;
  } catch {
    return [];
  }
};

export const getAcademicYears = () => cachedYears || [];

export const getLatestAcademicYear = () => {
  if (cachedYears && cachedYears.length > 0) {
    return cachedYears[0].name;
  }
  return '';
};

export const getDefaultAcademicYear = () => {
  return getPreferredAcademicYear() || getLatestAcademicYear() || '';
};

export const getPreferredAcademicYear = () => {
  try {
    const stored = localStorage.getItem('edumanager_user');
    if (stored) {
      const user = JSON.parse(stored);
      return user?.profile?.preferred_academic_year || '';
    }
  } catch {}
  return '';
};
