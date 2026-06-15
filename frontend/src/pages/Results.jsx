import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Download, Trophy, Users, TrendingUp, Award, Printer, X, Search, ChevronLeft, ChevronRight, ListChecks, GraduationCap } from 'lucide-react';
import { resultService, gradeService, classService, cycleService } from '../services/api';
import { getPreferredAcademicYear, fetchAcademicYears } from '../utils/preferences';

const RESULTS_PER_PAGE = 20;

const Results = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [terms, setTerms] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedCycle, setSelectedCycle] = useState('');
  const [selectedYear, setSelectedYear] = useState(() => getPreferredAcademicYear());
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [admisModal, setAdmisModal] = useState(null);

  const [studentData, setStudentData] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [studentClassId, setStudentClassId] = useState('');
  const [studentTermId, setStudentTermId] = useState('');

  useEffect(() => {
    Promise.all([
      classService.getAll(),
      gradeService.getAllTerms(),
      cycleService.getAll(),
      fetchAcademicYears(),
    ]).then(([cls, trm, cyc, yr]) => {
      setClasses(cls.data.results || cls.data);
      setTerms(trm.data.results || trm.data);
      setCycles(cyc.data.results || cyc.data);
      setYears(yr);
    });
  }, []);

  const filteredClasses = useMemo(() => {
    let list = classes;
    if (selectedCycle) list = list.filter((c) => c.cycle === parseInt(selectedCycle) || c.cycle?.id === parseInt(selectedCycle) || c.cycle?.name === selectedCycle);
    if (selectedYear) list = list.filter((c) => c.academic_year === selectedYear);
    return list;
  }, [classes, selectedCycle, selectedYear]);

  const fetchResults = async () => {
    if (!selectedTerm) return;
    setLoading(true);
    try {
      const params = { term: selectedTerm };
      if (selectedClass) params.class_assigned = selectedClass;
      if (selectedYear) params.academic_year = selectedYear;
      const res = await resultService.getAll(params);
      setResults(res.data.results || res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (selectedTerm && activeTab === 'classes') fetchResults(); }, [selectedClass, selectedTerm, selectedYear, activeTab]);

  const fetchStudentResults = async () => {
    if (!studentClassId || !studentTermId) return;
    setLoading(true);
    setStudentData(null);
    try {
      const res = await gradeService.studentResults(studentClassId, studentTermId);
      setStudentData(res.data);
      setStudentPage(1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (studentClassId && studentTermId && activeTab === 'admis') fetchStudentResults(); }, [studentClassId, studentTermId, activeTab]);

  const downloadFile = async (url, filename) => {
    try {
      const res = await url;
      const blob = new Blob([res.data]);
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    } catch (e) { console.error(e); }
  };

  const totals = {
    total: results.reduce((s, r) => s + r.total_students, 0),
    passed: results.reduce((s, r) => s + r.passed, 0),
    failed: results.reduce((s, r) => s + r.failed, 0),
  };
  const successRate = totals.total > 0 ? ((totals.passed / totals.total) * 100).toFixed(1) : 0;

  const openAdmis = async (classId, className, termName) => {
    if (!selectedTerm) return;
    setLoading(true);
    try {
      const res = await resultService.admisList(classId, selectedTerm);
      setAdmisModal({ class: className, term: termName, ...res.data });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const printAdmis = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const rows = (admisModal?.results || []).map((s, i) =>
      `<tr><td>${i + 1}</td><td>${s.matricule}</td><td>${s.first_name} ${s.last_name}</td><td>${s.average.toFixed(2)}</td><td>${s.rank || '—'}</td></tr>`
    ).join('');
    printWin.document.write(`
      <html><head><title>${t('results.admis_list')}</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;border:1px solid #ddd;text-align:left}th{background:#1e40af;color:#fff}h2{margin-bottom:4px}.meta{color:#666;font-size:13px;margin-bottom:16px}</style>
      </head><body>
      <h2>${t('results.admis_list')}</h2>
      <div class="meta">${admisModal?.class} • ${admisModal?.term} • ${admisModal?.count} ${t('results.student_s')}</div>
      <table><thead><tr><th>${t('results.num')}</th><th>${t('results.matricule')}</th><th>${t('results.name')}</th><th>${t('results.average')}</th><th>${t('results.rank')}</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>
    `);
    printWin.document.close();
    printWin.print();
  };

  const stats = studentData?.stats;
  const filteredStudents = useMemo(() => {
    const list = studentData?.results || [];
    if (!studentSearch) return list;
    const q = studentSearch.toLowerCase();
    return list.filter((s) =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      (s.matricule || '').toLowerCase().includes(q)
    );
  }, [studentData, studentSearch]);

  const totalPages = Math.ceil(filteredStudents.length / RESULTS_PER_PAGE);
  const pagedStudents = filteredStudents.slice((studentPage - 1) * RESULTS_PER_PAGE, studentPage * RESULTS_PER_PAGE);

  const decisionBadge = (decision) => {
    if (decision === 'Admis') return 'bg-green-100 text-green-700 border-green-200';
    return 'bg-orange-100 text-orange-700 border-orange-200';
  };

  const classInfo = studentData?.class_info;

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('results.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('results.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('classes')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'classes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <BarChart3 className="w-4 h-4" /><span>{t('results.by_class')}</span>
        </button>
        <button onClick={() => setActiveTab('admis')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'admis' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <GraduationCap className="w-4 h-4" /><span>{t('results.admis_failed')}</span>
        </button>
      </div>

      {activeTab === 'classes' && (
        <>
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('results.academic_year')}</option>
                {years.map((y) => <option key={y.id} value={y.name}>{y.name}</option>)}
              </select>
              <select value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)} className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('results.cycle')}</option>
                {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('results.all_classes')}</option>
                {filteredClasses.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
              </select>
              <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('results.select')}</option>
                {terms.length === 0 ? (
                  <option value="" disabled>{t('settings.preferences.noSemesters')}</option>
                ) : (
                  terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)
                )}
              </select>
              <button onClick={fetchResults} disabled={!selectedTerm || loading}
                className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium">
                <BarChart3 className="w-4 h-4" /> <span>{t('results.refresh')}</span>
              </button>
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-400">
                {results.length} {results.length > 1 ? t('results.results_plural') : t('results.results_singular')}
              </div>
              <button onClick={() => { setSelectedClass(''); setSelectedTerm(''); setSelectedCycle(''); setSelectedYear(getPreferredAcademicYear()); setResults([]); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                {t('results.reset')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center space-x-3 text-blue-600 mb-2">
                <Users className="w-5 h-5" /><h3 className="font-semibold">{t('results.total_students')}</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{totals.total}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center space-x-3 text-green-600 mb-2">
                <TrendingUp className="w-5 h-5" /><h3 className="font-semibold">{t('results.success_rate')}</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{successRate}%</p>
              <p className="text-sm text-gray-500">{totals.passed} {t('results.passed')} / {totals.failed} {t('results.failed')}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center space-x-3 text-amber-600 mb-2">
                <Award className="w-5 h-5" /><h3 className="font-semibold">{t('results.best_class')}</h3>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {results.length > 0 ? (results.reduce((best, r) => (!best || r.average > best.average) ? r : best, null)?.class_name || t('results.na')) : '—'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow">
            <div className="px-6 py-4 border-b"><h3 className="font-semibold text-gray-900">{t('results.by_class')}</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-sm text-gray-500">
                    <th className="px-6 py-3 font-medium">{t('results.class')}</th>
                    <th className="px-6 py-3 font-medium">{t('results.term')}</th>
                    <th className="px-6 py-3 font-medium">{t('results.total')}</th>
                    <th className="px-6 py-3 font-medium">{t('results.passed')}</th>
                    <th className="px-6 py-3 font-medium">{t('results.failed')}</th>
                    <th className="px-6 py-3 font-medium">{t('results.average')}</th>
                    <th className="px-6 py-3 font-medium">{t('results.best_student')}</th>
                    <th className="px-6 py-3 font-medium">{t('results.rate')}</th>
                    <th className="px-6 py-3 font-medium">{t('results.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr><td colSpan="9" className="px-6 py-8 text-center text-gray-500">{loading ? t('results.loading') : t('results.no_results')}</td></tr>
                  ) : (
                    results.map((r) => {
                      const rate = r.total_students > 0 ? ((r.passed / r.total_students) * 100).toFixed(1) : 0;
                      return (
                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{r.class_name}</td>
                          <td className="px-6 py-4 text-gray-600">{r.term_name}</td>
                          <td className="px-6 py-4 text-gray-600">{r.total_students}</td>
                          <td className="px-6 py-4 text-green-600 font-medium">{r.passed}</td>
                          <td className="px-6 py-4 text-red-600 font-medium">{r.failed}</td>
                          <td className="px-6 py-4 font-bold">{r.average || '—'}</td>
                          <td className="px-6 py-4 text-gray-600">{r.best_student || '—'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div className={`h-2 rounded-full ${rate >= 70 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${rate}%`}} />
                              </div>
                              <span className="text-xs font-medium">{rate}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={() => openAdmis(r.class_assigned, r.class_name, r.term_name)}
                              className="flex items-center space-x-1 text-xs bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                              <Printer className="w-3 h-3" /><span>{t('results.admis')}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'admis' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('results.academic_year')}</option>
                {years.map((y) => <option key={y.id} value={y.name}>{y.name}</option>)}
              </select>
              <select value={selectedCycle} onChange={(e) => { setSelectedCycle(e.target.value); setStudentClassId(''); }} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('results.cycle')}</option>
                {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={studentClassId} onChange={(e) => setStudentClassId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('results.class')}</option>
                {filteredClasses.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
              </select>
              <select value={studentTermId} onChange={(e) => setStudentTermId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('results.term')}</option>
                {terms.length === 0 ? (
                  <option value="" disabled>{t('settings.preferences.noSemesters')}</option>
                ) : (
                  terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)
                )}
              </select>
              <button onClick={fetchStudentResults} disabled={!studentClassId || !studentTermId || loading}
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                <ListChecks className="w-4 h-4" /><span>{t('results.load')}</span>
              </button>
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-400">
                {studentData?.count || 0} {studentData?.count !== 1 ? t('results.students_plural') : t('results.students_singular')}
              </div>
              <button onClick={() => { setSelectedYear(''); setSelectedCycle(''); setStudentClassId(''); setStudentTermId(''); setStudentData(null); setStudentSearch(''); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                {t('results.reset')}
              </button>
            </div>
          </div>

          {studentData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-500 font-medium uppercase">{t('results.total')}</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total || 0}</p></div>
                <div className="bg-white rounded-xl border border-green-200 p-4"><p className="text-xs text-green-600 font-medium uppercase">{t('results.passed')}</p><p className="text-2xl font-bold text-green-600 mt-1">{stats?.admis || 0}</p></div>
                <div className="bg-white rounded-xl border border-orange-200 p-4"><p className="text-xs text-orange-600 font-medium uppercase">{t('results.repeat')}</p><p className="text-2xl font-bold text-orange-600 mt-1">{stats?.echoues || 0}</p></div>
                <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-500 font-medium uppercase">{t('results.success_rate')}</p><p className="text-2xl font-bold text-blue-600 mt-1">{stats?.success_rate || 0}%</p></div>
                <div className="bg-white rounded-xl border border-amber-200 p-4"><p className="text-xs text-amber-600 font-medium uppercase">{t('results.best')}</p><p className="text-lg font-bold text-gray-900 mt-1 truncate">{stats?.best_student || '—'}</p><p className="text-xs text-gray-400">{stats?.best_avg ? `${stats.best_avg}/${classInfo?.cycle === 'primaire' ? 10 : 20}` : ''}</p></div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-semibold text-gray-900">
                      {classInfo?.name} • {studentData.term}
                      {classInfo?.specialty && <span className="text-gray-500 font-normal"> • {classInfo.specialty}</span>}
                    </h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{classInfo?.cycle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
<input type="text" placeholder={t('results.search')} value={studentSearch} onChange={(e) => { setStudentSearch(e.target.value); setStudentPage(1); }}
                         className="pl-8 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
                    </div>
                    <button onClick={() => downloadFile(gradeService.resultsPdf(studentClassId, studentTermId, 'all'), `resultats_${classInfo?.name}.pdf`)}
                      className="flex items-center space-x-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-xs font-medium">
                      <Download className="w-3.5 h-3.5" /><span>{t('results.pdf')}</span>
                    </button>
                    <button onClick={() => downloadFile(gradeService.resultsExcel(studentClassId, studentTermId, 'all'), `resultats_${classInfo?.name}.xlsx`)}
                      className="flex items-center space-x-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-xs font-medium">
                      <Download className="w-3.5 h-3.5" /><span>{t('results.excel')}</span>
                    </button>
                    <button onClick={() => downloadFile(gradeService.resultsPdf(studentClassId, studentTermId, 'admis'), `admis_${classInfo?.name}.pdf`)}
                      className="flex items-center space-x-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-xs font-medium">
                      <Printer className="w-3.5 h-3.5" /><span>{t('results.print_admis')}</span>
                    </button>
                    <button onClick={() => downloadFile(gradeService.resultsPdf(studentClassId, studentTermId, 'echoues'), `echoues_${classInfo?.name}.pdf`)}
                      className="flex items-center space-x-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 text-xs font-medium">
                      <Printer className="w-3.5 h-3.5" /><span>{t('results.print_failed')}</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-900 to-blue-800 text-white text-sm">
                        <th className="px-3 py-3 font-medium text-center w-10">{t('results.num')}</th>
                        <th className="px-3 py-3 font-medium text-left">{t('results.matricule')}</th>
                        <th className="px-3 py-3 font-medium text-left w-12">{t('results.photo')}</th>
                        <th className="px-3 py-3 font-medium text-left">{t('results.last_name')}</th>
                        <th className="px-3 py-3 font-medium text-left">{t('results.first_name')}</th>
                        <th className="px-3 py-3 font-medium text-left">{t('results.class')}</th>
                        <th className="px-3 py-3 font-medium text-center">{t('results.avg')}</th>
                        <th className="px-3 py-3 font-medium text-center">{t('results.rank')}</th>
                        <th className="px-3 py-3 font-medium text-center">{t('results.mention')}</th>
                        <th className="px-3 py-3 font-medium text-center">{t('results.decision')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedStudents.length === 0 ? (
                        <tr><td colSpan="10" className="px-6 py-12 text-center text-gray-400 text-sm">{loading ? t('results.loading') : t('results.no_student_found')}</td></tr>
                      ) : (
                        pagedStudents.map((s, i) => (
                          <tr key={s.student_id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="px-3 py-2.5 text-xs text-gray-400 text-center">{(studentPage - 1) * RESULTS_PER_PAGE + i + 1}</td>
                            <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{s.matricule}</td>
                            <td className="px-3 py-2">
                              {s.photo_url ? (
                                <img src={s.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-medium">
                                  {s.first_name?.[0]}{s.last_name?.[0]}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{s.last_name}</td>
                            <td className="px-3 py-2.5 text-sm text-gray-700">{s.first_name}</td>
                            <td className="px-3 py-2.5 text-xs text-gray-500">{s.class_name}</td>
                            <td className="px-3 py-2.5 text-sm font-bold text-center">{s.average.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-xs text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs">{s.rank || '—'}</span>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                s.mention === 'Tres bien' ? 'bg-green-100 text-green-700' :
                                s.mention === 'Bien' ? 'bg-blue-100 text-blue-700' :
                                s.mention === 'Assez bien' ? 'bg-indigo-100 text-indigo-700' :
                                s.mention === 'Passable' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>{s.mention}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${decisionBadge(s.decision)}`}>
                                {s.decision}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                    <span className="text-xs text-gray-500">{filteredStudents.length} {filteredStudents.length > 1 ? t('results.students_plural') : t('results.students_singular')}</span>
                    <div className="flex items-center gap-1">
                      <button disabled={studentPage <= 1} onClick={() => setStudentPage(studentPage - 1)}
                        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (studentPage <= 3) pageNum = i + 1;
                        else if (studentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = studentPage - 2 + i;
                        return (
                          <button key={pageNum} onClick={() => setStudentPage(pageNum)}
                            className={`w-7 h-7 rounded text-xs font-medium ${studentPage === pageNum ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
                            {pageNum}
                          </button>
                        );
                      })}
                      <button disabled={studentPage >= totalPages} onClick={() => setStudentPage(studentPage + 1)}
                        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!studentData && !loading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">{t('results.select_prompt')}</p>
            </div>
          )}
        </>
      )}

      {admisModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setAdmisModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div><h2 className="text-lg font-bold text-gray-900">{t('results.admis_list')}</h2><p className="text-sm text-gray-500">{admisModal.class} • {admisModal.term} • {admisModal.count} {t('results.student_s')}</p></div>
              <div className="flex items-center gap-2">
                <button onClick={printAdmis} className="flex items-center space-x-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"><Printer className="w-4 h-4" /><span>{t('results.print')}</span></button>
                <button onClick={() => setAdmisModal(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {admisModal.results?.length > 0 ? (
                <table className="w-full">
                  <thead><tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                    <th className="px-4 py-2 font-medium w-10">{t('results.num')}</th>
                    <th className="px-4 py-2 font-medium">{t('results.matricule')}</th>
                    <th className="px-4 py-2 font-medium">{t('results.name')}</th>
                    <th className="px-4 py-2 font-medium">{t('results.average')}</th>
                    <th className="px-4 py-2 font-medium">{t('results.rank')}</th>
                  </tr></thead>
                  <tbody>{admisModal.results.map((s, i) => (
                    <tr key={s.student_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2.5 text-sm font-mono text-gray-600">{s.matricule}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</td>
                      <td className="px-4 py-2.5 text-sm font-bold text-green-600">{s.average.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{s.rank || '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              ) : <div className="text-center py-8 text-gray-400 text-sm">{t('results.no_admis')}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;