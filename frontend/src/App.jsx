import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentForm from './pages/StudentForm';
import StudentProfile from './pages/StudentProfile';
import Classes from './pages/Classes';
import ClassProfile from './pages/ClassProfile';
import ClassForm from './pages/ClassForm';
import Teachers from './pages/Teachers';
import TeacherDetail from './pages/TeacherDetail';
import TeacherForm from './pages/TeacherForm';
import Subjects from './pages/Subjects';
import SubjectForm from './pages/SubjectForm';
import SubjectDetail from './pages/SubjectDetail';
import Grades from './pages/Grades';
import Averages from './pages/Averages';
import Attendance from './pages/Attendance';
import Payments from './pages/Payments';
import Timetable from './pages/Timetable';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Registrations from './pages/Registrations';
import Rooms from './pages/Rooms';
import Results from './pages/Results';
import Bulletins from './pages/Bulletins';
import ActivityHistory from './pages/ActivityHistory';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import PermissionGuard from './components/PermissionGuard';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }
  return user ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/students" element={<PrivateRoute><Layout><Students /></Layout></PrivateRoute>} />
          <Route path="/students/new" element={<PrivateRoute><Layout><StudentForm /></Layout></PrivateRoute>} />
          <Route path="/students/:id" element={<PrivateRoute><Layout><StudentProfile /></Layout></PrivateRoute>} />
          <Route path="/students/:id/edit" element={<PrivateRoute><Layout><StudentForm /></Layout></PrivateRoute>} />
          <Route path="/classes" element={<PrivateRoute><Layout><Classes /></Layout></PrivateRoute>} />
          <Route path="/classes/new" element={<PrivateRoute><Layout><ClassForm /></Layout></PrivateRoute>} />
          <Route path="/classes/:id" element={<PrivateRoute><Layout><ClassProfile /></Layout></PrivateRoute>} />
          <Route path="/classes/:id/edit" element={<PrivateRoute><Layout><ClassForm /></Layout></PrivateRoute>} />
          <Route path="/teachers" element={<PrivateRoute><Layout><Teachers /></Layout></PrivateRoute>} />
          <Route path="/teachers/new" element={<PrivateRoute><Layout><TeacherForm /></Layout></PrivateRoute>} />
          <Route path="/teachers/:id" element={<PrivateRoute><Layout><TeacherDetail /></Layout></PrivateRoute>} />
          <Route path="/teachers/:id/edit" element={<PrivateRoute><Layout><TeacherForm /></Layout></PrivateRoute>} />
          <Route path="/subjects" element={<PrivateRoute><Layout><Subjects /></Layout></PrivateRoute>} />
          <Route path="/subjects/new" element={<PrivateRoute><Layout><SubjectForm /></Layout></PrivateRoute>} />
          <Route path="/subjects/:id/edit" element={<PrivateRoute><Layout><SubjectForm /></Layout></PrivateRoute>} />
          <Route path="/subjects/:id" element={<PrivateRoute><Layout><SubjectDetail /></Layout></PrivateRoute>} />
          <Route path="/grades" element={<PrivateRoute><Layout><Grades /></Layout></PrivateRoute>} />
          <Route path="/averages" element={<PrivateRoute><Layout><Averages /></Layout></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><Layout><Attendance /></Layout></PrivateRoute>} />
          <Route path="/payments" element={<PrivateRoute><Layout><Payments /></Layout></PrivateRoute>} />
          <Route path="/timetable" element={<PrivateRoute><Layout><Timetable /></Layout></PrivateRoute>} />
          <Route path="/registrations" element={<PrivateRoute><Layout><Registrations /></Layout></PrivateRoute>} />
          <Route path="/rooms" element={<PrivateRoute><Layout><Rooms /></Layout></PrivateRoute>} />
          <Route path="/results" element={<PrivateRoute><Layout><Results /></Layout></PrivateRoute>} />
          <Route path="/bulletins" element={<PrivateRoute><Layout><Bulletins /></Layout></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Layout><Reports /></Layout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><Layout><UserManagement /></Layout></PrivateRoute>} />
          <Route path="/roles" element={<PrivateRoute><Layout><PermissionGuard module="users"><RoleManagement /></PermissionGuard></Layout></PrivateRoute>} />
          <Route path="/activity" element={<PrivateRoute><Layout><ActivityHistory /></Layout></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
