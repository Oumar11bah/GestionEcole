import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, CheckCircle, Clock, XCircle, Eye, Pencil, Trash2, X, Save, DollarSign, CreditCard, Users, Receipt, Printer, AlertCircle, RefreshCw } from 'lucide-react';
import { paymentService, studentService, classService } from '../services/api';
import MessageModal from '../components/MessageModal';
import Label from '../components/Label';
import { getPreferredAcademicYear, getDefaultAcademicYear } from '../utils/preferences';

const statusConfig = {
  completed: { icon: CheckCircle, label: 'payments.status.completed', bg: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  partial: { icon: Clock, label: 'payments.status.partial', bg: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  pending: { icon: Clock, label: 'payments.status.pending', bg: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  failed: { icon: XCircle, label: 'payments.status.failed', bg: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  cancelled: { icon: XCircle, label: 'payments.status.cancelled', bg: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-500' },
};

const methodLabels = {
  cash: 'payments.method.cash', orange_money: 'payments.method.orange_money', bank_transfer: 'payments.method.bank_transfer',
  mobile_money: 'payments.method.mobile_money', check: 'payments.method.check',
};

const monthOptions = [
  { key: 'january', value: 'Janvier' },
  { key: 'february', value: 'Février' },
  { key: 'march', value: 'Mars' },
  { key: 'april', value: 'Avril' },
  { key: 'may', value: 'Mai' },
  { key: 'june', value: 'Juin' },
  { key: 'july', value: 'Juillet' },
  { key: 'august', value: 'Août' },
  { key: 'september', value: 'Septembre' },
  { key: 'october', value: 'Octobre' },
  { key: 'november', value: 'Novembre' },
  { key: 'december', value: 'Décembre' },
];

const Payments = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterFeeType, setFilterFeeType] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [form, setForm] = useState({
    student_id: '', fee_type_id: '', total_amount: '', amount_paid: '',
    payment_method: 'cash', payment_date: new Date().toISOString().split('T')[0],
    month_concerned: '', academic_year: getDefaultAcademicYear() || '2024-2025', reference: '', notes: '', status: 'pending',
  });
  const [saving, setSaving] = useState(false);
  const [viewPayment, setViewPayment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  const [showFeeTypeModal, setShowFeeTypeModal] = useState(false);
  const [feeTypeForm, setFeeTypeForm] = useState({ name: '', description: '', amount: '', cycle: 'all', is_active: true });
  const [editingFeeType, setEditingFeeType] = useState(null);
  const [savingFeeType, setSavingFeeType] = useState(false);

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('payments.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  useEffect(() => {
    Promise.all([
      paymentService.getAll(),
      studentService.getAll(),
      paymentService.getAllFeeTypes(),
      classService.getAll(),
    ]).then(([p, s, f, c]) => {
      setPayments(p.data.results || p.data);
      setStudents(s.data.results || s.data);
      setFeeTypes(f.data.results || f.data);
      setClasses(c.data.results || c.data);
    }).catch(() => {}).finally(() => setLoading(false));
    if (searchParams.get('action') === 'new') setShowForm(true);
  }, []);

  const stats = useMemo(() => {
    const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
    const totalRemaining = payments.reduce((s, p) => {
      return s + (parseFloat(p.total_amount || p.amount_paid || 0) - parseFloat(p.amount_paid || 0));
    }, 0);
    const debtors = new Set();
    payments.forEach(p => {
      const total = parseFloat(p.total_amount || p.amount_paid || 0);
      const paid = parseFloat(p.amount_paid || 0);
      if (total - paid > 0 && p.student_matricule) debtors.add(p.student_matricule);
    });
    return { totalCollected, totalRemaining, debtorCount: debtors.size, paymentCount: payments.length };
  }, [payments]);

  const filteredStudents = studentSearch.length > 0
    ? students.filter((s) => `${s.first_name} ${s.last_name} ${s.matricule} ${s.class_assigned_name || ''}`.toLowerCase().includes(studentSearch.toLowerCase()))
    : [];

  const selectedStudent = students.find((s) => s.id === parseInt(form.student_id));

  const translateMonth = (month) => {
    const option = monthOptions.find((m) => m.value === month);
    return option ? t(`payments.month.${option.key}`) : month;
  };

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const term = search.toLowerCase();
      const matchSearch = search === '' || `${p.student}`.toLowerCase().includes(term) || (p.student_matricule || '').toLowerCase().includes(term);
      const matchStatus = filterStatus === '' || p.status === filterStatus;
      const matchPeriod = filterPeriod === '' || p.month_concerned === filterPeriod;
      const matchFeeType = filterFeeType === '' || p.fee_type === filterFeeType || parseInt(filterFeeType) === (() => { const ft = feeTypes.find(f => f.name === p.fee_type); return ft ? ft.id : -1; })();
      const studentMatch = students.find((s) => s.matricule === p.student_matricule);
      const matchClass = filterClass === '' || (studentMatch && (studentMatch.class_assigned === parseInt(filterClass) || studentMatch.class_assigned_id === parseInt(filterClass)));
      return matchSearch && matchStatus && matchPeriod && matchClass && matchFeeType;
    });
  }, [payments, search, filterStatus, filterClass, filterFeeType, filterPeriod, students, feeTypes]);

  const remainingAmount = parseFloat(form.total_amount || 0) - parseFloat(form.amount_paid || 0);

  const resetFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterClass('');
    setFilterFeeType(''); setFilterPeriod('');
  };

  const handleOpenForm = () => {
    setShowForm(true); setEditingPayment(null); setStudentSearch('');
    setForm({
      student_id: '', fee_type_id: '', total_amount: '', amount_paid: '',
      payment_method: 'cash', payment_date: new Date().toISOString().split('T')[0],
      month_concerned: '', academic_year: getDefaultAcademicYear() || '2024-2025', reference: '', notes: '', status: 'pending',
    });
  };

  const handleStudentSelect = (student) => {
    setForm({ ...form, student_id: student.id });
    setStudentSearch(`${student.first_name} ${student.last_name}`);
  };

  const handleFeeTypeSelect = (feeTypeId) => {
    const fee = feeTypes.find((f) => f.id === feeTypeId);
    setForm({ ...form, fee_type_id: feeTypeId, total_amount: fee?.amount || '', amount_paid: fee?.amount || '' });
  };

  const openFeeTypeModal = () => {
    setEditingFeeType(null);
    setFeeTypeForm({ name: '', description: '', amount: '', cycle: 'all', is_active: true });
    setShowFeeTypeModal(true);
  };

  const handleEditFeeType = (feeType) => {
    setEditingFeeType(feeType);
    setFeeTypeForm({
      name: feeType.name,
      description: feeType.description || '',
      amount: feeType.amount,
      cycle: feeType.cycle,
      is_active: feeType.is_active,
    });
    setShowFeeTypeModal(true);
  };

  const handleSaveFeeType = async (e) => {
    e.preventDefault();
    if (!feeTypeForm.name || !feeTypeForm.amount) return;
    setSavingFeeType(true);
    try {
      const payload = {
        name: feeTypeForm.name,
        description: feeTypeForm.description,
        amount: parseFloat(feeTypeForm.amount),
        cycle: feeTypeForm.cycle,
        is_active: feeTypeForm.is_active,
      };
      if (editingFeeType) {
        await paymentService.updateFeeType(editingFeeType.id, payload);
      } else {
        await paymentService.createFeeType(payload);
      }
      setShowFeeTypeModal(false);
      const res = await paymentService.getAllFeeTypes();
      setFeeTypes(res.data.results || res.data);
    } catch (error) {
      showModal('error', t('payments.error'), `${t('payments.error')}: ${JSON.stringify(error.response?.data)}`);
    } finally {
      setSavingFeeType(false);
    }
  };

  const handleDeleteFeeType = (feeType) => {
    showModal('warning', t('payments.confirmation'), `${t('payments.fee_type_delete_confirm')} "${feeType.name}" ?`, async () => {
      try {
        await paymentService.deleteFeeType(feeType.id);
        const res = await paymentService.getAllFeeTypes();
        setFeeTypes(res.data.results || res.data);
        closeModal();
      } catch (e) {
        showModal('error', t('payments.error'), `${t('payments.error')}: ${e.response?.data ? JSON.stringify(e.response.data) : e.message}`);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.fee_type_id || !form.amount_paid) {
      showModal('warning', t('payments.required_title'), t('payments.required_message'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        student_id: parseInt(form.student_id), fee_type_id: parseInt(form.fee_type_id),
        total_amount: parseFloat(form.total_amount), amount_paid: parseFloat(form.amount_paid),
        payment_method: form.payment_method, payment_date: form.payment_date,
        month_concerned: form.month_concerned, academic_year: form.academic_year,
        reference: form.reference, notes: form.notes, status: form.status,
      };
      if (editingPayment) {
        await paymentService.update(editingPayment.id, payload);
      } else {
        await paymentService.create(payload);
      }
      setShowForm(false); setEditingPayment(null);
      const updated = await paymentService.getAll();
      setPayments(updated.data.results || updated.data);
    } catch (error) {
      console.error('Failed to save payment:', error);
      showModal('error', t('payments.error'), `${t('payments.error')}: ${JSON.stringify(error.response?.data)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (payment) => {
    try {
      const res = await paymentService.getById(payment.id);
      const p = res.data;
      setEditingPayment(p);
      setForm({
        student_id: p.student_id || '', fee_type_id: p.fee_type_id || '',
        total_amount: p.total_amount || '', amount_paid: p.amount_paid || '',
        payment_method: p.payment_method || 'cash',
        payment_date: p.payment_date ? p.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
        month_concerned: p.month_concerned || '', academic_year: p.academic_year || '2024-2025',
        reference: p.reference || '', notes: p.notes || '', status: p.status || 'pending',
      });
      if (p.student_id) {
        const stu = students.find(s => s.id === p.student_id);
        if (stu) setStudentSearch(`${stu.first_name} ${stu.last_name}`);
      }
      setShowForm(true);
    } catch (e) {
      showModal('error', t('payments.error'), t('payments.load_error'));
    }
  };

  const handleDelete = async (id) => {
    showModal('warning', t('payments.confirmation'), t('payments.delete_confirm'), async () => {
      try {
        await paymentService.delete(id);
        const updated = await paymentService.getAll();
        setPayments(updated.data.results || updated.data);
        closeModal();
      } catch (e) { showModal('error', t('payments.error'), `${t('payments.error')}: ${e.response?.data ? JSON.stringify(e.response.data) : e.message}`); }
    });
  };

  const printReceipt = (payment) => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const cfg = statusConfig[payment.status] || statusConfig.pending;
    const _t = t;
    printWin.document.write(`
      <html><head><title>${_t('payments.receipt_title')} - ${payment.receipt_number || payment.id}</title>
      <style>
        @page { margin: 15mm; }
        body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; color: #1a1a1a; }
        .receipt { max-width: 400px; margin: 0 auto; border: 2px dashed #ccc; padding: 24px; }
        .header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 16px; }
        .header h1 { font-size: 20px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 2px; }
        .header p { margin: 2px 0; font-size: 12px; color: #666; }
        .receipt-no { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 16px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px dotted #ddd; }
        .row:last-child { border-bottom: none; }
        .label { color: #666; }
        .value { font-weight: bold; text-align: right; }
        .total-row { font-size: 15px; font-weight: bold; border-top: 2px solid #1a1a1a; padding-top: 8px; margin-top: 8px; }
        .amount-due { font-size: 24px; text-align: center; padding: 12px 0; margin: 12px 0; background: #f5f5f5; }
        .status { text-align: center; margin-top: 12px; }
        .status span { padding: 4px 16px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 12px; }
      </style></head><body>
      <div class="receipt">
        <div class="header">
          <h1>${_t('payments.receipt_heading')}</h1>
          <p>${payment.academic_year || ''}</p>
        </div>
        <div class="receipt-no">${_t('payments.receipt_no')} ${payment.receipt_number || 'N/A'}</div>
        <div class="row"><span class="label">${_t('payments.student')}</span><span class="value">${payment.student || ''}</span></div>
        <div class="row"><span class="label">${_t('payments.matricule')}</span><span class="value">${payment.student_matricule || ''}</span></div>
        <div class="row"><span class="label">${_t('payments.fee')}</span><span class="value">${payment.fee_type || ''}</span></div>
        <div class="row"><span class="label">${_t('payments.month')}</span><span class="value">${payment.month_concerned || '—'}</span></div>
        <div class="amount-due">${parseFloat(payment.amount_paid || 0).toLocaleString()} GNF</div>
        <div class="row"><span class="label">${_t('payments.total_amount')}</span><span class="value">${parseFloat(payment.total_amount || payment.amount_paid || 0).toLocaleString()} GNF</span></div>
        <div class="row"><span class="label">${_t('payments.paid_amount')}</span><span class="value">${parseFloat(payment.amount_paid || 0).toLocaleString()} GNF</span></div>
        <div class="row"><span class="label">${_t('payments.remaining')}</span><span class="value">${(parseFloat(payment.total_amount || payment.amount_paid || 0) - parseFloat(payment.amount_paid || 0)).toLocaleString()} GNF</span></div>
        <div class="row total-row"><span class="label">${_t('payments.method')}</span><span class="value">${_t(methodLabels[payment.payment_method] || payment.payment_method)}</span></div>
        <div class="row"><span class="label">${_t('payments.date')}</span><span class="value">${new Date(payment.payment_date).toLocaleDateString('fr-FR')}</span></div>
        <div class="row"><span class="label">${_t('payments.reference')}</span><span class="value">${payment.reference || '—'}</span></div>
        ${payment.notes ? `<div class="row"><span class="label">${_t('payments.notes')}</span><span class="value">${payment.notes}</span></div>` : ''}
        <div class="status"><span style="background:${cfg.bg};padding:4px 12px;border-radius:4px;font-size:12px;font-weight:bold">${_t(cfg.label)}</span></div>
        <div class="footer">${_t('payments.receipt_generated')} ${new Date().toLocaleDateString('fr-FR')} ${_t('payments.at')} ${new Date().toLocaleTimeString('fr-FR')}</div>
      </div>
      </body></html>
    `);
    printWin.document.close();
    printWin.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>{t('payments.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('payments.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('payments.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openFeeTypeModal}
              className="flex items-center space-x-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all shadow-sm hover:shadow-md active:scale-95">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">{t('payments.manage_fee_types')}</span>
            </button>
            <button onClick={handleOpenForm}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md active:scale-95">
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">{t('payments.add_payment')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('payments.total_collected')}</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.totalCollected.toLocaleString()} <span className="text-sm font-normal text-green-400">GNF</span></p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('payments.total_remaining')}</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.totalRemaining.toLocaleString()} <span className="text-sm font-normal text-red-400">GNF</span></p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('payments.debtors')}</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.debtorCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('payments.payments_count')}</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.paymentCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">{t('payments.search_student')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder={t('payments.search_student')} value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">{t('payments.class')}</Label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 hover:bg-white transition-all">
              <option value="">{t('payments.select')}</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">{t('payments.status_title')}</Label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 hover:bg-white transition-all">
              <option value="">{t('payments.select')}</option>
              <option value="completed">{t('payments.status.completed')}</option>
              <option value="partial">{t('payments.status.partial')}</option>
              <option value="pending">{t('payments.status.pending')}</option>
              <option value="failed">{t('payments.status.failed')}</option>
              <option value="cancelled">{t('payments.status.cancelled')}</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">{t('payments.fee_type')}</Label>
            <select value={filterFeeType} onChange={(e) => setFilterFeeType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 hover:bg-white transition-all">
              <option value="">{t('payments.select')}</option>
              {feeTypes.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">{t('payments.month')}</Label>
            <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 hover:bg-white transition-all">
              <option value="">{t('payments.select')}</option>
              {monthOptions.map((m) => <option key={m.key} value={m.value}>{t(`payments.month.${m.key}`)}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            {filtered.length} {filtered.length > 1 ? t('payments.payments_plural') : t('payments.payments_singular')}
            {(filterStatus !== '' || filterClass || filterFeeType || filterPeriod || search) && (
              <span className="ml-1 text-gray-300">({t('payments.filtered')})</span>
            )}
          </div>
          <button onClick={resetFilters}
            className="flex items-center space-x-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('payments.reset')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payments.student')}</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payments.fee')}</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payments.amount')}</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payments.method')}</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payments.status_title')}</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payments.date')}</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payments.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <Receipt className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-400">{t('payments.no_payments')}</p>
            {(filterStatus !== '' || filterClass || filterFeeType || filterPeriod || search) && (
                        <button onClick={resetFilters} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                          {t('payments.reset_filters')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((payment) => {
                  const total = parseFloat(payment.total_amount || payment.amount_paid || 0);
                  const paid = parseFloat(payment.amount_paid || 0);
                  const remaining = total - paid;
                  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                  const cfg = statusConfig[payment.status] || statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={payment.id} className="group hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          {payment.student_photo_url ? (
                            <img src={payment.student_photo_url} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs border-2 border-blue-100 shrink-0">
                              {(payment.student || '?').charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">{payment.student}</div>
                            <div className="text-xs text-gray-400 font-mono">{payment.student_matricule}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-800">{payment.fee_type || '—'}</div>
                        {payment.fee_type_amount != null && (
                          <div className="text-xs text-gray-400">{parseFloat(payment.fee_type_amount).toLocaleString()} GNF</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1.5 min-w-[130px]">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-green-600">{paid.toLocaleString()} GNF</span>
                            <span className="text-gray-400">{t('payments.of')} {total.toLocaleString()} GNF</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${remaining === 0 ? 'bg-green-500' : remaining < total ? 'bg-orange-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">{pct}%</span>
                            {remaining > 0 && <span className="font-medium text-red-500">{t('payments.remaining')}: {remaining.toLocaleString()} GNF</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{t(methodLabels[payment.payment_method] || payment.payment_method)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>{t(cfg.label)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(payment.payment_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setViewPayment(payment)}
                            className="w-8 h-8 flex items-center justify-center text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all"
                            title={t('payments.view_details')}>
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(payment)}
                            className="w-8 h-8 flex items-center justify-center text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 hover:border-amber-300 transition-all"
                            title={t('payments.edit')}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => printReceipt(payment)}
                            className="w-8 h-8 flex items-center justify-center text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-300 transition-all"
                            title={t('payments.print_receipt')}>
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(payment.id)}
                            className="w-8 h-8 flex items-center justify-center text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all"
                            title={t('payments.delete')}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingPayment ? t('payments.edit_payment') : t('payments.add_payment')}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingPayment(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 border border-blue-200/50">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>{t('payments.student')}</span>
                </h3>
                {form.student_id && selectedStudent ? (
                  <div className="bg-white rounded-lg p-3 flex items-center space-x-3 border border-blue-100">
                    {selectedStudent.photo_url || selectedStudent.photo ? (
                      <img src={selectedStudent.photo_url || selectedStudent.photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-blue-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm border-2 border-blue-200 shrink-0">
                        {(selectedStudent.first_name || '?').charAt(0)}{(selectedStudent.last_name || '').charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900 truncate">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                        <button type="button" onClick={() => { setForm({ ...form, student_id: '' }); setStudentSearch(''); }}
                          className="text-gray-400 hover:text-gray-600 ml-2 shrink-0 p-1 hover:bg-gray-100 rounded">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{selectedStudent.matricule}</div>
                      <div className="text-xs text-gray-400">{t('payments.class')}: {selectedStudent.class_assigned_name || t('payments.unassigned')}</div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder={t('payments.search_by_name')}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white" />
                    </div>
                    {studentSearch && (
                      <div className="mt-1.5 border border-gray-200 rounded-lg max-h-56 overflow-y-auto bg-white shadow-lg">
                        {filteredStudents.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-400 text-center">{t('payments.no_students')}</div>
                        ) : (
                          filteredStudents.map((s) => (
                            <button key={s.id} type="button" onClick={() => handleStudentSelect(s)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b last:border-b-0 flex items-center space-x-3 transition-colors">
                              {s.photo_url || s.photo ? (
                                <img src={s.photo_url || s.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-gray-200 shrink-0">
                                  {(s.first_name || '?').charAt(0)}{(s.last_name || '').charAt(0)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{s.first_name} {s.last_name}</div>
                                <div className="text-xs text-gray-400 font-mono">{s.matricule}</div>
                              </div>
                              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded shrink-0">{s.class_assigned_name || '—'}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-5 border border-green-200/50">
                <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center space-x-2">
                  <DollarSign className="w-4 h-4" />
                  <span>{t('payments.payment_details')}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                  <div>
                    <Label required>{t('payments.fee_type')}</Label>
                    <select value={form.fee_type_id} onChange={(e) => handleFeeTypeSelect(parseInt(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white" required>
                      <option value="">{t('payments.select')}</option>
                      {feeTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>{t('payments.month_concerned')}</Label>
                    <select value={form.month_concerned} onChange={(e) => setForm({ ...form, month_concerned: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white">
                      <option value="">{t('payments.select')}</option>
                      {monthOptions.map((m) => <option key={m.key} value={m.value}>{t(`payments.month.${m.key}`)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label required>{t('payments.total_amount')}</Label>
                    <input type="number" step="0.01" min="0" value={form.total_amount}
                      onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white" required />
                  </div>
                  <div>
                    <Label required>{t('payments.paid_amount')}</Label>
                    <input type="number" step="0.01" min="0" max={form.total_amount} value={form.amount_paid}
                      onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white" required />
                  </div>
                  <div>
                    <Label>{t('payments.remaining')}</Label>
                    <div className={`w-full border rounded-lg px-4 py-2.5 text-sm font-bold ${remainingAmount > 0 ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200'}`}>
                      {remainingAmount.toLocaleString()} GNF
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{t('payments.payment_method')}</Label>
                  <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                    <option value="cash">{t('payments.method.cash')}</option>
                    <option value="orange_money">{t('payments.method.orange_money')}</option>
                    <option value="bank_transfer">{t('payments.method.bank_transfer')}</option>
                    <option value="mobile_money">{t('payments.method.mobile_money')}</option>
                    <option value="check">{t('payments.method.check')}</option>
                  </select>
                </div>
                <div>
                  <Label required>{t('payments.payment_date')}</Label>
                  <input type="date" value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white" required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>{t('payments.academic_year')}</Label>
                  <input type="text" value={form.academic_year}
                    onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white" />
                </div>
                <div>
                  <Label>{t('payments.reference')}</Label>
                  <input type="text" value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    placeholder={t('payments.transaction_no')} />
                </div>
                <div>
                  <Label>{t('payments.status_title')}</Label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                    <option value="pending">{t('payments.status.pending')}</option>
                    <option value="partial">{t('payments.status.partial')}</option>
                    <option value="completed">{t('payments.status.completed')}</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>{t('payments.notes')}</Label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  rows={2} placeholder={t('payments.notes_placeholder')} />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setShowForm(false); setEditingPayment(null); }}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  {t('payments.cancel')}
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md active:scale-95">
                  <Save className="w-4 h-4" />
                  <span>{saving ? t('payments.saving') : (editingPayment ? t('payments.edit') : t('payments.save'))}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFeeTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                <span>{editingFeeType ? t('payments.fee_type_edit') : t('payments.fee_type_add')}</span>
              </h2>
              <button onClick={() => setShowFeeTypeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSaveFeeType} className="p-6 space-y-4">
              <div>
                <Label required>{t('payments.fee_type_name')}</Label>
                <input type="text" value={feeTypeForm.name}
                  onChange={(e) => setFeeTypeForm({ ...feeTypeForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>{t('payments.fee_type_amount')}</Label>
                  <input type="number" step="0.01" min="0" value={feeTypeForm.amount}
                    onChange={(e) => setFeeTypeForm({ ...feeTypeForm, amount: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white" required />
                </div>
                <div>
                  <Label>{t('payments.fee_type_cycle')}</Label>
                  <select value={feeTypeForm.cycle} onChange={(e) => setFeeTypeForm({ ...feeTypeForm, cycle: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white">
                    <option value="all">{t('payments.fee_type_cycle_all')}</option>
                    <option value="primaire">{t('payments.fee_type_cycle_primaire')}</option>
                    <option value="college">{t('payments.fee_type_cycle_college')}</option>
                    <option value="lycee">{t('payments.fee_type_cycle_lycee')}</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>{t('payments.fee_type_description')}</Label>
                <textarea value={feeTypeForm.description}
                  onChange={(e) => setFeeTypeForm({ ...feeTypeForm, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white"
                  rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="feeTypeActive" checked={feeTypeForm.is_active}
                  onChange={(e) => setFeeTypeForm({ ...feeTypeForm, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                <label htmlFor="feeTypeActive" className="text-sm text-gray-700">{t('payments.fee_type_active')}</label>
              </div>
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowFeeTypeModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  {t('payments.cancel')}
                </button>
                <button type="submit" disabled={savingFeeType}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md active:scale-95">
                  <Save className="w-4 h-4" />
                  <span>{savingFeeType ? t('payments.saving') : (editingFeeType ? t('payments.edit') : t('payments.save'))}</span>
                </button>
              </div>
            </form>

            <div className="px-6 pb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gray-400" />
                <span>{t('payments.fee_type_list')}</span>
              </h3>
              <div className="space-y-2">
                {feeTypes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">{t('payments.fee_type_no_data')}</p>
                ) : (
                  feeTypes.map((ft) => (
                    <div key={ft.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${ft.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{ft.name}</span>
                          {!ft.is_active && (
                            <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">{t('payments.fee_type_inactive')}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{parseFloat(ft.amount).toLocaleString()} GNF</div>
                        {ft.description && <div className="text-xs text-gray-400 truncate">{ft.description}</div>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button type="button" onClick={() => handleEditFeeType(ft)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={t('payments.edit')}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDeleteFeeType(ft)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('payments.delete')}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setViewPayment(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-blue-500" />
                <span>{t('payments.payment_details')}</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => printReceipt(viewPayment)}
                  className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 transition-colors" title={t('payments.print_receipt')}>
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setViewPayment(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center space-x-4 pb-4 border-b border-gray-100">
                {viewPayment.student_photo_url ? (
                  <img src={viewPayment.student_photo_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-blue-200" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-bold text-lg border-2 border-blue-200">
                    {(viewPayment.student || '?').charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-lg font-bold text-gray-900">{viewPayment.student}</div>
                  <div className="text-sm text-gray-500 font-mono">{viewPayment.student_matricule}</div>
                  {viewPayment.receipt_number && (
                    <div className="text-xs text-purple-600 font-semibold mt-0.5">{t('payments.receipt_no')} {viewPayment.receipt_number}</div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100/30 rounded-xl p-4 border border-green-200/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">{t('payments.paid_amount')}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">{t('payments.total_amount')}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-bold text-green-600">{parseFloat(viewPayment.amount_paid || 0).toLocaleString()} GNF</span>
                  <span className="text-lg font-semibold text-gray-700">{parseFloat(viewPayment.total_amount || viewPayment.amount_paid || 0).toLocaleString()} GNF</span>
                </div>
                <div className="mt-2 w-full h-2 bg-white rounded-full overflow-hidden border border-green-100">
                  <div className="h-full bg-green-500 rounded-full"
                    style={{ width: `${Math.min((parseFloat(viewPayment.amount_paid || 0) / parseFloat(viewPayment.total_amount || viewPayment.amount_paid || 1)) * 100, 100)}%` }} />
                </div>
                {(parseFloat(viewPayment.total_amount || 0) - parseFloat(viewPayment.amount_paid || 0)) > 0 && (
                  <div className="mt-2 text-right text-xs font-medium text-red-500">
                    {t('payments.remaining')}: {(parseFloat(viewPayment.total_amount || 0) - parseFloat(viewPayment.amount_paid || 0)).toLocaleString()} GNF
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('payments.fee')}</div>
                  <div className="text-sm font-semibold text-gray-900">{viewPayment.fee_type || '—'}</div>
                  {viewPayment.fee_type_amount != null && (
                    <div className="text-xs text-gray-500">{parseFloat(viewPayment.fee_type_amount).toLocaleString()} GNF</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('payments.method')}</div>
                  <div className="text-sm font-semibold text-gray-900">{t(methodLabels[viewPayment.payment_method] || viewPayment.payment_method)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('payments.date')}</div>
                  <div className="text-sm font-semibold text-gray-900">{new Date(viewPayment.payment_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('payments.status_title')}</div>
                  {(() => { const c = statusConfig[viewPayment.status] || statusConfig.pending; const Si = c.icon; return (
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg}`}>
                      <Si className="w-3.5 h-3.5" />
                      <span>{t(c.label)}</span>
                    </span>
                  ); })()}
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('payments.month')}</div>
                  <div className="text-sm font-semibold text-gray-900">{viewPayment.month_concerned ? translateMonth(viewPayment.month_concerned) : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('payments.reference')}</div>
                  <div className="text-sm font-semibold text-gray-900">{viewPayment.reference || '—'}</div>
                </div>
              </div>
              {viewPayment.notes && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('payments.notes')}</div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{viewPayment.notes}</div>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50/50">
              <span className="text-xs text-gray-400">{t('payments.receipt_no')} {viewPayment.receipt_number || 'N/A'}</span>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => printReceipt(viewPayment)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-all">
                  <Printer className="w-4 h-4" />
                  <span>{t('payments.print')}</span>
                </button>
                <button onClick={() => setViewPayment(null)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-all">
                  {t('payments.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default Payments;
