import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Users, Calendar, BookOpen, GraduationCap, AlertCircle } from 'lucide-react';
import { classService, studentService } from '../services/api';

const SERIES_SHORT = { maths: 'SM', experimental: 'SE', sociales: 'SS', lettres: 'L' };

const ClassProfile = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [classe, setClasse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      classService.getById(id),
      studentService.getAll({ class_id: id }),
    ])
      .then(([c, s]) => {
        setClasse(c.data);
        setStudents(s.data.results || s.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!classe) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-2" />
        <p>{t('classProfile.notFound')}</p>
        <Link to="/classes" className="text-blue-600 mt-2 hover:underline">{t('classProfile.back')}</Link>
      </div>
    );
  }

  const cycleName = classe.cycle?.name || classe.cycle_name || '';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link to="/classes" className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{classe.display_name || classe.name}</h1>
            <p className="text-sm text-gray-500">{cycleName}</p>
          </div>
        </div>
        <Link
          to={`/classes/${id}/edit`}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          <span>{t('classProfile.editButton')}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center space-x-3 text-blue-600 mb-4">
            <GraduationCap className="w-5 h-5" />
            <h3 className="font-semibold">{t('classProfile.infoTitle')}</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('classProfile.infoName')}</span>
              <span className="font-medium">{classe.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('classProfile.infoCycle')}</span>
              <span className="font-medium capitalize">{cycleName}</span>
            </div>
            {cycleName === 'lycee' && classe.specialty && classe.specialty !== 'none' && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t('classProfile.infoSeries')}</span>
                <span className="font-medium">{SERIES_SHORT[classe.specialty] || classe.specialty}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">{t('classProfile.infoAcademicYear')}</span>
              <span className="font-medium">{classe.academic_year}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('classProfile.infoTeacher')}</span>
              <span className="font-medium">{classe.class_teacher_name || t('classProfile.notAssigned')}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center space-x-3 text-green-600 mb-4">
            <Users className="w-5 h-5" />
            <h3 className="font-semibold">{t('classProfile.studentsTitle')}</h3>
          </div>
          <div className="text-center py-4">
            <span className="text-3xl font-bold text-gray-900">{students.length}</span>
            <p className="text-sm text-gray-500 mt-1">{t('classProfile.studentsEnrolled')}</p>
          </div>
          <Link
            to={`/students?class_id=${id}`}
            className="block text-center text-sm text-blue-600 hover:underline mt-2"
          >
            {t('classProfile.viewList')}
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center space-x-3 text-purple-600 mb-4">
            <BookOpen className="w-5 h-5" />
            <h3 className="font-semibold">{t('classProfile.scheduleTitle')}</h3>
          </div>
          <div className="text-center py-4">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{t('classProfile.viewSchedule')}</p>
          </div>
          <Link
            to={`/timetable?class_id=${id}`}
            className="block text-center text-sm text-blue-600 hover:underline mt-2"
          >
            {t('classProfile.consult')}
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">{t('classProfile.studentListTitle', { count: students.length })}</h3>
        </div>
        {students.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">{t('classProfile.studentListEmpty')}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                <th className="px-6 py-3 font-medium">{t('classProfile.headerMatricule')}</th>
                <th className="px-6 py-3 font-medium">{t('classProfile.headerName')}</th>
                <th className="px-6 py-3 font-medium">{t('classProfile.headerFirstName')}</th>
                <th className="px-6 py-3 font-medium">{t('classProfile.headerStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-600 font-mono text-sm">{s.matricule}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{s.last_name}</td>
                  <td className="px-6 py-4 text-gray-700">{s.first_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.status === 'active' ? 'bg-green-100 text-green-700' :
                      s.status === 'suspended' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {s.status === 'active' ? t('classProfile.statusActive') : s.status === 'suspended' ? t('classProfile.statusSuspended') : t('classProfile.statusExpelled')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ClassProfile;