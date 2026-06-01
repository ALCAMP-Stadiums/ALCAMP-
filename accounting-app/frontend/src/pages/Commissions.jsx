import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import PrintButton from '../components/PrintButton';
import { useAuth } from '../contexts/AuthContext';

const formatNum = (n) => Number(n || 0).toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-LY') : '';

export default function Commissions() {
  const { isAccountant } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [totalCommission, setTotalCommission] = useState(0);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({ salesRepId: '', from: '', to: '' });
  const [form, setForm] = useState({
    salesRepId: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    salePrice: '',
    purchasePrice: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repsRes, commRes, summRes] = await Promise.all([
        axios.get('/api/contacts', { params: { type: 'SALES_REP' } }),
        axios.get('/api/commissions', { params: filter }),
        axios.get('/api/commissions/summary', { params: { from: filter.from, to: filter.to } })
      ]);
      setSalesReps(repsRes.data);
      setCommissions(commRes.data.commissions);
      setTotalCommission(commRes.data.totalCommission);
      setSummary(summRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.salesRepId) return setError('اختر المندوب');
    if (!form.description) return setError('البيان مطلوب');
    setSubmitting(true);
    setError('');
    try {
      await axios.post('/api/commissions', form);
      setShowModal(false);
      setForm({ salesRepId: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0], description: '', salePrice: '', purchasePrice: '', notes: '' });
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
      await axios.delete(`/api/commissions/${id}`);
      fetchData();
    } catch (err) {
      alert('خطأ في الحذف');
    }
  };

  const commissionAmount = (parseFloat(form.salePrice) || 0) - (parseFloat(form.purchasePrice) || 0);

  const printHeaders = ['#', 'المندوب', 'التاريخ', 'البيان', 'رقم الفاتورة', 'سعر البيع', 'سعر الشراء', 'العمولة'];
  const printData = commissions.map((c, i) => [
    i + 1,
    c.salesRep?.name || '',
    formatDate(c.date),
    c.description,
    c.invoiceNumber || '',
    formatNum(c.salePrice),
    formatNum(c.purchasePrice),
    formatNum(c.commission)
  ]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">عمولة المناديب</h1>
          <p className="text-gray-500 text-sm">تتبع عمولات المبيعات</p>
        </div>
        <div className="flex items-center gap-3">
          <PrintButton
            title="تقرير عمولات المناديب"
            headers={printHeaders}
            data={printData}
            filename="commissions"
            summaryRows={[{ label: 'إجمالي العمولات', value: formatNum(totalCommission) }]}
          />
          {isAccountant() && (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة عمولة
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-orange-500 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">إجمالي العمولات</p>
          <p className="text-3xl font-bold mt-1">{formatNum(totalCommission)}</p>
        </div>
        <div className="bg-green-500 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">إجمالي المبيعات</p>
          <p className="text-3xl font-bold mt-1">
            {formatNum(commissions.reduce((s, c) => s + c.salePrice, 0))}
          </p>
        </div>
        <div className="bg-blue-500 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90">عدد الفواتير</p>
          <p className="text-3xl font-bold mt-1">{commissions.length}</p>
        </div>
      </div>

      {/* Summary by Sales Rep */}
      {summary.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4">ملخص العمولات بالمندوب</h2>
          <div className="overflow-x-auto">
            <table className="table-arabic">
              <thead>
                <tr>
                  <th>المندوب</th>
                  <th>عدد الفواتير</th>
                  <th>إجمالي المبيعات</th>
                  <th>إجمالي التكلفة</th>
                  <th>إجمالي العمولة</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s, i) => (
                  <tr key={i}>
                    <td className="font-semibold">{s.salesRepName}</td>
                    <td>{s.count}</td>
                    <td className="text-green-600 font-medium">{formatNum(s.totalSales)}</td>
                    <td className="text-red-600 font-medium">{formatNum(s.totalPurchases)}</td>
                    <td className="text-orange-600 font-bold">{formatNum(s.totalCommission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">المندوب:</label>
          <select value={filter.salesRepId} onChange={(e) => setFilter({...filter, salesRepId: e.target.value})} className="input-field w-40">
            <option value="">الكل</option>
            {salesReps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">من:</label>
          <input type="date" value={filter.from} onChange={(e) => setFilter({...filter, from: e.target.value})} className="input-field w-36" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">إلى:</label>
          <input type="date" value={filter.to} onChange={(e) => setFilter({...filter, to: e.target.value})} className="input-field w-36" />
        </div>
        <button onClick={fetchData} className="btn-primary text-sm py-2">بحث</button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">تفاصيل العمولات ({commissions.length})</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-arabic">
              <thead>
                <tr>
                  <th>#</th>
                  <th>المندوب</th>
                  <th>التاريخ</th>
                  <th>البيان</th>
                  <th>رقم الفاتورة</th>
                  <th>سعر البيع</th>
                  <th>سعر الشراء</th>
                  <th>العمولة</th>
                  {isAccountant() && <th>إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {commissions.length === 0 ? (
                  <tr><td colSpan="9" className="py-8 text-gray-400">لا توجد بيانات</td></tr>
                ) : commissions.map((c, i) => (
                  <tr key={c.id}>
                    <td>{i + 1}</td>
                    <td className="font-semibold">{c.salesRep?.name}</td>
                    <td>{formatDate(c.date)}</td>
                    <td className="text-right">{c.description}</td>
                    <td>{c.invoiceNumber || '-'}</td>
                    <td className="text-green-600 font-medium">{formatNum(c.salePrice)}</td>
                    <td className="text-red-600 font-medium">{formatNum(c.purchasePrice)}</td>
                    <td className="text-orange-600 font-bold">{formatNum(c.commission)}</td>
                    {isAccountant() && (
                      <td>
                        <button onClick={() => handleDelete(c.id)} className="btn-danger text-xs py-1 px-2">حذف</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {commissions.length > 0 && (
                <tfoot>
                  <tr className="bg-orange-50 font-bold">
                    <td colSpan="5" className="text-right text-orange-800">الإجماليات</td>
                    <td className="text-green-700">{formatNum(commissions.reduce((s, c) => s + c.salePrice, 0))}</td>
                    <td className="text-red-700">{formatNum(commissions.reduce((s, c) => s + c.purchasePrice, 0))}</td>
                    <td className="text-orange-700 text-lg">{formatNum(totalCommission)}</td>
                    {isAccountant() && <td></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="إضافة عمولة جديدة">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المندوب *</label>
            <select value={form.salesRepId} onChange={(e) => setForm({...form, salesRepId: e.target.value})} className="input-field" required>
              <option value="">اختر المندوب</option>
              {salesReps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الفاتورة</label>
              <input type="text" value={form.invoiceNumber} onChange={(e) => setForm({...form, invoiceNumber: e.target.value})} className="input-field" placeholder="INV-001" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البيان *</label>
            <input type="text" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع</label>
              <input type="number" value={form.salePrice} onChange={(e) => setForm({...form, salePrice: e.target.value})} className="input-field" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر الشراء (التكلفة)</label>
              <input type="number" value={form.purchasePrice} onChange={(e) => setForm({...form, purchasePrice: e.target.value})} className="input-field" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          {(form.salePrice || form.purchasePrice) && (
            <div className={`p-3 rounded-lg ${commissionAmount >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-sm font-semibold ${commissionAmount >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                العمولة المحسوبة: {formatNum(commissionAmount)}
              </p>
            </div>
          )}
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
