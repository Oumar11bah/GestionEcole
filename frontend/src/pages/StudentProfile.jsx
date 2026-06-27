import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Mail, Calendar, Phone, User, CreditCard, AlertCircle, FileText, GraduationCap, Download, CreditCard as CardIcon, FileSpreadsheet } from 'lucide-react';
import { studentService, gradeService, attendanceService, paymentService, classService, subjectService } from '../services/api';
import MessageModal from '../components/MessageModal';

const StudentProfile = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [activeTab, setActiveTab] = useState('infos');
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('studentProfile.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  useEffect(() => {
    studentService.getById(id)
      .then((r) => setStudent(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab === 'documents') {
      Promise.all([classService.getAll(), gradeService.getAllTerms()])
        .then(([c, t]) => {
          setClasses(c.data.results || c.data);
          setTerms(t.data.results || t.data);
        })
        .catch(() => {});
    }
  }, [activeTab]);

  useEffect(() => {
    if (!student || activeTab === 'documents') return;
    setTabLoading(true);

    const fetchTabData = async () => {
      try {
        switch (activeTab) {
          case 'notes':
            const gradeRes = await gradeService.getAll({ student_id: id });
            setGrades(gradeRes.data.results || gradeRes.data);
            break;
          case 'absences':
            const attRes = await attendanceService.getAll({ student_id: id });
            setAbsences(attRes.data.results || attRes.data);
            break;
          case 'payments':
            const payRes = await paymentService.getAll({ student_id: id });
            setPayments(payRes.data.results || payRes.data);
            break;
        }
      } catch (error) {
        console.error('Failed to fetch tab data:', error);
      } finally {
        setTabLoading(false);
      }
    };

    fetchTabData();
  }, [activeTab, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (!student) return <div className="text-center py-12 text-gray-500">{t('studentProfile.notFound')}</div>;

  const tabs = [
    { id: 'infos', label: t('studentProfile.tabInfos'), icon: User },
    { id: 'notes', label: t('studentProfile.tabNotes'), icon: GraduationCap },
    { id: 'absences', label: t('studentProfile.tabAbsences'), icon: AlertCircle },
    { id: 'payments', label: t('studentProfile.tabPayments'), icon: CreditCard },
    { id: 'documents', label: t('studentProfile.tabDocuments'), icon: FileText },
  ];

  const getStatusBadge = (status) => {
    const map = {
      present: 'bg-green-100 text-green-700',
      absent: 'bg-red-100 text-red-700',
      late: 'bg-orange-100 text-orange-700',
      excused: 'bg-blue-100 text-blue-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const getPaymentStatus = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-orange-100 text-orange-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handlePrintCard = async () => {
    try {
      const response = await studentService.getCardPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `carte_${student.matricule}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      showModal('error', t('studentProfile.errorTitle'), t('studentProfile.cardError'));
    }
  };

  const handlePrintBulletin = async (termId) => {
    try {
      const response = await gradeService.getBulletinPdf(id, termId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bulletin_${student.matricule}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      showModal('error', t('studentProfile.errorTitle'), t('studentProfile.bulletinError'));
    }
  };

  const InfoField = ({ label, value }) => (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value || '\u2014'}</p>
    </div>
  );

  const statusBadge = (status) => {
    const map = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-yellow-100 text-yellow-700',
      expelled: 'bg-red-100 text-red-700',
    };
    const labels = { active: t('studentProfile.statusActive'), suspended: t('studentProfile.statusSuspended'), expelled: t('studentProfile.statusExpelled') };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
  };

  return (
    <div>
      <div className="mb-6">
        <Link to="/students" className="text-sm text-blue-600 hover:underline">&larr; {t('studentProfile.backToStudents')}</Link>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-start space-x-6">
          {student.photo_url ? (
            <img src={student.photo_url} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold border-4 border-white shadow">
              {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{student.first_name} {student.last_name}</h2>
              <div className="flex items-center space-x-2">
                <button onClick={() => handlePrintCard(false)} className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm">
                  <CardIcon className="w-4 h-4" />
                  <span>{t('studentProfile.studentCard')}</span>
                </button>

              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <GraduationCap className="w-4 h-4" />
                <span>{t('studentProfile.classLabel')}: <strong>{student.class_assigned_name || t('studentProfile.notAssigned')}</strong></span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{t('studentProfile.matriculeLabel')}: <strong>{student.matricule}</strong></span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{t('studentProfile.parentLabel')}: {student.parent_details?.full_name || student.parent?.full_name || '\u2014'}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{t('studentProfile.enrolledOn')}: {new Date(student.enrollment_date).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
            <div className="mt-3">
              {statusBadge(student.status)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 sm:px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'infos' && (
            <div className="grid grid-cols-2 gap-6">
              <InfoField label={t('studentProfile.firstName')} value={student.first_name} />
              <InfoField label={t('studentProfile.lastName')} value={student.last_name} />
              <InfoField label={t('studentProfile.matricule')} value={student.matricule} />
              <InfoField label={t('studentProfile.gender')} value={student.gender === 'M' ? t('studentProfile.male') : t('studentProfile.female')} />
              <InfoField label={t('studentProfile.dateOfBirth')} value={student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('fr-FR') : '\u2014'} />
              <InfoField label={t('studentProfile.placeOfBirth')} value={student.place_of_birth || '\u2014'} />
              <InfoField label={t('studentProfile.class')} value={student.class_assigned_name || t('studentProfile.notAssigned')} />
              <InfoField label={t('studentProfile.academicYear')} value={student.academic_year || '2024-2025'} />
              <InfoField label={t('studentProfile.parentGuardian')} value={student.parent_details?.full_name || student.parent?.full_name || '\u2014'} />
              <InfoField label={t('studentProfile.parentPhone')} value={student.parent_details?.phone_number || student.parent?.phone_number || '\u2014'} />
              <InfoField label={t('studentProfile.parentProfession')} value={student.parent_details?.profession || '\u2014'} />
              <InfoField label={t('studentProfile.parentDistrict')} value={student.parent_details?.quartier || '\u2014'} />
            </div>
          )}

          {activeTab === 'notes' && (
            tabLoading ? <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div> :
            grades.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{t('studentProfile.noGrades')}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                    <th className="px-4 py-2 font-medium">{t('studentProfile.subject')}</th>
                    <th className="px-4 py-2 font-medium text-center">{t('studentProfile.term1')}</th>
                    <th className="px-4 py-2 font-medium text-center">{t('studentProfile.term2')}</th>
                    <th className="px-4 py-2 font-medium text-center">{t('studentProfile.exam')}</th>
                    <th className="px-4 py-2 font-medium text-center">{t('studentProfile.average')}</th>
                    <th className="px-4 py-2 font-medium text-center">{t('studentProfile.appreciation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g) => {
                    const calcAvg = () => {
                      const scores = [];
                      const coeffs = [];
                      if (g.homework1 !== null && g.homework1 !== undefined) { scores.push(parseFloat(g.homework1)); coeffs.push(1); }
                      if (g.homework2 !== null && g.homework2 !== undefined) { scores.push(parseFloat(g.homework2)); coeffs.push(1); }
                      if (g.composition !== null && g.composition !== undefined) { scores.push(parseFloat(g.composition)); coeffs.push(2); }
                      if (scores.length === 0) return null;
                      const total = scores.reduce((acc, s, i) => acc + s * coeffs[i], 0);
                      const totalCoeff = coeffs.reduce((a, b) => a + b, 0);
                      return ((total / (20 * totalCoeff)) * 20).toFixed(2);
                    };
                    const avg = calcAvg();
                    const getAppr = (a) => {
                      if (!a) return '\u2014';
                      const v = parseFloat(a);
                      if (v >= 16) return t('studentProfile.excellent');
                      if (v >= 14) return t('studentProfile.good');
                      if (v >= 12) return t('studentProfile.fair');
                      if (v >= 10) return t('studentProfile.passing');
                      return t('studentProfile.insufficient');
                    };
                    const avgColor = () => {
                      const v = parseFloat(avg);
                      if (isNaN(v)) return 'text-gray-400';
                      if (v >= 16) return 'text-green-600';
                      if (v >= 14) return 'text-blue-600';
                      if (v >= 12) return 'text-amber-600';
                      if (v >= 10) return 'text-orange-600';
                      return 'text-red-600';
                    };
                    const apprColor = (a) => {
                      if (!a) return 'text-gray-400';
                      if (a === 'Tres bien') return 'text-green-600';
                      if (a === 'Bien') return 'text-blue-600';
                      if (a === 'Assez bien') return 'text-amber-600';
                      if (a === 'Passable') return 'text-orange-600';
                      return 'text-red-600';
                    };
                    return (
                      <tr key={g.id} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-sm">{g.teacher_subject_name || g.teacher_subject}</td>
                        <td className="px-4 py-2 text-sm text-center">{g.homework1 !== null ? g.homework1 : '\u2014'}</td>
                        <td className="px-4 py-2 text-sm text-center">{g.homework2 !== null ? g.homework2 : '\u2014'}</td>
                        <td className="px-4 py-2 text-sm text-center">{g.composition !== null ? g.composition : '\u2014'}</td>
                        <td className={`px-4 py-2 font-semibold text-center ${avgColor()}`}>{avg || '\u2014'}</td>
                        <td className={`px-4 py-2 text-sm text-center ${apprColor(getAppr(avg))}`}>{getAppr(avg)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {grades.length > 0 && (() => {
                  const sum1 = grades.reduce((s, g) => s + (parseFloat(g.homework1) || 0), 0);
                  const sum2 = grades.reduce((s, g) => s + (parseFloat(g.homework2) || 0), 0);
                  const sumComp = grades.reduce((s, g) => s + (parseFloat(g.composition) || 0), 0);
                  const totalAvg = grades.reduce((acc, g) => {
                    const scores = [];
                    const coeffs = [];
                    if (g.homework1 != null) { scores.push(parseFloat(g.homework1)); coeffs.push(1); }
                    if (g.homework2 != null) { scores.push(parseFloat(g.homework2)); coeffs.push(1); }
                    if (g.composition != null) { scores.push(parseFloat(g.composition)); coeffs.push(2); }
                    if (scores.length === 0) return acc;
                    const total = scores.reduce((s, v, i) => s + v * coeffs[i], 0);
                    const totalCoeff = coeffs.reduce((a, b) => a + b, 0);
                    const avg = (total / (20 * totalCoeff)) * 20;
                    return acc + avg;
                  }, 0) / grades.length;
                  const getAppr = (v) => {
                    if (v >= 16) return t('studentProfile.excellent');
                    if (v >= 14) return t('studentProfile.good');
                    if (v >= 12) return t('studentProfile.fair');
                    if (v >= 10) return t('studentProfile.passing');
                    return t('studentProfile.insufficient');
                  };
                  const totAvgColor = () => {
                    if (totalAvg >= 16) return 'text-green-600';
                    if (totalAvg >= 14) return 'text-blue-600';
                    if (totalAvg >= 12) return 'text-amber-600';
                    if (totalAvg >= 10) return 'text-orange-600';
                    return 'text-red-600';
                  };
                  const totAppr = getAppr(totalAvg);
                  const totApprColor = () => {
                    if (totAppr === 'Tres bien') return 'text-green-600';
                    if (totAppr === 'Bien') return 'text-blue-600';
                    if (totAppr === 'Assez bien') return 'text-amber-600';
                    if (totAppr === 'Passable') return 'text-orange-600';
                    return 'text-red-600';
                  };
                  return (
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                        <td className="px-4 py-3 text-sm text-gray-700">{t('studentProfile.total')}</td>
                        <td className="px-4 py-3 text-center">{sum1.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">{sum2.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">{sumComp.toFixed(2)}</td>
                        <td className={`px-4 py-3 text-center ${totAvgColor()}`}>{totalAvg.toFixed(2)}</td>
                        <td className={`px-4 py-3 text-center text-sm ${totApprColor()}`}>{totAppr}</td>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            )
          )}

          {activeTab === 'absences' && (
            tabLoading ? <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div> :
            absences.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{t('studentProfile.noAbsences')}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                    <th className="px-4 py-2 font-medium">{t('studentProfile.date')}</th>
                    <th className="px-4 py-2 font-medium">{t('studentProfile.status')}</th>
                    <th className="px-4 py-2 font-medium">{t('studentProfile.comment')}</th>
                  </tr>
                </thead>
                <tbody>
                  {absences.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100">
                      <td className="px-4 py-2 text-sm">{new Date(a.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(a.status)}`}>
                          {a.status === 'present' ? t('studentProfile.present') : a.status === 'absent' ? t('studentProfile.absent') : a.status === 'late' ? t('studentProfile.late') : t('studentProfile.excused')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{a.comment || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeTab === 'payments' && (
            tabLoading ? <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div> :
            payments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{t('studentProfile.noPayments')}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                    <th className="px-4 py-2 font-medium">{t('studentProfile.fee')}</th>
                    <th className="px-4 py-2 font-medium">{t('studentProfile.totalAmount')}</th>
                    <th className="px-4 py-2 font-medium">{t('studentProfile.paid')}</th>
                    <th className="px-4 py-2 font-medium">{t('studentProfile.remaining')}</th>
                    <th className="px-4 py-2 font-medium">{t('studentProfile.method')}</th>
                    <th className="px-4 py-2 font-medium">{t('studentProfile.status')}</th>
                    <th className="px-4 py-2 font-medium">{t('studentProfile.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const total = parseFloat(p.total_amount || 0);
                    const paid = parseFloat(p.amount_paid || 0);
                    const reste = total - paid;
                    return (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-sm">{p.fee_type?.name || t('studentProfile.monthlyFee')}</td>
                        <td className="px-4 py-2 text-sm">{total.toLocaleString()} GNF</td>
                        <td className="px-4 py-2 font-semibold text-green-600">{paid.toLocaleString()} GNF</td>
                        <td className="px-4 py-2 text-sm text-red-600">{reste > 0 ? `${reste.toLocaleString()} GNF` : '0 GNF'}</td>
                        <td className="px-4 py-2 text-sm">{p.payment_method === 'cash' ? t('studentProfile.cash') : p.payment_method === 'mobile_money' ? t('studentProfile.mobileMoney') : p.payment_method === 'bank_transfer' ? t('studentProfile.bankTransfer') : p.payment_method}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatus(p.status)}`}>
                            {p.status === 'completed' ? t('studentProfile.paid') : p.status === 'pending' ? t('studentProfile.pending') : p.status === 'partial' ? t('studentProfile.partial') : t('studentProfile.failed')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">{new Date(p.payment_date).toLocaleDateString('fr-FR')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('studentProfile.availableDocuments')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <CardIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{t('studentProfile.studentCardTitle')}</h4>
                      <p className="text-sm text-gray-500">{t('studentProfile.studentCardDesc')}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button onClick={() => handlePrintCard(false)} className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex-1 justify-center">
                      <Download className="w-4 h-4" />
                      <span>{t('studentProfile.download')}</span>
                    </button>

                  </div>
                </div>

                <div className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{t('studentProfile.reportCardTitle')}</h4>
                      <p className="text-sm text-gray-500">{t('studentProfile.reportCardDesc')}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <select
                      id="bulletin-term"
                      className="w-full border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">{t('studentProfile.selectTerm')}</option>
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const sel = document.getElementById('bulletin-term');
                        if (!sel.value) { showModal('warning', t('studentProfile.missingTerm'), t('studentProfile.selectTermPrompt')); return; }
                        handlePrintBulletin(sel.value);
                      }}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm w-full justify-center"
                    >
                      <Download className="w-4 h-4" />
                      <span>{t('studentProfile.downloadReportCard')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default StudentProfile;
