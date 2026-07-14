import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, CheckCircle, Clock, XCircle, Eye, Pencil, Trash2, X, Save, DollarSign, CreditCard, Users, Receipt, Printer, AlertCircle, RefreshCw, ChevronDown, ChevronLeft, ChevronRight, Wallet, TrendingDown, FileDown } from 'lucide-react';
import { paymentService, expenseService, studentService, classService, schoolService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MessageModal from '../components/MessageModal';
import Label from '../components/Label';
import { getPreferredAcademicYear, getDefaultAcademicYear } from '../utils/preferences';
import { buildSchoolHeaderHTML } from '../utils/printHelpers';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

const statusConfig = {
  completed: { icon: CheckCircle, label: 'payments.status.completed', bg: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  partial: { icon: Clock, label: 'payments.status.partial', bg: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
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

const PaymentHistoryList = ({ onViewPayment, onPrintReceipt }) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;

  useEffect(() => {
    setLoading(true);
    paymentService.getPaymentHistory({ page, page_size: pageSize })
      .then(res => {
        const data = res.data;
        setHistory(data.results || data);
        setTotal(data.count || (data.results ? data.results.length : data.length));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = history.filter(h =>
    !search || (h.student || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.receipt_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.fee_type || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <div className="p-4 border-b flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50">
              <th className="px-4 py-3 text-left w-10">#</th>
              <th className="px-4 py-3 text-left">{t('payments.date')}</th>
              <th className="px-4 py-3 text-left">{t('payments.student')}</th>
              <th className="px-4 py-3 text-left">{t('payments.matricule')}</th>
              <th className="px-4 py-3 text-left">{t('payments.fee')}</th>
              <th className="px-4 py-3 text-right">{t('payments.amount')}</th>
              <th className="px-4 py-3 text-left">{t('payments.receipt_no')}</th>
              <th className="px-4 py-3 text-left">{t('payments.received_by')}</th>
              <th className="px-4 py-3 text-center">{t('payments.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center text-sm text-gray-400">{t('payments.loading')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center text-sm text-gray-400">{t('payments.no_payments')}</td></tr>
            ) : filtered.map((h, i) => (
              <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-400">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {new Date(h.payment_date || h.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{h.student}</td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{h.student_matricule}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{h.fee_type}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">+{Number(h.amount).toLocaleString()} GNF</td>
                <td className="px-4 py-3 text-sm text-purple-600 font-mono">{h.receipt_number || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{h.received_by || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => onViewPayment && onViewPayment(h.payment_id)}
                      className="w-7 h-7 flex items-center justify-center text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                      title={t('payments.view_details')}>
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onPrintReceipt && onPrintReceipt(h.payment_id, h.amount)}
                      className="w-7 h-7 flex items-center justify-center text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
                      title={t('payments.print_receipt')}>
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-sm text-gray-500">{t('payments.total')}: {total}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-gray-700">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const Payments = () => {
  const { t } = useTranslation();
  const { canAccess } = useAuth();
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
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [form, setForm] = useState({
    student_id: '', fee_type_id: '', total_amount: '', amount_paid: '',
    payment_method: 'cash', payment_date: new Date().toISOString().split('T')[0],
    month_concerned: '', academic_year: getDefaultAcademicYear() || '2024-2025', reference: '', notes: '', status: 'partial',
  });
  const [saving, setSaving] = useState(false);
  const [viewPayment, setViewPayment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  const [showFeeTypeModal, setShowFeeTypeModal] = useState(false);
  const [feeTypeForm, setFeeTypeForm] = useState({ name: '', description: '', amount: '', cycle: 'all', class_assigned: [], is_active: true });
  const [editingFeeType, setEditingFeeType] = useState(null);
  const [savingFeeType, setSavingFeeType] = useState(false);
  const [partialPayment, setPartialPayment] = useState(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [savingPartial, setSavingPartial] = useState(false);
  const [activeTab, setActiveTab] = useState('payments');
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [filterExpenseCategory, setFilterExpenseCategory] = useState('');
  const [filterExpenseMonth, setFilterExpenseMonth] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash', reference: '', notes: '',
  });
  const [savingExpense, setSavingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null);

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('payments.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  useEffect(() => {
    Promise.allSettled([
      paymentService.getAll(),
      studentService.getAll(),
      paymentService.getAllFeeTypes(),
      classService.getAll(),
      schoolService.get(),
    ]).then(([p, s, f, c, sc]) => {
      if (p.status === 'fulfilled') setPayments(p.value.data.results || p.value.data);
      if (s.status === 'fulfilled') setStudents(s.value.data.results || s.value.data);
      if (f.status === 'fulfilled') setFeeTypes(f.value.data.results || f.value.data);
      if (c.status === 'fulfilled') setClasses(c.value.data.results || c.value.data);
      if (sc.status === 'fulfilled') setSchoolInfo(sc.value.data);
    }).finally(() => setLoading(false));
    if (searchParams.get('action') === 'new') setShowForm(true);
  }, []);

  const fetchExpenses = () => {
    setExpenseLoading(true);
    Promise.all([
      expenseService.getAll(),
      expenseService.getAllCategories(),
    ]).then(([e, c]) => {
      setExpenses(e.data.results || e.data);
      setExpenseCategories(c.data.results || c.data);
    }).catch(() => {}).finally(() => setExpenseLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'expenses') fetchExpenses();
  }, [activeTab]);

  const expenseStats = useMemo(() => {
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const now = new Date();
    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.expense_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthTotal = monthExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    return { total, monthTotal, count: expenses.length };
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const searchMatch = !expenseSearch || `${e.description} ${e.category_name} ${e.reference}`.toLowerCase().includes(expenseSearch.toLowerCase());
      const catMatch = !filterExpenseCategory || String(e.category) === filterExpenseCategory;
      const monthMatch = !filterExpenseMonth || e.expense_date?.startsWith(filterExpenseMonth);
      return searchMatch && catMatch && monthMatch;
    });
  }, [expenses, expenseSearch, filterExpenseCategory, filterExpenseMonth]);

  const handleSaveExpense = async () => {
    if (!expenseForm.category || !expenseForm.description || !expenseForm.amount || !expenseForm.expense_date) {
      showModal('warning', t('payments.warning'), t('expenses.fill_required'));
      return;
    }
    setSavingExpense(true);
    try {
      const payload = { ...expenseForm, category: parseInt(expenseForm.category, 10), amount: parseFloat(expenseForm.amount) };
      if (editingExpense) {
        await expenseService.update(editingExpense.id, payload);
      } else {
        await expenseService.create(payload);
      }
      const wasEditing = !!editingExpense;
      setShowExpenseForm(false);
      setEditingExpense(null);
      setExpenseForm({ category: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference: '', notes: '' });
      fetchExpenses();
      showModal('success', t('payments.success'), wasEditing ? t('expenses.updated') : t('expenses.created'));
    } catch (err) {
      const data = err.response?.data;
      let msg = t('payments.errorSaving');
      if (data) {
        if (data.detail) msg = data.detail;
        else {
          const fieldErrors = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
          if (fieldErrors) msg = fieldErrors;
        }
      }
      showModal('error', t('payments.error'), msg);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = (expense) => {
    showModal('warning', t('payments.confirmDelete'), t('payments.confirmDeleteMsg'), async () => {
      try {
        await expenseService.delete(expense.id);
        fetchExpenses();
      } catch (err) {
        showModal('error', t('payments.error'), t('payments.errorDeleting'));
      }
    });
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name) return;
    setSavingCategory(true);
    try {
      if (editingCategory) {
        await expenseService.updateCategory(editingCategory.id, categoryForm);
      } else {
        await expenseService.createCategory(categoryForm);
      }
      const wasEditingCat = !!editingCategory;
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
      const c = await expenseService.getAllCategories();
      setExpenseCategories(c.data.results || c.data);
      showModal('success', t('payments.success'), wasEditingCat ? t('expenses.category_updated') : t('expenses.category_created'));
    } catch (err) {
      const data = err.response?.data;
      let msg = t('payments.errorSaving');
      if (data) {
        if (data.detail) msg = data.detail;
        else {
          const fieldErrors = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
          if (fieldErrors) msg = fieldErrors;
        }
      }
      showModal('error', t('payments.error'), msg);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleExportExpensesPDF = () => {
    if (filteredExpenses.length === 0) {
      showModal('warning', t('payments.warning'), t('expenses.no_expenses'));
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryRGB = schoolInfo?.primary_color ? hexToRgb(schoolInfo.primary_color) : { r: 30, g: 60, b: 159 };

    doc.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolInfo?.name || '', 14, 12);
    doc.setFontSize(13);
    doc.text(t('expenses.title'), 14, 21);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${t('reports.generatedOn')} ${new Date().toLocaleDateString('fr-FR')} ${t('reports.at')} ${new Date().toLocaleTimeString('fr-FR')}`, 14, 25);

    doc.setTextColor(0, 0, 0);
    let startY = 35;

    const fmt = (n) => Number(n).toLocaleString('fr-FR').replace(/\u00a0/g, ' ').replace(/\u202f/g, ' ');

    const summaryData = [
      [t('expenses.total_expenses'), `${fmt(expenseStats.total)} GNF`],
      [t('expenses.this_month'), `${fmt(expenseStats.monthTotal)} GNF`],
      [t('expenses.total_count'), String(expenseStats.count)],
    ];
    autoTable(doc, {
      startY,
      head: [[t('reports.indicator'), t('reports.value')]],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [primaryRGB.r, primaryRGB.g, primaryRGB.b], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
      margin: { left: 14, right: 14 },
    });
    startY = doc.lastAutoTable.finalY + 10;

    const methodLabels = { cash: t('payments.method.cash'), bank_transfer: t('payments.method.bank_transfer'), mobile_money: t('payments.method.mobile_money'), check: t('payments.method.check') };
    const rows = filteredExpenses.map(e => [
      new Date(e.expense_date).toLocaleDateString('fr-FR'),
      e.category_name || '',
      e.description,
      t(methodLabels[e.payment_method] || e.payment_method),
      e.reference || '—',
      `${fmt(e.amount)} GNF`,
    ]);
    const totalAmount = filteredExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    rows.push([ '', '', '', '', t('expenses.total_expenses'), `${fmt(totalAmount)} GNF` ]);

    autoTable(doc, {
      startY,
      head: [[t('expenses.date'), t('expenses.category'), t('expenses.description'), t('expenses.payment_method'), t('expenses.reference'), t('expenses.amount')]],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [primaryRGB.r, primaryRGB.g, primaryRGB.b], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${t('reports.generatedOn')} ${new Date().toLocaleDateString('fr-FR')}`, 14, doc.internal.pageSize.getHeight() - 10);

    doc.save(`rapport_depenses_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

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
    ? students.filter((s) => {
        const searchMatch = `${s.first_name} ${s.last_name} ${s.matricule} ${s.class_assigned_name || ''}`.toLowerCase().includes(studentSearch.toLowerCase());
        if (!searchMatch) return false;
        if (form.fee_type_id && form.academic_year && form.month_concerned) {
          const alreadyPaid = payments.some(p =>
            p.student_matricule === s.matricule &&
            p.academic_year === form.academic_year &&
            p.month_concerned === form.month_concerned &&
            (p.status === 'completed' || p.status === 'partial')
          );
          if (alreadyPaid) return false;
        }
        return true;
      })
    : [];

  const selectedStudent = students.find((s) => s.id === parseInt(form.student_id));

  const filteredFeeTypes = useMemo(() => {
    if (!selectedStudent) return feeTypes;
    const studentClassId = selectedStudent.class_assigned || selectedStudent.class_assigned_id;
    if (!studentClassId) return feeTypes;
    return feeTypes.filter(f => {
      if (!f.class_assigned || f.class_assigned.length === 0) return true;
      return f.class_assigned.includes(studentClassId);
    });
  }, [feeTypes, selectedStudent]);

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

  const groupedPayments = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const key = p.student_matricule || p.student;
      if (!map[key]) {
        map[key] = { student: p.student, student_matricule: p.student_matricule, student_photo_url: p.student_photo_url, payments: [], totalPaid: 0, totalDue: 0, months: [] };
      }
      map[key].payments.push(p);
      map[key].totalPaid += parseFloat(p.amount_paid || 0);
      map[key].totalDue += parseFloat(p.total_amount || 0);
      if (p.month_concerned && !map[key].months.includes(p.month_concerned)) {
        map[key].months.push(p.month_concerned);
      }
    });
    return Object.values(map);
  }, [filtered]);

  const remainingAmount = parseFloat(form.total_amount || 0) - parseFloat(form.amount_paid || 0);
  const computedStatus = !form.amount_paid || !form.total_amount ? 'partial' : parseFloat(form.amount_paid) >= parseFloat(form.total_amount) ? 'completed' : 'partial';

  const resetFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterClass('');
    setFilterFeeType(''); setFilterPeriod('');
  };

  const handleOpenForm = () => {
    setShowForm(true); setEditingPayment(null); setStudentSearch('');
    setForm({
      student_id: '', fee_type_id: '', total_amount: '', amount_paid: '',
      payment_method: 'cash', payment_date: new Date().toISOString().split('T')[0],
      month_concerned: '', academic_year: getDefaultAcademicYear() || '2024-2025', reference: '', notes: '', status: 'partial',
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
    setFeeTypeForm({ name: '', description: '', amount: '', cycle: 'all', class_assigned: [], is_active: true });
    setShowFeeTypeModal(true);
  };

  const handleEditFeeType = (feeType) => {
    setEditingFeeType(feeType);
    setFeeTypeForm({
      name: feeType.name,
      description: feeType.description || '',
      amount: feeType.amount,
      cycle: feeType.cycle,
      class_assigned: feeType.class_assigned || [],
      is_active: feeType.is_active,
    });
    setShowFeeTypeModal(true);
  };

  const handleSaveFeeType = async (e) => {
    e.preventDefault();
    if (!feeTypeForm.name || !feeTypeForm.amount) return;
    const wasEditing = !!editingFeeType;
    setSavingFeeType(true);
    try {
      const payload = {
        name: feeTypeForm.name,
        description: feeTypeForm.description,
        amount: parseFloat(feeTypeForm.amount),
        cycle: feeTypeForm.cycle,
        class_assigned: feeTypeForm.class_assigned,
        is_active: feeTypeForm.is_active,
      };
      if (editingFeeType) {
        await paymentService.updateFeeType(editingFeeType.id, payload);
      } else {
        await paymentService.createFeeType(payload);
      }
      setShowFeeTypeModal(false);
      setEditingFeeType(null);
      setFeeTypeForm({ name: '', description: '', amount: '', cycle: 'all', class_assigned: [], is_active: true });
      const res = await paymentService.getAllFeeTypes();
      setFeeTypes(res.data.results || res.data);
      showModal('success', t('payments.success'), wasEditing ? t('payments.fee_type_updated') : t('payments.fee_type_created'));
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
        reference: form.reference, notes: form.notes, status: computedStatus,
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
        reference: p.reference || '', notes: p.notes || '', status: p.status || 'partial',
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

  const printReceipt = (payment, additionalAmount) => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const cfg = statusConfig[payment.status] || statusConfig.partial;
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
        ${buildSchoolHeaderHTML(schoolInfo).replace('border-bottom:3px solid', 'border-bottom:2px solid').replace('font-family: ', 'font-family: ')}
        <div class="header">
          <h1>${_t('payments.receipt_heading')}</h1>
          <p>${payment.academic_year || ''}</p>
        </div>
        <div class="receipt-no">${_t('payments.receipt_no')} ${payment.receipt_number || 'N/A'}</div>
        <div class="row"><span class="label">${_t('payments.student')}</span><span class="value">${payment.student || ''}</span></div>
        <div class="row"><span class="label">${_t('payments.matricule')}</span><span class="value">${payment.student_matricule || ''}</span></div>
        <div class="row"><span class="label">${_t('payments.fee')}</span><span class="value">${payment.fee_type || ''}</span></div>
        <div class="row"><span class="label">${_t('payments.month')}</span><span class="value">${payment.month_concerned || '—'}</span></div>
        ${additionalAmount ? `
        <div class="amount-due">${Number(additionalAmount).toLocaleString()} GNF</div>
        <div style="text-align:center;font-size:11px;color:#888;margin-bottom:8px">${_t('payments.additional_payment')}</div>
        ` : `
        <div class="amount-due">${parseFloat(payment.amount_paid || 0).toLocaleString()} GNF</div>
        `}
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

      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'payments' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
          <Receipt className="w-4 h-4 inline mr-1.5" />
          {t('payments.title')}
        </button>
        <button onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'expenses' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
          <TrendingDown className="w-4 h-4 inline mr-1.5" />
          {t('expenses.title')}
        </button>
        <button onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
          <Clock className="w-4 h-4 inline mr-1.5" />
          {t('payments.payment_history')}
        </button>
      </div>

      {activeTab === 'payments' ? (<>
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
            {groupedPayments.length} {groupedPayments.length > 1 ? t('payments.payments_plural') : t('payments.payments_singular')}
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
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payments.month')}</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payments.amount')}</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payments.status_title')}</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payments.payments_count')}</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payments.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
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
                groupedPayments.map((group) => {
                  const isExpanded = expandedStudent === group.student_matricule;
                  const total = group.totalDue;
                  const paid = group.totalPaid;
                  const remaining = total - paid;
                  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                  const allCompleted = group.payments.every(p => p.status === 'completed');
                  const anyPartial = group.payments.some(p => p.status === 'partial');
                  const aggStatus = allCompleted ? 'completed' : anyPartial ? 'partial' : group.payments[0]?.status || 'partial';
                  const aggCfg = statusConfig[aggStatus] || statusConfig.partial;
                  const AggStatusIcon = aggCfg.icon;
                  return (
                    <React.Fragment key={group.student_matricule}>
                      <tr className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedStudent(isExpanded ? null : group.student_matricule)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            {group.student_photo_url ? (
                              <img src={group.student_photo_url} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs border-2 border-blue-100 shrink-0">
                                {(group.student || '?').charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">{group.student}</div>
                              <div className="text-xs text-gray-400 font-mono">{group.student_matricule}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {group.months.map(m => (
                              <span key={m} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">{m}</span>
                            ))}
                          </div>
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
                          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${aggCfg.bg}`}>
                            <AggStatusIcon className="w-3.5 h-3.5" />
                            <span>{t(aggCfg.label)}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {group.payments.length} {group.payments.length > 1 ? t('payments.payments_plural') : t('payments.payments_singular')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            {anyPartial && (
                              <button onClick={(e) => { e.stopPropagation(); const pp = group.payments.find(p => p.status === 'partial' || p.status === 'pending'); if (pp) setPartialPayment(pp); }}
                                className="w-8 h-8 flex items-center justify-center text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 transition-all"
                                title={t('payments.add_payment')}>
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setViewPayment(group.payments[0]); }}
                              className="w-8 h-8 flex items-center justify-center text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all"
                              title={t('payments.view_details')}>
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); printReceipt(group.payments[0]); }}
                              className="w-8 h-8 flex items-center justify-center text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-300 transition-all"
                              title={t('payments.print_receipt')}>
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setExpandedStudent(isExpanded ? null : group.student_matricule); }}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${isExpanded ? 'text-gray-600 bg-gray-100 border-gray-300' : 'text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                              title={isExpanded ? t('payments.collapse') : t('payments.expand')}>
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && group.payments.map((payment) => {
                        const pTotal = parseFloat(payment.total_amount || payment.amount_paid || 0);
                        const pPaid = parseFloat(payment.amount_paid || 0);
                        const pRemaining = pTotal - pPaid;
                        const pPct = pTotal > 0 ? Math.round((pPaid / pTotal) * 100) : 0;
                        const cfg = statusConfig[payment.status] || statusConfig.partial;
                        const StatusIcon = cfg.icon;
                        return (
                          <tr key={payment.id} className="bg-blue-50/30 hover:bg-blue-50/60 transition-colors">
                            <td className="px-4 py-2.5 pl-10">
                              <div className="text-sm text-gray-700">{payment.fee_type || '—'}</div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-xs bg-white text-gray-700 px-2 py-0.5 rounded-full border border-gray-200">{payment.month_concerned || '—'}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="space-y-0.5 min-w-[110px]">
                                <div className="flex justify-between text-xs">
                                  <span className="font-semibold text-green-600">{pPaid.toLocaleString()} GNF</span>
                                  <span className="text-gray-400">{t('payments.of')} {pTotal.toLocaleString()} GNF</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${pRemaining === 0 ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${Math.min(pPct, 100)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs border ${cfg.bg}`}>
                                <StatusIcon className="w-3 h-3" />
                                <span>{t(cfg.label)}</span>
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">
                              {new Date(payment.payment_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {(payment.status === 'partial' || payment.status === 'pending') && (
                                  <button onClick={(e) => { e.stopPropagation(); setPartialPayment(payment); }}
                                    className="w-7 h-7 flex items-center justify-center text-green-600 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-all"
                                    title={t('payments.add_payment')}>
                                    <DollarSign className="w-3 h-3" />
                                  </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); setViewPayment(payment); }}
                                  className="w-7 h-7 flex items-center justify-center text-blue-500 bg-white border border-blue-200 rounded hover:bg-blue-50 transition-all"
                                  title={t('payments.view_details')}>
                                  <Eye className="w-3 h-3" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); printReceipt(payment); }}
                                  className="w-7 h-7 flex items-center justify-center text-purple-500 bg-white border border-purple-200 rounded hover:bg-purple-50 transition-all"
                                  title={t('payments.print_receipt')}>
                                  <Printer className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
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
                      {filteredFeeTypes.map((f) => <option key={f.id} value={f.id}>{f.name}{f.class_names?.length ? ` (${f.class_names.join(', ')})` : ''}</option>)}
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
                  <div className={`w-full border rounded-lg px-4 py-2.5 text-sm font-semibold ${computedStatus === 'completed' ? 'text-green-700 bg-green-50 border-green-200' : 'text-orange-700 bg-orange-50 border-orange-200'}`}>
                    {computedStatus === 'completed' ? t('payments.status.completed') : t('payments.status.partial')}
                  </div>
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
                  <select value={feeTypeForm.cycle} onChange={(e) => setFeeTypeForm({ ...feeTypeForm, cycle: e.target.value, class_assigned: [] })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white">
                    <option value="all">{t('payments.fee_type_cycle_all')}</option>
                    <option value="prescolaire">{t('payments.fee_type_cycle_prescolaire')}</option>
                    <option value="primaire">{t('payments.fee_type_cycle_primaire')}</option>
                    <option value="college">{t('payments.fee_type_cycle_college')}</option>
                    <option value="lycee">{t('payments.fee_type_cycle_lycee')}</option>
                  </select>
                </div>
              </div>
              {feeTypeForm.cycle !== 'all' && (
                <div>
                  <Label>{t('payments.fee_type_class')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {classes.filter(c => {
                      const cname = c.cycle?.name || '';
                      return cname === feeTypeForm.cycle;
                    }).map(c => (
                      <label key={c.id} className={`flex items-center space-x-2 border rounded-lg px-3 py-1.5 cursor-pointer transition-colors ${
                        feeTypeForm.class_assigned.includes(c.id) ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={feeTypeForm.class_assigned.includes(c.id)}
                          onChange={() => {
                            const next = feeTypeForm.class_assigned.includes(c.id)
                              ? feeTypeForm.class_assigned.filter(id => id !== c.id)
                              : [...feeTypeForm.class_assigned, c.id];
                            setFeeTypeForm({ ...feeTypeForm, class_assigned: next });
                          }}
                          className="rounded text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    ))}
                    {classes.filter(c => (c.cycle?.name || '') === feeTypeForm.cycle).length === 0 && (
                      <p className="text-xs text-gray-400 italic">{t('payments.no_classes')}</p>
                    )}
                  </div>
                </div>
              )}
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
                          {ft.class_names && ft.class_names.length > 0 && ft.class_names.map((cn, i) => (
                            <span key={i} className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{cn}</span>
                          ))}
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

      </>) : activeTab === 'expenses' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <span>{t('expenses.title')}</span>
              </h3>
              <div className="flex gap-2">
                <button onClick={handleExportExpensesPDF}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-all">
                  <FileDown className="w-4 h-4" />
                  <span>PDF</span>
                </button>
                <button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }); setShowCategoryModal(true); }}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-all">
                  <Plus className="w-4 h-4" />
                  <span>{t('expenses.categories')}</span>
                </button>
                <button onClick={() => { setEditingExpense(null); setExpenseForm({ category: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference: '', notes: '' }); setShowExpenseForm(true); }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-all">
                  <Plus className="w-4 h-4" />
                  <span>{t('expenses.add_expense')}</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-xs font-medium text-red-500 uppercase">{t('expenses.total_expenses')}</p>
                <p className="text-xl font-bold text-red-600 mt-1">{expenseStats.total.toLocaleString()} GNF</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p className="text-xs font-medium text-orange-500 uppercase">{t('expenses.this_month')}</p>
                <p className="text-xl font-bold text-orange-600 mt-1">{expenseStats.monthTotal.toLocaleString()} GNF</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs font-medium text-blue-500 uppercase">{t('expenses.total_count')}</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{expenseStats.count}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-xs font-medium text-green-500 uppercase">{t('expenses.categories_count')}</p>
                <p className="text-xl font-bold text-green-600 mt-1">{expenseCategories.length}</p>
              </div>
            </div>
          </div>
          <div className="p-5 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder={t('expenses.search')} value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50" />
              </div>
              <select value={filterExpenseCategory} onChange={(e) => setFilterExpenseCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="">{t('expenses.all_categories')}</option>
                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="month" value={filterExpenseMonth} onChange={(e) => setFilterExpenseMonth(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('expenses.date')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('expenses.category')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('expenses.description')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('expenses.payment_method')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('expenses.reference')}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('expenses.amount')}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('payments.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {expenseLoading ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">{t('expenses.loading')}</td></tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">{t('expenses.no_expenses')}</td></tr>
                ) : filteredExpenses.map(expense => (
                  <tr key={expense.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-700">{new Date(expense.expense_date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">{expense.category_name}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700 max-w-[200px] truncate">{expense.description}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{t(`payments.method.${expense.payment_method}`)}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 font-mono">{expense.reference || '—'}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-red-600 text-right">{parseFloat(expense.amount).toLocaleString()} GNF</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditingExpense(expense); setExpenseForm({ category: expense.category, description: expense.description, amount: expense.amount, expense_date: expense.expense_date, payment_method: expense.payment_method, reference: expense.reference || '', notes: expense.notes || '' }); setShowExpenseForm(true); }}
                          className="w-7 h-7 flex items-center justify-center text-amber-500 bg-white border border-amber-200 rounded hover:bg-amber-50 transition-all" title={t('payments.edit')}>
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDeleteExpense(expense)}
                          className="w-7 h-7 flex items-center justify-center text-red-500 bg-white border border-red-200 rounded hover:bg-red-50 transition-all" title={t('payments.delete')}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border">
          <PaymentHistoryList
            onViewPayment={(paymentId) => {
              paymentService.getById(paymentId).then(res => setViewPayment(res.data)).catch(() => {});
            }}
            onPrintReceipt={(paymentId, historyAmount) => {
              paymentService.getById(paymentId).then(res => printReceipt(res.data, historyAmount)).catch(() => {});
            }}
          />
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
                {(viewPayment.status === 'partial' || viewPayment.status === 'pending') && (
                  <button onClick={() => { setPartialPayment(viewPayment); setViewPayment(null); }}
                    className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors" title={t('payments.add_payment')}>
                    <DollarSign className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => { const p = viewPayment; setViewPayment(null); setTimeout(() => handleEdit(p), 100); }}
                  className="p-2 hover:bg-amber-50 rounded-lg text-amber-600 transition-colors" title={t('payments.edit_payment')}>
                  <Pencil className="w-4 h-4" />
                </button>
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
                  {(() => { const c = statusConfig[viewPayment.status] || statusConfig.partial; const Si = c.icon; return (
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
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('payments.received_by')}</div>
                  <div className="text-sm font-semibold text-gray-900">{viewPayment.received_by || '—'}</div>
                </div>
              </div>
              {viewPayment.notes && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('payments.notes')}</div>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{viewPayment.notes}</div>
                </div>
              )}
            </div>
            <div className="flex justify-end px-6 py-3 border-t bg-gray-50/50">
              <button onClick={() => setViewPayment(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-all">
                {t('payments.close')}
              </button>
            </div>
          </div>
        </div>
      )}
      {partialPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{t('payments.add_payment')}</h2>
              <button onClick={() => setPartialPayment(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!partialAmount || parseFloat(partialAmount) <= 0) return;
              setSavingPartial(true);
              try {
                const res = await paymentService.addPayment(partialPayment.id, { additional_amount: partialAmount });
                const updatedPayment = res.data;
                const updated = await paymentService.getAll();
                setPayments(updated.data.results || updated.data);
                setPartialPayment(null);
                setPartialAmount('');
                setTimeout(() => printReceipt(updatedPayment, partialAmount), 300);
              } catch (err) {
                console.error('Add payment error:', err);
                const detail = err.response?.data?.error || err.response?.data?.detail;
                const status = err.response?.status ? `(${err.response.status})` : '';
                const msg = detail || (err.response?.data ? JSON.stringify(err.response.data) : null) || `Erreur${status}: ${err.message}`;
                showModal('error', t('common.error'), msg);
              } finally {
                setSavingPartial(false);
              }
            }} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                {t('payments.student')}: <strong>{partialPayment.student}</strong><br />
                {t('payments.fee')}: <strong>{partialPayment.fee_type}</strong><br />
                {t('payments.total')}: <strong>{Number(partialPayment.total_amount).toLocaleString()} FG</strong><br />
                {t('payments.already_paid')}: <strong>{Number(partialPayment.amount_paid).toLocaleString()} FG</strong><br />
                {t('payments.remaining')}: <strong>{Number(partialPayment.total_amount - partialPayment.amount_paid).toLocaleString()} FG</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('payments.additional_amount')}</label>
                <input type="number" step="0.01" min="0" required
                  value={partialAmount} onChange={e => setPartialAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={savingPartial}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-all">
                  {savingPartial ? '...' : t('payments.update')}
                </button>
                <button type="button" onClick={() => setPartialPayment(null)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-all">
                  {t('payments.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{editingExpense ? t('expenses.edit_expense') : t('expenses.add_expense')}</h2>
              <button onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>{t('expenses.category')} *</Label>
                <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50">
                  <option value="">{t('expenses.select_category')}</option>
                  {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>{t('expenses.description')} *</Label>
                <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50" placeholder={t('expenses.descriptionPlaceholder')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('expenses.amount')} *</Label>
                  <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50" placeholder="0" />
                </div>
                <div>
                  <Label>{t('expenses.date')} *</Label>
                  <input type="date" value={expenseForm.expense_date} onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('expenses.payment_method')}</Label>
                  <select value={expenseForm.payment_method} onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50">
                    <option value="cash">{t('payments.method.cash')}</option>
                    <option value="bank_transfer">{t('payments.method.bank_transfer')}</option>
                    <option value="mobile_money">{t('payments.method.mobile_money')}</option>
                    <option value="check">{t('payments.method.check')}</option>
                  </select>
                </div>
                <div>
                  <Label>{t('expenses.reference')}</Label>
                  <input type="text" value={expenseForm.reference} onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50" placeholder={t('expenses.referencePlaceholder')} />
                </div>
              </div>
              <div>
                <Label>{t('expenses.notes')}</Label>
                <textarea value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50" placeholder={t('expenses.notesPlaceholder')} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50/50">
              <button onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">{t('payments.cancel')}</button>
              <button type="button" onClick={handleSaveExpense} disabled={savingExpense}
                className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50">
                <Save className="w-4 h-4" />
                <span>{savingExpense ? t('payments.saving') : (editingExpense ? t('payments.update') : t('payments.save'))}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{editingCategory ? t('expenses.edit_category') : t('expenses.add_category')}</h2>
              <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>{t('expenses.category_name')} *</Label>
                <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50" placeholder={t('expenses.categoryNamePlaceholder')} />
              </div>
              <div>
                <Label>{t('expenses.description')}</Label>
                <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50" />
              </div>
              {expenseCategories.length > 0 && (
                <div>
                  <Label>{t('expenses.existing_categories')}</Label>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {expenseCategories.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{c.name}</span>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingCategory(c); setCategoryForm({ name: c.name, description: c.description || '' }); }}
                            className="p-1 text-amber-600 hover:bg-amber-50 rounded"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => { showModal('warning', t('payments.confirmDelete'), t('expenses.deleteCategoryConfirm'), async () => { try { await expenseService.deleteCategory(c.id); const res = await expenseService.getAllCategories(); setExpenseCategories(res.data.results || res.data); showModal('success', t('payments.success'), t('expenses.category_deleted')); } catch (err) { showModal('error', t('payments.error'), t('expenses.category_delete_error')); } }); }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50/50">
              <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">{t('payments.cancel')}</button>
              <button onClick={handleSaveCategory} disabled={savingCategory}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                <Save className="w-4 h-4" />
                <span>{savingCategory ? t('payments.saving') : t('payments.save')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default Payments;
