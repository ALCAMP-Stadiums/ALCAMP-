import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import PrintButton from '../components/PrintButton';
import { useAuth } from '../contexts/AuthContext';

const formatNum = (n) => Number(n || 0).toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-LY') : '';

const entryTypes = {
  PURCHASE: 'مشتريات',
  SALE: 'مبيعات',
  EXPENSE: 'مصروفات',
  OTHER: 'أخرى'
};

const typeColors = {
  PURCHASE: 'bg-blue-100 text-blue-700',
  SALE: 'bg-green-100 text-green-700',
  EXPENSE: 'bg-red-100 text-red-700',
  OTHER: 'bg-gray-100 text-gray-700'
};

export default function Journal() {
  const { isAccountant } = useAuth();
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [filter, setFilter] = useState({ from: '', to: '', type: '' });
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    type: 'OTHER',
    lines: [
      { accountName: '', description: '', debit: '', credit: '' },
      { accountName: '', description: '', debit: '', credit: '' }
    ]
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesRes, accountsRes] = await Promise.all([
        axios.get('/api/journal/entries', { params: filter }),
        axios.get('/api/journal/accounts')
      ]);
      setEntries(entriesRes.data);
      setAccounts(accountsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const addLine = () => setForm({ ...form, lines: [...form.lines, { accountName: '', description: '', debit: '', credit: '' }] });
  const removeLine = (idx) => {
    if (form.lines.length <= 2) return;
    setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) });
  };
  const updateLine = (idx, field, value) => {
    const lines = [...form.lines];
    lines[idx] = { ...lines[idx], [field]: value };
    setForm({ ...form, lines });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isBalanced) return setError('مجموع المدين يجب أن يساوي مجموع الدائن');
    if (form.lines.some(l => !l.accountName)) return setError('يجب إدخال اسم الحساب لكل سطر');
    setSubmitting(true);
    setError('');
    try {
      await axios.post('/api/journal/entries', form);
      setShowModal(false);
      setForm({
        date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        type: 'OTHER',
        lines: [
          { accountName: '', description: '', debit: '', credit: '' },
          { accountName: '', description: '', debit: '', credit: '' }
        ]
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا القيد؟')) return;
    try {
      await axios.delete(`/api/journal/entries/${id}`);
      fetchData();
    } catch (err) {
      alert('خطأ في الحذف');
    }
  };

  const printHeaders = ['رقم القيد', 'التاريخ', 'البيان', 'النوع', 'مجموع المدين', 'مجموع الدائن'];
  const printData = entries.map(e => [
    e.entryNumber,
    formatDate(e.date),
    e.description,
    entryTypes[e.type] || e.type,
    formatNum(e.lines.reduce((s, l) => s + l.debit, 0)),
    formatNum(e.lines.reduce((s, l) => s + l.credit, 0))
  ]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">القيود المحاسبية</h1>
          <p className="text-gray-500 text-sm">دفتر اليومية العامة</p>
        </div>
        <div className="flex items-center gap-3">
          <PrintButton
            title="القيود المحاسبية"
            headers={printHeaders}
            data={printData}
            filename="journal-entries"
          />
          {isAccountant() && (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              قيد جديد
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">النوع:</label>
          <select value={filter.type} onChange={(e) => setFilter({...filter, type: e.target.value})} className="input-field w-36">
            <option value="">الكل</option>
            {Object.entries(entryTypes).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
        <button onClick={() => { setFilter({ from: '', to: '', type: '' }); setTimeout(fetchData, 0); }} className="btn-secondary text-sm py-2">إعادة تعيين</button>
      </div>

      {/* Entries Table */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">القيود المحاسبية ({entries.length})</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-arabic">
              <thead>
                <tr>
                  <th>رقم القيد</th>
                  <th>التاريخ</th>
                  <th>البيان</th>
                  <th>المرجع</th>
                  <th>النوع</th>
                  <th>مجموع المدين</th>
                  <th>مجموع الدائن</th>
                  <th>التفاصيل</th>
                  {isAccountant() && <th>إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan="9" className="py-8 text-gray-400">لا توجد قيود</td></tr>
                ) : entries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <tr>
                      <td className="font-mono font-semibold text-green-700">{entry.entryNumber}</td>
                      <td>{formatDate(entry.date)}</td>
                      <td className="text-right">{entry.description}</td>
                      <td>{entry.reference || '-'}</td>
                      <td>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeColors[entry.type] || typeColors.OTHER}`}>
                          {entryTypes[entry.type] || entry.type}
                        </span>
                      </td>
                      <td className="text-blue-600 font-semibold">
                        {formatNum(entry.lines.reduce((s, l) => s + l.debit, 0))}
                      </td>
                      <td className="text-green-600 font-semibold">
                        {formatNum(entry.lines.reduce((s, l) => s + l.credit, 0))}
                      </td>
                      <td>
                        <button
                          onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {expandedEntry === entry.id ? 'إخفاء' : 'عرض'}
                        </button>
                      </td>
                      {isAccountant() && (
                        <td>
                          <button onClick={() => handleDelete(entry.id)} className="btn-danger text-xs py-1 px-2">حذف</button>
                        </td>
                      )}
                    </tr>
                    {expandedEntry === entry.id && (
                      <tr>
                        <td colSpan="9" className="bg-gray-50 p-0">
                          <div className="p-3">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-200">
                                  <th className="p-2 border border-gray-300">الحساب</th>
                                  <th className="p-2 border border-gray-300">البيان</th>
                                  <th className="p-2 border border-gray-300">مدين</th>
                                  <th className="p-2 border border-gray-300">دائن</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entry.lines.map((line, li) => (
                                  <tr key={li} className="bg-white">
                                    <td className="p-2 border border-gray-300 text-right">{line.accountName}</td>
                                    <td className="p-2 border border-gray-300 text-right">{line.description || '-'}</td>
                                    <td className="p-2 border border-gray-300 text-center text-blue-600">
                                      {line.debit > 0 ? formatNum(line.debit) : '-'}
                                    </td>
                                    <td className="p-2 border border-gray-300 text-center text-green-600">
                                      {line.credit > 0 ? formatNum(line.credit) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Journal Entry Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="قيد محاسبي جديد" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
              <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="input-field">
                {Object.entries(entryTypes).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المرجع</label>
              <input type="text" value={form.reference} onChange={(e) => setForm({...form, reference: e.target.value})} className="input-field" placeholder="رقم المرجع" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البيان *</label>
            <input type="text" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="input-field" required />
          </div>

          {/* Journal Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">سطور القيد *</label>
              <div className={`text-sm font-semibold ${isBalanced ? 'text-green-600' : 'text-red-500'}`}>
                {isBalanced ? '✓ القيد متوازن' : `الفرق: ${formatNum(Math.abs(totalDebit - totalCredit))}`}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-right font-medium">الحساب</th>
                    <th className="p-2 text-right font-medium">البيان</th>
                    <th className="p-2 text-center font-medium">مدين</th>
                    <th className="p-2 text-center font-medium">دائن</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="p-1">
                        <input
                          type="text"
                          list={`accounts-${idx}`}
                          value={line.accountName}
                          onChange={(e) => updateLine(idx, 'accountName', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-right text-sm focus:outline-none focus:border-green-400"
                          placeholder="اسم الحساب"
                          required
                        />
                        <datalist id={`accounts-${idx}`}>
                          {accounts.map(a => <option key={a.id} value={a.name}>{a.code} - {a.name}</option>)}
                        </datalist>
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLine(idx, 'description', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-right text-sm focus:outline-none focus:border-green-400"
                          placeholder="البيان"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="number"
                          value={line.debit}
                          onChange={(e) => updateLine(idx, 'debit', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:border-green-400"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="number"
                          value={line.credit}
                          onChange={(e) => updateLine(idx, 'credit', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:border-green-400"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="p-1">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="text-red-400 hover:text-red-600"
                          disabled={form.lines.length <= 2}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr className="font-semibold">
                    <td colSpan="2" className="p-2 text-right text-gray-600">الإجمالي</td>
                    <td className="p-2 text-center text-blue-700">{formatNum(totalDebit)}</td>
                    <td className="p-2 text-center text-green-700">{formatNum(totalCredit)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button type="button" onClick={addLine} className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة سطر
            </button>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={submitting || !isBalanced} className="btn-primary disabled:opacity-50">
              {submitting ? 'جاري الحفظ...' : 'حفظ القيد'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
