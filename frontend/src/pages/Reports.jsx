import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Users, CreditCard, Calendar, Download, Clock, Trash2, AlertTriangle } from 'lucide-react';
import MessageModal from '../components/MessageModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { studentService, paymentService, attendanceService, gradeService, activityService, classService } from '../services/api';

const MODEL_KEYS = {
  Student: 'reports.student', Payment: 'reports.payment', Attendance: 'reports.attendance',
  Grade: 'reports.grade', Teacher: 'reports.teacher', Class: 'reports.class',
  Subject: 'reports.subject', Registration: 'reports.registration', Room: 'reports.room',
};

const Reports = () => {
  const { t } = useTranslation();
  const modelLabel = (name) => t(MODEL_KEYS[name]) || name;
  const [searchParams] = useSearchParams();
  const [reportType, setReportType] = useState(() => searchParams.get('type') || 'students');
  const [data, setData] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [filterClass, setFilterClass] = useState('');

  const reportOptions = [
    { id: 'students', label: t('reports.studentsStats'), icon: Users },
    { id: 'payments', label: t('reports.financialReport'), icon: CreditCard },
    { id: 'attendance', label: t('reports.attendanceReport'), icon: Calendar },
    { id: 'grades', label: t('reports.gradesReport'), icon: BarChart3 },
    { id: 'activity', label: t('reports.activityHistory'), icon: Clock },
  ];

  useEffect(() => {
    setData(null);
    setRawData(null);
    fetchReport();
    if (reportType === 'grades') {
      classService.getAll()
        .then((res) => {
          const items = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : [];
          setClasses(items);
        })
        .catch(() => setClasses([]));
    }
  }, [reportType]);

  useEffect(() => {
    if (reportType === 'grades' && filterClass) fetchReport();
  }, [filterClass]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let response;
      switch (reportType) {
        case 'students': {
          response = await studentService.getAll();
          const students = Array.isArray(response.data?.results) ? response.data.results : Array.isArray(response.data) ? response.data : [];
          setRawData(students);
          const byClass = {};
          const byGender = { M: 0, F: 0 };
          students.forEach((s) => {
            const cls = s.class_assigned_name || t('reports.unassigned');
            byClass[cls] = (byClass[cls] || 0) + 1;
            if (s.gender === 'M') byGender.M++;
            else if (s.gender === 'F') byGender.F++;
          });
          setData({
            total: students.length,
            byClass,
            byGender,
            active: students.filter((s) => s.is_active).length,
            inactive: students.filter((s) => !s.is_active).length,
          });
          break;
        }

        case 'payments': {
          response = await paymentService.getAll();
          const payments = Array.isArray(response.data?.results) ? response.data.results : Array.isArray(response.data) ? response.data : [];
          setRawData(payments);
          const byStatus = {};
          let totalAmount = 0;
          payments.forEach((p) => {
            const status = p.status || 'unknown';
            byStatus[status] = (byStatus[status] || 0) + 1;
            if (p.status === 'completed' || p.status === 'partial') totalAmount += parseFloat(p.amount_paid || 0);
          });
          setData({ total: payments.length, totalAmount, byStatus });
          break;
        }

        case 'attendance': {
          response = await attendanceService.getAll();
          const records = Array.isArray(response.data?.results) ? response.data.results : Array.isArray(response.data) ? response.data : [];
          setRawData(records);
          const attByStatus = {};
          records.forEach((r) => {
            const status = r.status || 'unknown';
            attByStatus[status] = (attByStatus[status] || 0) + 1;
          });
          setData({
            total: records.length,
            byStatus: attByStatus,
            present: attByStatus.present || 0,
            absent: attByStatus.absent || 0,
            rate: records.length > 0 ? Math.round(((attByStatus.present || 0) / records.length) * 100) : 0,
          });
          break;
        }

        case 'grades': {
          const gradeParams = {};
          if (filterClass) gradeParams.class_assigned = filterClass;
          response = await gradeService.getAllAverages(gradeParams);
          const averages = Array.isArray(response.data?.results) ? response.data.results : Array.isArray(response.data) ? response.data : [];
          setRawData(averages);
          const selectedClass = classes.find((c) => String(c.id) === String(filterClass));
          const cycleName = selectedClass?.cycle?.name || '';
          const maxScore = cycleName === 'primaire' ? 10 : 20;
          const passingScore = maxScore / 2;
          const passing = averages.filter((a) => parseFloat(a.average) >= passingScore).length;
          setData({
            total: averages.length,
            passing,
            failing: averages.length - passing,
            rate: averages.length > 0 ? Math.round((passing / averages.length) * 100) : 0,
            averages,
            cycleName,
            maxScore,
          });
          break;
        }

        case 'activity': {
          response = await activityService.getAll();
          const activities = Array.isArray(response.data?.results) ? response.data.results : Array.isArray(response.data) ? response.data : [];
          setRawData(activities);
          setData({ total: activities.length, activities });
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!rawData || rawData.length === 0) {
      alert(t('reports.noDataToExport'));
      return;
    }

    try {
      const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const titles = {
      students: t('reports.pdfStudentStats'),
      payments: t('reports.pdfFinancialReport'),
      attendance: t('reports.pdfAttendance'),
      grades: t('reports.pdfGrades'),
      activity: t('reports.pdfActivity'),
    };

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(titles[reportType], 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${t('reports.generatedOn')} ${new Date().toLocaleDateString('fr-FR')} ${t('reports.at')} ${new Date().toLocaleTimeString('fr-FR')}`, 14, 25);

    doc.setTextColor(0, 0, 0);
    let startY = 35;

    if (reportType === 'students') {
      const stats = [
        [t('reports.totalStudents'), String(data.total || 0)],
        [t('reports.active'), String(data.active || 0)],
        [t('reports.inactive'), String(data.inactive || 0)],
        [t('reports.male'), String(data?.byGender?.M || 0)],
        [t('reports.female'), String(data?.byGender?.F || 0)],
      ];
      autoTable(doc, {
        startY,
        head: [[t('reports.indicator'), t('reports.value')]],
        body: stats,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
        margin: { left: 14, right: 14 },
      });

      startY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(t('reports.byClass'), 14, startY);
      startY += 5;

      const classRows = Object.entries(data?.byClass || {}).map(([cls, count]) => [
        cls,
        t('reports.studentCount', { count }),
      ]);
      autoTable(doc, {
        startY,
        head: [[t('reports.classLabel'), t('reports.enrollment')]],
        body: classRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        margin: { left: 14, right: 14 },
      });

      startY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(t('reports.studentList'), 14, startY);

      const studentRows = rawData.map((s) => [
        s.matricule || '',
        `${s.first_name || ''} ${s.last_name || ''}`,
        s.gender === 'M' ? t('reports.male') : t('reports.female'),
        typeof s.class_assigned === 'object' ? (s.class_assigned?.name || '\u2014') : (s.class_assigned || '\u2014'),
        s.is_active ? t('reports.active') : t('reports.inactive'),
      ]);
      autoTable(doc, {
        startY: startY + 3,
        head: [[t('reports.matricule'), t('reports.fullName'), t('reports.gender'), t('reports.classLabel'), t('reports.status')]],
        body: studentRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 55 },
          2: { cellWidth: 22 },
          3: { cellWidth: 35 },
          4: { cellWidth: 25 },
        },
        margin: { left: 14, right: 14 },
      });
    }

    else if (reportType === 'payments') {
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(14, startY, pageWidth - 28, 16, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      const totalDisplay = String(Math.round(data?.totalAmount || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      doc.text(`${t('reports.totalCollected')}: ${totalDisplay} GNF`, 20, startY + 11);
      doc.setTextColor(0, 0, 0);

      const statusRows = Object.entries(data?.byStatus || {}).map(([status, count]) => [
        status.charAt(0).toUpperCase() + status.slice(1),
        String(count),
      ]);
      autoTable(doc, {
        startY: startY + 22,
        head: [[t('reports.statusLabel'), t('reports.count')]],
        body: statusRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        margin: { left: 14, right: 14 },
      });

      const payStart = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(t('reports.paymentDetails'), 14, payStart);

      const paymentRows = rawData.map((p) => [
        typeof p.student === 'object' ? `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.trim() : (p.student || ''),
        typeof p.fee_type === 'object' ? (p.fee_type?.name || '') : (p.fee_type || ''),
        `${String(Math.round(parseFloat(p.amount_paid || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} GNF`,
        p.payment_method === 'cash' ? t('reports.cash') : p.payment_method === 'mobile_money' ? t('reports.mobileMoney') : p.payment_method === 'bank_transfer' ? t('reports.bankTransfer') : p.payment_method || '',
        p.status === 'completed' ? t('reports.paid') : p.status === 'pending' ? t('reports.pending') : p.status || '',
        p.payment_date || '',
      ]);
      autoTable(doc, {
        startY: payStart + 3,
        head: [[t('reports.studentCol'), t('reports.type'), t('reports.amount'), t('reports.method'), t('reports.statusLabel'), t('reports.date')]],
        body: paymentRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 30 },
          2: { cellWidth: 28, halign: 'right' },
          3: { cellWidth: 28 },
          4: { cellWidth: 22 },
          5: { cellWidth: 22 },
        },
        margin: { left: 14, right: 14 },
      });
    }

    else if (reportType === 'attendance') {
      const attStats = [
        [t('reports.totalRecords'), String(data.total || 0)],
        [t('reports.presentLabel'), String(data.present || 0)],
        [t('reports.absentLabel'), String(data.absent || 0)],
        [t('reports.attendanceRate'), `${data.rate || 0}%`],
      ];
      autoTable(doc, {
        startY,
        head: [[t('reports.indicator'), t('reports.value')]],
        body: attStats,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
        margin: { left: 14, right: 14 },
      });

      const attStart = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(t('reports.attendanceDetails'), 14, attStart);

      const attRows = rawData.map((r) => [
        typeof r.student === 'object' ? `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.trim() : (r.student || ''),
        r.date || '',
        r.status === 'present' ? t('reports.presentLabel') : r.status === 'absent' ? t('reports.absentLabel') : r.status === 'late' ? t('reports.lateLabel') : r.status === 'excused' ? t('reports.excusedLabel') : r.status || '',
        r.comment || '\u2014',
      ]);
      autoTable(doc, {
        startY: attStart + 3,
        head: [[t('reports.studentCol'), t('reports.date'), t('reports.statusLabel'), t('reports.comment')]],
        body: attRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 75 },
        },
        margin: { left: 14, right: 14 },
      });
    }

    else if (reportType === 'grades') {
      const gradeStats = [
        [t('reports.totalAverages'), String(data.total || 0)],
        [t('reports.passingLabel'), String(data.passing || 0)],
        [t('reports.failingLabel'), String(data.failing || 0)],
        [t('reports.successRate'), `${data.rate || 0}%`],
      ];
      autoTable(doc, {
        startY,
        head: [[t('reports.indicator'), t('reports.value')]],
        body: gradeStats,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
        margin: { left: 14, right: 14 },
      });

      const gradeStart = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(t('reports.studentRanking'), 14, gradeStart);

      const getStudentName = (a) => {
        if (typeof a.student === 'object' && a.student !== null) {
          return `${a.student.first_name || ''} ${a.student.last_name || ''}`.trim() || a.student.name || t('reports.studentFallback');
        }
        return String(a.student || t('reports.studentFallback'));
      };

      const gradeRows = rawData.map((a) => [
        getStudentName(a),
        `${a.average || '\u2014'}/20`,
        `#${a.rank || '\u2014'}`,
      ]);
      autoTable(doc, {
        startY: gradeStart + 3,
        head: [[t('reports.studentCol'), t('reports.averageLabel'), t('reports.rankLabel')]],
        body: gradeRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 30, halign: 'right' },
          2: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
      });
    }

    else if (reportType === 'activity') {
      const actRows = rawData.map((a) => [
        a.user || '\u2014',
        a.action === 'create' ? t('reports.create') : a.action === 'update' ? t('reports.update') : t('reports.delete'),
        modelLabel(a.model_name),
        a.object_repr || '\u2014',
        new Date(a.timestamp).toLocaleString('fr-FR'),
      ]);
      autoTable(doc, {
        startY,
        head: [[t('reports.user'), t('reports.action'), t('reports.model'), t('reports.object'), t('reports.date')]],
        body: actRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 }, 3: { cellWidth: 55 }, 4: { cellWidth: 35 } },
        margin: { left: 14, right: 14 },
      });
    }

    doc.setFillColor(243, 244, 246);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(t('reports.footer'), 14, pageHeight - 5);
    doc.text(`${t('reports.page')} 1`, pageWidth - 24, pageHeight - 5);

    const filenames = {
      students: 'Statistiques_eleves',
      payments: 'Rapport_financier',
      attendance: 'Rapport_absences',
      grades: 'Resultats_academiques',
      activity: 'Historique_activites',
    };
    doc.save(`${filenames[reportType]}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert(t('reports.pdfExportError', { message: error.message }));
    }
  };

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('reports.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('reports.subtitle')}</p>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t('reports.exportPdf')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {reportOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setReportType(opt.id)}
            className={`p-4 rounded-xl shadow text-left transition-all ${
              reportType === opt.id ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'
            }`}
          >
            <opt.icon className={`w-6 h-6 mb-2 ${reportType === opt.id ? 'text-white' : 'text-blue-600'}`} />
            <p className="font-medium">{opt.label}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-gray-500">{t('reports.loadingData')}</p>
        </div>
      ) : data ? (
        <div className="bg-white rounded-xl shadow p-6">
          {reportType === 'students' && (
            <StudentsReport data={data} />
          )}
          {reportType === 'payments' && (
            <PaymentsReport data={data} />
          )}
          {reportType === 'attendance' && (
            <AttendanceReport data={data} />
          )}
          {reportType === 'grades' && (
            <>
              <div className="mb-4 flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">{t('reports.classLabel')}</label>
                <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">{t('reports.allClasses')}</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
                </select>
              </div>
              <GradesReport data={data} />
            </>
          )}
          {reportType === 'activity' && (
            <ActivityReport data={data} onRefresh={fetchReport} />
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-gray-500">{t('reports.noDataAvailable')}</p>
        </div>
      )}
    </div>
  );
};

const StudentsReport = ({ data }) => {
  const { t } = useTranslation();
  const byGender = data?.byGender || { M: 0, F: 0 };
  const byClass = data?.byClass || {};
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.studentsStats')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label={t('reports.totalStudents')} value={data.total || 0} />
        <Stat label={t('reports.active')} value={data.active || 0} />
        <Stat label={t('reports.male')} value={byGender.M || 0} />
        <Stat label={t('reports.female')} value={byGender.F || 0} />
      </div>
      <h4 className="font-medium text-gray-700 mb-2">{t('reports.byClass')}</h4>
      <div className="space-y-2">
        {Object.entries(byClass).map(([cls, count]) => (
          <div key={cls} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{cls}</span>
            <span className="font-bold text-blue-600">{t('reports.studentCount', { count })}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PaymentsReport = ({ data }) => {
  const { t } = useTranslation();
  const byStatus = data?.byStatus || {};
  const totalAmount = data?.totalAmount || 0;
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.financialReport')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Stat label={t('reports.totalTransactions')} value={data.total || 0} />
        <Stat label={t('reports.totalCollected')} value={`${totalAmount.toLocaleString()} GNF`} />
      </div>
      <h4 className="font-medium text-gray-700 mb-2">{t('reports.byStatus')}</h4>
      <div className="space-y-2">
        {Object.entries(byStatus).map(([status, count]) => (
          <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700 capitalize">{status}</span>
            <span className="font-bold text-blue-600">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AttendanceReport = ({ data }) => {
  const { t } = useTranslation();
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.attendanceReport')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label={t('reports.totalRecords')} value={data.total || 0} />
        <Stat label={t('reports.presentLabel')} value={data.present || 0} />
        <Stat label={t('reports.absentLabel')} value={data.absent || 0} />
        <Stat label={t('reports.attendanceRate')} value={`${data.rate || 0}%`} />
      </div>
    </div>
  );
};

const GradesReport = ({ data }) => {
  const { t } = useTranslation();
  const getStudentName = (a) => {
    if (typeof a.student === 'object' && a.student !== null) {
      return `${a.student.first_name || ''} ${a.student.last_name || ''}`.trim() || a.student.name || t('reports.studentFallback');
    }
    return String(a.student || t('reports.studentFallback'));
  };

  const maxScore = data?.maxScore || 20;
  const passingScore = maxScore / 2;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.gradesReport')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label={t('reports.totalAverages')} value={data.total || 0} />
        <Stat label={t('reports.passingWithScore', { score: passingScore })} value={data.passing || 0} />
        <Stat label={t('reports.failingLabel')} value={data.failing || 0} />
        <Stat label={t('reports.successRate')} value={`${data.rate || 0}%`} />
      </div>
      {data.averages?.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
              <th className="px-4 py-2 font-medium">{t('reports.studentCol')}</th>
              <th className="px-4 py-2 font-medium">{t('reports.averageLabel')}</th>
              <th className="px-4 py-2 font-medium">{t('reports.rankLabel')}</th>
            </tr>
          </thead>
          <tbody>
            {data.averages.slice(0, 20).map((a) => (
              <tr key={a.id} className="border-b border-gray-100">
                <td className="px-4 py-2 text-sm">{getStudentName(a)}</td>
                <td className="px-4 py-2 font-semibold text-blue-600">{a.average}/{maxScore}</td>
                <td className="px-4 py-2 text-sm">#{a.rank || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const ActivityReport = ({ data, onRefresh }) => {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(null);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  const activities = data?.activities || [];

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('reports.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  const handleDelete = async (id) => {
    showModal('warning', t('reports.deleteActivityTitle'),
      t('reports.deleteActivityMsg'),
      async () => {
        closeModal();
        setDeleting(id);
        try { await activityService.delete(id); onRefresh(); } catch {}
        setDeleting(null);
      }
    );
  };

  const handleClearAll = async () => {
    showModal('warning', t('reports.clearAllTitle'),
      t('reports.clearAllMsg'),
      async () => {
        closeModal();
        setDeleting('all');
        try { await activityService.clearAll(); onRefresh(); } catch {}
        setDeleting(null);
      }
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('reports.activityHistory')}</h3>
        {activities.length > 0 && (
          <button onClick={handleClearAll} disabled={deleting === 'all'}
            className="flex items-center space-x-1.5 text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" /><span>{t('reports.clearAll')}</span>
          </button>
        )}
      </div>
      <div className="mb-4">
        <Stat label={t('reports.totalActions')} value={data.total || 0} />
      </div>
      {activities.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-2 font-medium">{t('reports.user')}</th>
                <th className="px-4 py-2 font-medium">{t('reports.action')}</th>
                <th className="px-4 py-2 font-medium">{t('reports.model')}</th>
                <th className="px-4 py-2 font-medium">{t('reports.object')}</th>
                <th className="px-4 py-2 font-medium">{t('reports.date')}</th>
                <th className="px-4 py-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{a.user || '\u2014'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      a.action === 'create' ? 'bg-green-100 text-green-700' :
                      a.action === 'update' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {a.action === 'create' ? t('reports.create') : a.action === 'update' ? t('reports.update') : t('reports.delete')}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">{modelLabel(a.model_name)}</td>
                  <td className="px-4 py-2 text-sm text-gray-500 max-w-xs truncate">{a.object_repr || '\u2014'}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{new Date(a.timestamp).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id}
                      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-400 text-sm">
          {t('reports.noActivity')}
        </div>
      )}
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

export default Reports;
