import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { studentService } from '../services/api';

const API_URL = 'http://localhost:8000/api';

const StudentDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const fetchStudent = async () => {
    try {
      const response = await studentService.getById(id);
      setStudent(response.data);
    } catch (error) {
      console.error('Failed to fetch student:', error);
    } finally {
      setLoading(false);
    }
  };

  const printCard = () => {
    window.open(`${API_URL}/students/students/${id}/card/`, '_blank');
  };

  if (loading) return <div className="p-8">{t('studentDetail.loading')}</div>;
  if (!student) return <div className="p-8 text-center">{t('studentDetail.notFound')}</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/dashboard" className="text-xl font-bold text-indigo-600">{t('studentDetail.appName')}</Link>
              <div className="hidden md:flex space-x-4">
                <Link to="/students" className="text-gray-900 px-3 py-2 rounded-md text-sm font-medium">{t('studentDetail.navStudents')}</Link>
                <Link to="/classes" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">{t('studentDetail.navClasses')}</Link>
                <Link to="/grades" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">{t('studentDetail.navGrades')}</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold">{t('studentDetail.title')}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={printCard}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
            >
              {t('studentDetail.printCard')}
            </button>
            <Link
              to={`/students/${id}/edit`}
              className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 text-sm font-medium"
            >
              {t('studentDetail.edit')}
            </Link>
            <Link
              to="/students"
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm font-medium"
            >
              {t('studentDetail.back')}
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-indigo-50 border-b">
            <h3 className="text-lg font-semibold text-indigo-800">{t('studentDetail.personalInfo')}</h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">{t('studentDetail.matricule')}</p>
              <p className="text-lg font-semibold">{student.matricule}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('studentDetail.fullName')}</p>
              <p className="text-lg font-semibold">{student.first_name} {student.last_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('studentDetail.gender')}</p>
              <p className="text-lg font-semibold">{student.gender === 'M' ? t('studentDetail.male') : t('studentDetail.female')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('studentDetail.dateOfBirth')}</p>
              <p className="text-lg font-semibold">{new Date(student.date_of_birth).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('studentDetail.class')}</p>
              <p className="text-lg font-semibold">{student.class_assigned_name || t('studentDetail.notAssigned')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('studentDetail.parentGuardian')}</p>
              <p className="text-lg font-semibold">{student.parent?.full_name || t('studentDetail.notAssignedParent')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('studentDetail.enrollmentDate')}</p>
              <p className="text-lg font-semibold">{new Date(student.enrollment_date).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('studentDetail.status')}</p>
              <p className="text-lg font-semibold">
                <span className={`px-2 py-1 rounded-full text-sm ${student.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {student.is_active ? t('studentDetail.active') : t('studentDetail.inactive')}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
