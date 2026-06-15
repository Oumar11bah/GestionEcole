import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentService, studentService } from '../services/api';

const MobilePayment = () => {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    provider: 'orange',
    phone_number: '',
    amount: '',
    student_id: '',
    fee_type_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, feeTypesRes] = await Promise.all([
        studentService.getAll({ page_size: 100 }),
        paymentService.getAllFeeTypes(),
      ]);
      setStudents(studentsRes.data.results || studentsRes.data);
      setFeeTypes(feeTypesRes.data.results || feeTypesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await paymentService.initiateMobilePayment(formData);
      setResult({ success: true, message: t('payment.initiated', { transactionId: response.data.transaction_id }) });
      setFormData({ provider: 'orange', phone_number: '', amount: '', student_id: '', fee_type_id: '' });
    } catch (error) {
      setResult({ success: false, message: error.response?.data?.error || t('payment.initError') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('payment.title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">OM</span>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-700 font-bold text-sm">MTN</span>
              </div>
            </div>

            {result && (
              <div className={`p-4 rounded-lg mb-4 ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {result.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('payment.provider')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, provider: 'orange' })}
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${
                      formData.provider === 'orange' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                    }`}
                  >
                    <span className="text-orange-600 font-bold">{t('payment.orangeMoney')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, provider: 'mtn' })}
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${
                      formData.provider === 'mtn' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'
                    }`}
                  >
                    <span className="text-yellow-700 font-bold">{t('payment.mtnMoMo')}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('payment.phoneNumber')}</label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  required
                  placeholder={t('payment.phonePlaceholder')}
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('payment.student')}</label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  required
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('payment.select')}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.matricule})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('payment.feeType')}</label>
                <select
                  value={formData.fee_type_id}
                  onChange={(e) => {
                    const fee = feeTypes.find((f) => f.id === parseInt(e.target.value));
                    setFormData({
                      ...formData,
                      fee_type_id: e.target.value,
                      amount: fee ? fee.amount : formData.amount,
                    });
                  }}
                  required
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('payment.select')}</option>
                  {feeTypes.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} - {f.amount?.toLocaleString()} GNF</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('payment.amount')}</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {loading ? t('payment.processing') : t('payment.initiate')}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('payment.instructions')}</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <p>{t('payment.instruction1')}</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <p>{t('payment.instruction2')}</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <p>{t('payment.instruction3')}</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              <p>{t('payment.instruction4')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePayment;
