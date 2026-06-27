import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, Eye, Pencil, Trash2, CreditCard, Printer, UserPlus } from 'lucide-react';
import { studentService, classService, cycleService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getPreferredAcademicYear, fetchAcademicYears } from '../utils/preferences';
import MessageModal from '../components/MessageModal';

const Students = () => {
  const { t } = useTranslation();
  const { canAccess } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  const [cycles, setCycles] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filterCycle, setFilterCycle] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [years, setYears] = useState([]);

  useEffect(() => {
    fetchStudents();
    fetchCycles();
    fetchClasses();
    fetchAcademicYears().then(setYears);
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await studentService.getAll();
      setStudents(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCycles = async () => {
    try {
      const response = await cycleService.getAll();
      setCycles(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch cycles:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classService.getAll();
      setClasses(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const classCycleMap = {};
  classes.forEach((c) => {
    classCycleMap[c.id] = c.cycle?.name || '';
  });

  const filteredStudents = students.filter((s) => {
    const term = search.toLowerCase();
    const matchSearch = search === '' ||
      `${s.first_name} ${s.last_name} ${s.matricule}`.toLowerCase().includes(term);

    const studentCycle = classCycleMap[s.class_assigned] || '';
    const matchCycle = filterCycle === '' || studentCycle === filterCycle;

    const matchClass = filterClass === '' || s.class_assigned_name === filterClass;

    const matchStatus = filterStatus === '' ||
      (filterStatus === 'Actif' && s.status === 'active') ||
      (filterStatus === 'Suspendu' && s.status === 'suspended') ||
      (filterStatus === 'Radie' && s.status === 'expelled');

    const matchYear = filterYear === '' || s.academic_year === filterYear;

    return matchSearch && matchCycle && matchClass && matchStatus && matchYear;
  });

  const filteredClasses = classes.filter((c) => {
    if (filterCycle === '') return true;
    return c.cycle?.name === filterCycle;
  });

  const handleCycleChange = (e) => {
    setFilterCycle(e.target.value);
    setFilterClass('');
  };

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('students.confirmLabel') : '' });
  };

  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  const handleDelete = async (id) => {
    showModal('warning', t('students.confirmDeleteTitle'), t('students.confirmDeleteMessage'), async () => {
      try {
        await studentService.delete(id);
        fetchStudents();
        closeModal();
      } catch (error) {
        showModal('error', t('students.errorTitle'), t('students.errorDelete'));
      }
    });
  };

  const handlePrintCard = async (student) => {
    try {
      const response = await studentService.getCardPdf(student.id);
      if (!response.data || response.data.size === 0) {
        showModal('error', t('students.errorTitle'), t('students.errorPdfEmpty'));
        return;
      }
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `carte_${student.matricule}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error) {
      const msg = error.response?.status ? `${t('students.errorPrefix')} ${error.response.status}` : error.message;
      showModal('error', t('students.errorTitle'), `${t('students.errorCardGeneration')} ${msg}`);
    }
  };

  const handlePrintList = async () => {
    try {
      const params = {};
      if (filterCycle !== '') params.cycle = filterCycle;
      if (filterClass !== '') {
        const found = classes.find((c) => c.name === filterClass);
        if (found) params.class_id = found.id;
      }
      if (filterStatus !== '') {
        const statusMap = { 'Actif': 'active', 'Suspendu': 'suspended', 'Radie': 'expelled' };
        params.status = statusMap[filterStatus];
      }
      const response = await studentService.getListPdf(params);
      if (!response.data || response.data.size === 0) {
        showModal('error', t('students.errorTitle'), t('students.errorPdfGeneratedEmpty'));
        return;
      }
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'liste_eleves.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error) {
      const msg = error.response?.status ? `${t('students.errorPrefix')} ${error.response.status}` : error.message;
      showModal('error', t('students.errorTitle'), `${t('students.errorListGeneration')} ${msg}`);
    }
  };

  const statusBadge = (status) => {
    const map = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-yellow-100 text-yellow-700',
      expelled: 'bg-red-100 text-red-700',
    };
    const labels = { active: t('students.statusActive'), suspended: t('students.statusSuspended'), expelled: t('students.statusExpelled') };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <>
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('students.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('students.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handlePrintList}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>{t('students.printList')}</span>
          </button>
          {canAccess('registrations') ? (
            <Link to="/registrations" className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>{t('students.registrations')}</span>
            </Link>
          ) : (
            <button onClick={() => showModal('denied', t('students.accessDeniedTitle'), t('students.accessDeniedMessage'))} className="flex items-center space-x-2 bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed opacity-60 text-sm">
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>{t('students.registrations')}</span>
            </button>
          )}
        </div>
      </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('students.searchPlaceholder')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('students.searchPlaceholder')} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('results.cycle')}</label>
            <select value={filterCycle} onChange={handleCycleChange} className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('results.select')}</option>
              {cycles.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('registrations.class')}</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('results.select')}</option>
              {filteredClasses.map((c) => <option key={c.id} value={c.name}>{c.display_name || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('attendance.status')}</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('results.select')}</option>
              <option value="Actif">{t('students.statusActive')}</option>
              <option value="Suspendu">{t('students.statusSuspended')}</option>
              <option value="Radie">{t('students.statusExpelled')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('results.academic_year')}</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('results.select')}</option>
              {years.map((y) => <option key={y.id} value={y.name}>{y.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            {t('students.count', { count: filteredStudents.length })}
          </div>
          <button onClick={() => { setSearch(''); setFilterCycle(''); setFilterClass(''); setFilterStatus(''); setFilterYear(''); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {t('students.reset')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
              <th className="px-6 py-3 font-medium">{t('students.headerPhoto')}</th>
              <th className="px-6 py-3 font-medium">{t('students.headerFullName')}</th>
              <th className="px-6 py-3 font-medium">{t('students.headerClass')}</th>
              <th className="px-6 py-3 font-medium">{t('students.headerParent')}</th>
              <th className="px-6 py-3 font-medium">{t('students.headerPhone')}</th>
              <th className="px-6 py-3 font-medium">{t('students.headerStatus')}</th>
              <th className="px-6 py-3 font-medium">{t('students.headerActions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">{t('students.empty')}</td></tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                   <td className="px-6 py-4">
                     {student.photo_url ? (
                       <img src={student.photo_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
                     ) : (
                       <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm border-2 border-gray-200">
                         {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                       </div>
                     )}
                   </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{student.first_name} {student.last_name}</div>
                    <div className="text-xs text-gray-500">{student.matricule}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{student.class_assigned_name || student.class_assigned || t('students.notAssigned')}</td>
                  <td className="px-6 py-4 text-gray-600">{student.parent_details?.full_name || student.parent?.full_name || t('students.notAssigned')}</td>
                  <td className="px-6 py-4 text-gray-600">{student.parent_details?.phone_number || student.parent?.phone_number || '—'}</td>
                  <td className="px-6 py-4">{statusBadge(student.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePrintCard(student)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                        title={t('students.printCardTitle')}
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                      <Link to={`/students/${student.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title={t('students.viewTitle')}>
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link to={`/students/${student.id}/edit`} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg" title={t('students.editTitle')}>
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title={t('students.deleteTitle')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
      <MessageModal
        open={modal.open}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        variant={modal.variant}
        confirmLabel={modal.confirmLabel}
        onConfirm={modal.onConfirm}
      />
    </>
  );
};

export default Students;
