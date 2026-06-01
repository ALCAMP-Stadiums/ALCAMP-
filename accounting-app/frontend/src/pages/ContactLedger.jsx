import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import PrintButton from '../components/PrintButton';
import { useAuth } from '../contexts/AuthContext';

const formatNum = (n) => Number(n || 0).toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-LY') : '';

const typeLabels = {
  CUSTOMER: 'عميل',
  SUPPLIER: 'مورد',
  SALES_REP: 'مندوب',
  PARTNER: 'شريك'
};

export default function ContactLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAccountant } = useAuth();

  const [contact, setContact] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    invoiceNumber: '',
    debit: '',
    credit: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/contacts/${id}/transactions`);
      setContact(res.data.contact);
      setTransactions(res.data.transactions);
      setCurrentBalance(res.data.currentBalance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description) return setError('البيان مطلوب');
    if (!form.debit && !form.credit) return setError('أدخل مدين أو دائن');
    setSubmitting(true);
    setError('');
    try {
      await axios.post(`/api/contacts/${id}/transactions`, form);
      setShowModal(false);
      setForm({ date: new Date().toISOString().split('T')[0], description: '', invoiceNumber: '', debit: '', credit: '', notes: '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (txId) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await axios.delete(`/api/contacts/${id}/transactions/${txId}`);
      fetchData();
    } catch (err) {
      alert('خطأ في الحذف');
    }
  };

  const printHeaders = ['#', 'التاريخ', 'البيان', 'رقم الفاتورة', 'مدين', 'دائن', 'الرصيد', 'ملاحظات'];
  const printData = transactions.map((tx, i) => [
    i + 1,
    formatDate(tx.date),
    tx.description,
    tx.invoiceNumber || '',
    tx.debit > 0 ? formatNum(tx.debit) : '',
    tx.credit > 0 ? formatNum(tx.credit) : '',
    formatNum(tx.balance),
    tx.notes || ''
  ]);

  const debitLabel = contact?.type === 'CUSTOMER' ? 'مدين (على العميل)' : 'مدين';
  const creditLabel = contact?.type === 'CUSTOMER' ? 'دائن (للعميل)' : 'دائن';

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
    </div>
  );

  if (!contact) return (
    <div className="text-center py-20 text-gray-400">لم يتم العثور على الحساب</div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <svg className="w-5 h-5 text-gray-600 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">{contact.name}</h1>
            <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              {typeLabels[contact.type] || contact.type}
            </span>
          </div>
          {contact.phone && <p className="text-gray-500 text-sm mt-1">{contact.phone}</p>}
        </div>
        <div className="flex items-center gap-3">
          <PrintButton
            title={`كشف حساب - ${contact.name}`}
            headers={printHeaders}
            data={printData}
            filename={`ledger-${contact.name}`}
            summaryRows={[
              { label: 'الرصيد الافتتاحي', value: formatNum(contact.openingBalance) },
              { label: 'الرصيد الحالي', value: formatNum(currentBalance) }
            ]}
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

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-600">الرصيد الافتتاحي</p>
          <p className="text-2xl font-bold text-gray-700 mt-1">{formatNum(contact.openingBalance)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-blue-600">إجمالي المدين</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {formatNum(transactions.reduce((s, t) => s + t.debit, 0))}
          </p>
        </div>
        <div className={`${currentBalance >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-xl p-4`}>
          <p className={`text-sm ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>الرصيد الحالي</p>
          <p className={`text-2xl font-bold mt-1 ${currentBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatNum(currentBalance)}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card overflow-hidden p-0">
        <div className="bg-green-700 p-4">
          <h2 className="font-bold text-white">كشف حساب: {contact.name} ({transactions.length} معاملة)</h2>
        </div>

        {/* Opening balance row */}
        {contact.openingBalance !== 0 && (
          <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-100 text-sm flex justify-between">
            <span className="text-yellow-700 font-medium">رصيد افتتاحي</span>
            <span className="font-bold text-yellow-700">{formatNum(contact.openingBalance)}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="table-arabic">
            <thead>
              <tr>
                <th>#</th>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>رقم الفاتورة</th>
                <th>مدين</th>
                <th>دائن</th>
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
                  <td>{tx.invoiceNumber || '-'}</td>
                  <td className="text-blue-600 font-semibold">{tx.debit > 0 ? formatNum(tx.debit) : '-'}</td>
                  <td className="text-green-600 font-semibold">{tx.credit > 0 ? formatNum(tx.credit) : '-'}</td>
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
                <tr className="bg-green-50 font-bold">
                  <td colSpan="4" className="text-right text-green-800">الإجماليات</td>
                  <td className="text-blue-700">{formatNum(transactions.reduce((s, t) => s + t.debit, 0))}</td>
                  <td className="text-green-700">{formatNum(transactions.reduce((s, t) => s + t.credit, 0))}</td>
                  <td className={`text-lg ${currentBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatNum(currentBalance)}</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`إضافة حركة - ${contact.name}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{debitLabel}</label>
              <input type="number" value={form.debit} onChange={(e) => setForm({...form, debit: e.target.value, credit: ''})} className="input-field" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{creditLabel}</label>
              <input type="number" value={form.credit} onChange={(e) => setForm({...form, credit: e.target.value, debit: ''})} className="input-field" placeholder="0.00" min="0" step="0.01" />
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
