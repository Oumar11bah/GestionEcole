import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, BookOpen, Hash, Layers, FileText } from 'lucide-react';
import { subjectService } from '../services/api';

const SubjectDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subjectService.getById(id)
      .then((r) => setSubject(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
    </div>
  );

  if (!subject) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
      <BookOpen className="w-16 h-16 mb-4 text-gray-300" />
      <p className="text-lg font-medium">{t('subjectDetail.notFound')}</p>
      <Link to="/subjects" className="mt-4 text-blue-600 hover:underline text-sm">{t('subjectDetail.backToList')}</Link>
    </div>
  );

  const cycleLabels = { primaire: t('subjectDetail.cyclePrimaire'), college: t('subjectDetail.cycleCollege'), lycee: t('subjectDetail.cycleLycee') };
  const cycleColors = {
    primaire: 'bg-green-50 text-green-700 border-green-200',
    college: 'bg-blue-50 text-blue-700 border-blue-200',
    lycee: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const typeLabels = { obligatoire: t('subjectDetail.typeMandatory'), optionnelle: t('subjectDetail.typeOptional') };
  const typeColors = { obligatoire: 'bg-blue-50 text-blue-700', optionnelle: 'bg-orange-50 text-orange-700' };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link to="/subjects" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-mono font-semibold tracking-wider border border-gray-200">
                {subject.code}
              </span>
              {subject.subject_type && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[subject.subject_type] || 'bg-gray-50 text-gray-600'}`}>
                  {typeLabels[subject.subject_type] || subject.subject_type}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{t('subjectDetail.details')}</p>
          </div>
        </div>
        <Link
          to={`/subjects/${id}/edit`}
          className="flex items-center space-x-2 bg-yellow-500 text-white px-5 py-2.5 rounded-lg hover:bg-yellow-600 transition-colors shadow-sm hover:shadow font-medium text-sm"
        >
          <Pencil className="w-4 h-4" />
          <span>{t('subjectDetail.edit')}</span>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('subjectDetail.generalInfo')}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('subjectDetail.nameLabel')}</p>
                    <p className="text-gray-900 font-semibold mt-0.5">{subject.name}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Hash className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('subjectDetail.codeLabel')}</p>
                    <p className="text-gray-900 font-mono font-semibold mt-0.5">{subject.code}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Layers className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('subjectDetail.coefficientLabel')}</p>
                    <span className="inline-block mt-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-semibold">
                      x{subject.coefficient}
                    </span>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <BookOpen className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('subjectDetail.typeLabel')}</p>
                    <p className="text-gray-900 font-medium mt-0.5 capitalize">
                      {typeLabels[subject.subject_type] || subject.subject_type || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('subjectDetail.concernedCycles')}</h2>
            </div>
            <div className="p-6">
              {(subject.cycle_details && subject.cycle_details.length > 0) ? (
                <div className="flex flex-wrap gap-3">
                  {subject.cycle_details.map((c) => (
                    <span
                      key={c.id}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border ${cycleColors[c.name] || 'bg-gray-50 text-gray-700 border-gray-200'}`}
                    >
                      {cycleLabels[c.name] || c.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">{t('subjectDetail.noCycles')}</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('subjectDetail.descriptionTitle')}</h2>
            </div>
            <div className="p-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {subject.description || t('subjectDetail.noDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('subjectDetail.metadataTitle')}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('subjectDetail.createdOn')}</p>
                <p className="text-gray-900 text-sm font-medium mt-0.5">
                  {subject.created_at ? new Date(subject.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('subjectDetail.assignedTo')}</p>
                <p className="text-gray-900 text-sm font-medium mt-0.5">
                  {subject.teacher ? (
                    <span>{subject.teacher}</span>
                  ) : (
                    <span className="text-gray-400">{t('subjectDetail.noTeacher')}</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/subjects"
            className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
<span>{t('subjectDetail.backToList')}</span>
        </Link>
        </div>
      </div>
    </div>
  );
};

export default SubjectDetail;
