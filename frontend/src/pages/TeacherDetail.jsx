import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Briefcase, GraduationCap, Award, Clock, DollarSign, BadgeCheck, BookOpen, School } from 'lucide-react';
import { teacherService } from '../services/api';

const PHOTO_BASE = 'http://localhost:8000';

const TeacherDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherService.getById(id)
      .then((r) => setTeacher(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
  if (!teacher) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
      <p className="text-lg font-medium">{t('teacherDetail.notFound')}</p>
      <Link to="/teachers" className="mt-4 text-blue-600 hover:underline text-sm">{t('teacherDetail.backToList')}</Link>
    </div>
  );

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center space-x-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
      </div>
    </div>
  );

  const subjects = teacher.teacher_subjects || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link to="/teachers" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('teacherDetail.title')}</h1>
        </div>
        <Link to={`/teachers/${teacher.id}/edit`} className="flex items-center space-x-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
          <span>{t('common.edit')}</span>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8">
              <div className="flex items-center space-x-5">
                {teacher.photo ? (
                  <img src={teacher.photo.startsWith('http') ? teacher.photo : `${PHOTO_BASE}${teacher.photo}`} alt={teacher.first_name} className="w-20 h-20 rounded-full border-4 border-white/50 object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-white/50 bg-blue-400 flex items-center justify-center text-white text-2xl font-bold">
                    {teacher.first_name?.charAt(0)}{teacher.last_name?.charAt(0)}
                  </div>
                )}
                <div className="text-white">
                  <h2 className="text-xl font-bold">{teacher.first_name} {teacher.last_name}</h2>
                  <p className="text-blue-200 text-sm">{teacher.matricule}</p>
                  <p className="text-blue-200 text-sm mt-1">{teacher.specialty || t('teacherDetail.teacher')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 p-6">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">{t('teacherDetail.personalInfo')}</h3>
                <InfoRow icon={Phone} label={t('teacherDetail.phone')} value={teacher.phone_number} />
                <InfoRow icon={Mail} label={t('teacherDetail.email')} value={teacher.email} />
                <InfoRow icon={MapPin} label={t('teacherDetail.address')} value={teacher.address} />
                <InfoRow icon={Calendar} label={t('teacherDetail.dateOfBirth')} value={teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString('fr-FR') : '—'} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">{t('teacherDetail.professionalInfo')}</h3>
                <InfoRow icon={Briefcase} label={t('teacherDetail.specialty')} value={teacher.specialty} />
                <InfoRow icon={GraduationCap} label={t('teacherDetail.diploma')} value={teacher.diploma} />
                <InfoRow icon={Award} label={t('teacherDetail.experience')} value={teacher.years_of_experience ? t('teacherDetail.years', { count: teacher.years_of_experience }) : '—'} />
                <InfoRow icon={Clock} label={t('teacherDetail.hireDate')} value={teacher.hire_date ? new Date(teacher.hire_date).toLocaleDateString('fr-FR') : '—'} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>{t('teacherDetail.subjectsTitle')}</span>
              </h3>
            </div>
            {subjects.length > 0 ? (
              <div className="p-6">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-3 font-semibold">{t('teacherDetail.subject')}</th>
                      <th className="pb-3 font-semibold">{t('teacherDetail.code')}</th>
                      <th className="pb-3 font-semibold">{t('teacherDetail.class')}</th>
                      <th className="pb-3 font-semibold">{t('teacherDetail.year')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s) => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 text-sm font-medium text-gray-900">{s.subject_name}</td>
                        <td className="py-3 text-sm text-gray-500 font-mono">{s.subject_code}</td>
                        <td className="py-3">
                          <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                            {s.class_name}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-gray-500">{s.academic_year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-400 text-sm">
                <School className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>{t('teacherDetail.noSubjects')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{t('teacherDetail.contractStatus')}</h3>
            </div>
            <div className="p-6 space-y-1">
              <InfoRow icon={BadgeCheck} label={t('teacherDetail.contractType')} value={teacher.contract_type === 'full_time' ? t('teacherDetail.fullTime') : t('teacherDetail.partTime')} />
              <InfoRow icon={DollarSign} label={t('teacherDetail.salary')} value={teacher.salary ? t('teacherDetail.salaryValue', { salary: teacher.salary }) : '—'} />
              <InfoRow icon={BadgeCheck} label={t('teacherDetail.status')} value={teacher.is_active ? t('teacherDetail.active') : t('teacherDetail.inactive')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDetail;
