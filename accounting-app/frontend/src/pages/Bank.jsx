import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import PrintButton from '../components/PrintButton';
import { useAuth } from '../contexts/AuthContext';

const formatNum = (n) => Number(n || 0).toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-LY') : '';

export default function Bank() {
  const { isAccountant } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amountIn: '',
    amountOut: '',
    reference: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await axios.get('/api/bank/transactions', { params });
      setTransactions(res.data.transactions);
      setCurrentBalance(res.data.currentBalance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description) return setError('البيان مطلوب');
    if (!form.amountIn && !form.amountOut) return setError('أدخل مبلغ وارد أو صادر');
    setSubmitting(true);
    setError('');
    try {
      await axios.post('/api/bank/transactions', form);
      setShowModal(false);
      setForm({ date: new Date().toISOString().split('T')[0], description: '', amountIn: '', amountOut: '', reference: '', notes: '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await axios.delete(`/api/bank/transactions/${id}`);
      fetchData();
    } catch (err) {
      alert('خطأ في الحذف');
    }
  };

  const printHeaders = ['#', 'التاريخ', 'البيان', 'المرجع', 'إيداع', 'سحب', 'الرصيد', 'ملاحظات'];
  const printData = transactions.map((tx, i) => [
    i + 1,
    formatDate(tx.date),
    tx.description,
    tx.reference || '',
    tx.amountIn > 0 ? formatNum(tx.amountIn) : '',
    tx.amountOut > 0 ? formatNum(tx.amountOut) : '',
    formatNum(tx.balance),
    tx.notes || ''
  ]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">حساب المصرف</h1>
          <p className="text-gray-500 text-sm">إدارة المعاملات البنكية</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <PrintButton
            title="كشف حساب المصرف"
            headers={printHeaders}
            data={printData}
            filename="bank-account"
            summaryRows={[{ label: 'الرصيد الحالي', value: formatNum(currentBalance) }]}
          />
          {isAccountant() && (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة حركة
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">الرصيد الحالي</p>
          <p className="text-3xl font-bold mt-1">{formatNum(currentBalance)}</p>
        </div>
        <div className="bg-green-500 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">إجمالي الإيداعات</p>
          <p className="text-3xl font-bold mt-1">
            {formatNum(transactions.reduce((s, t) => s + t.amountIn, 0))}
          </p>
        </div>
        <div className="bg-red-500 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">إجمالي السحوبات</p>
          <p className="text-3xl font-bold mt-1">
            {formatNum(transactions.reduce((s, t) => s + t.amountOut, 0))}
          </p>
        </div>
      </div>

      <div className="card flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">من:</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-field w-36" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">إلى:</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-field w-36" />
        </div>
        <button onClick={fetchData} className="btn-primary text-sm py-2">بحث</button>
        <button onClick={() => { setFrom(''); setTo(''); setTimeout(fetchData, 0); }} className="btn-secondary text-sm py-2">إعادة تعيين</button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">كشف المصرف ({transactions.length} معاملة)</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-arabic">
              <thead>
                <tr>
                  <th>#</th>
                  <th>التاريخ</th>
                  <th>البيان</th>
                  <th>المرجع</th>
                  <th>إيداع</th>
                  <th>سحب</th>
                  <th>الرصيد</th>
                  <th>ملاحظات</th>
                  {isAccountant() && <th>إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan="9" className="py-8 text-gray-400">لا توجد معاملات</td></tr>
                ) : transactions.map((tx, i) => (
                  <tr key={tx.id}>
                    <td>{i + 1}</td>
                    <td>{formatDate(tx.date)}</td>
                    <td className="text-right">{tx.description}</td>
                    <td>{tx.reference || '-'}</td>
                    <td className="text-green-600 font-semibold">{tx.amountIn > 0 ? formatNum(tx.amountIn) : '-'}</td>
                    <td className="text-red-600 font-semibold">{tx.amountOut > 0 ? formatNum(tx.amountOut) : '-'}</td>
                    <td className={`font-bold ${tx.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatNum(tx.balance)}</td>
                    <td className="text-gray-500 text-xs">{tx.notes || '-'}</td>
                    {isAccountant() && (
                      <td>
                        <button onClick={() => handleDelete(tx.id)} className="btn-danger text-xs py-1 px-2">حذف</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {transactions.length > 0 && (
                <tfoot>
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan="4" className="text-right text-blue-800">الإجماليات</td>
                    <td className="text-green-700">{formatNum(transactions.reduce((s, t) => s + t.amountIn, 0))}</td>
                    <td className="text-red-700">{formatNum(transactions.reduce((s, t) => s + t.amountOut, 0))}</td>
                    <td className={`text-lg ${currentBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatNum(currentBalance)}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="إضافة حركة مصرف">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المرجع</label>
              <input type="text" value={form.reference} onChange={(e) => setForm({...form, reference: e.target.value})} className="input-field" placeholder="رقم الحوالة أو الشيك" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البيان *</label>
            <input type="text" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="input-field" placeholder="وصف الحركة" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إيداع</label>
              <input type="number" value={form.amountIn} onChange={(e) => setForm({...form, amountIn: e.target.value, amountOut: ''})} className="input-field" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سحب</label>
              <input type="number" value={form.amountOut} onChange={(e) => setForm({...form, amountOut: e.target.value, amountIn: ''})} className="input-field" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="input-field" rows="2" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'جاري الحفظ...' : 'حفظ'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
