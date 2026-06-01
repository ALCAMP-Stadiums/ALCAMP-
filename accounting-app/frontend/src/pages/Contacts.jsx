import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const formatNum = (n) => Number(n || 0).toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const typeLabels = {
  CUSTOMER: 'العملاء المدينون',
  SUPPLIER: 'الموردين',
  SALES_REP: 'المناديب',
  PARTNER: 'الشركاء'
};

const typeColors = {
  CUSTOMER: 'bg-blue-600',
  SUPPLIER: 'bg-purple-600',
  SALES_REP: 'bg-orange-600',
  PARTNER: 'bg-green-600'
};

export default function Contacts() {
  const { isAccountant } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const typeParam = params.get('type') || 'CUSTOMER';

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', type: typeParam, openingBalance: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/contacts', { params: { type: typeParam } });
      setContacts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    setForm(f => ({ ...f, type: typeParam }));
  }, [typeParam]);

  const openAdd = () => {
    setEditContact(null);
    setForm({ name: '', phone: '', type: typeParam, openingBalance: '', notes: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (contact) => {
    setEditContact(contact);
    setForm({
      name: contact.name,
      phone: contact.phone || '',
      type: contact.type,
      openingBalance: contact.openingBalance,
      notes: contact.notes || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return setError('الاسم مطلوب');
    setSubmitting(true);
    setError('');
    try {
      if (editContact) {
        await axios.put(`/api/contacts/${editContact.id}`, form);
      } else {
        await axios.post('/api/contacts', form);
      }
      setShowModal(false);
      fetchContacts();
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await axios.delete(`/api/contacts/${id}`);
      fetchContacts();
    } catch (err) {
      alert('خطأ في الحذف');
    }
  };

  const filtered = contacts.filter(c =>
    c.name.includes(search) || (c.phone && c.phone.includes(search))
  );

  const color = typeColors[typeParam] || 'bg-green-600';
  const label = typeLabels[typeParam] || 'جهات الاتصال';

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{label}</h1>
          <p className="text-gray-500 text-sm">إجمالي: {contacts.length} حساب</p>
        </div>
        {isAccountant() && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة {typeParam === 'CUSTOMER' ? 'عميل' : typeParam === 'SUPPLIER' ? 'مورد' : typeParam === 'SALES_REP' ? 'مندوب' : 'شريك'}
          </button>
        )}
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(typeLabels).map(([type, lbl]) => (
          <button
            key={type}
            onClick={() => navigate(`/contacts?type=${type}`)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              typeParam === type
                ? 'bg-green-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-green-50'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card flex items-center gap-3">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="بحث بالاسم أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border-none outline-none text-sm"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className={`${color} p-4`}>
          <h2 className="font-bold text-white">{label} ({filtered.length})</h2>
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
                  <th>#</th>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>الرصيد الافتتاحي</th>
                  <th>ملاحظات</th>
                  <th>كشف الحساب</th>
                  {isAccountant() && <th>إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="7" className="py-8 text-gray-400">لا توجد بيانات</td></tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td>{i + 1}</td>
                    <td className="font-semibold text-gray-800 text-right">{c.name}</td>
                    <td>{c.phone || '-'}</td>
                    <td className={`font-bold ${c.openingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatNum(c.openingBalance)}
                    </td>
                    <td className="text-gray-500 text-xs">{c.notes || '-'}</td>
                    <td>
                      <Link
                        to={`/contacts/${c.id}/ledger`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        عرض الكشف
                      </Link>
                    </td>
                    {isAccountant() && (
                      <td className="space-x-2 space-x-reverse">
                        <button onClick={() => openEdit(c)} className="bg-yellow-400 hover:bg-yellow-500 text-white text-xs py-1 px-2 rounded">تعديل</button>
                        <button onClick={() => handleDelete(c.id)} className="btn-danger text-xs py-1 px-2">حذف</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editContact ? 'تعديل' : `إضافة ${typeParam === 'CUSTOMER' ? 'عميل' : typeParam === 'SUPPLIER' ? 'مورد' : typeParam === 'SALES_REP' ? 'مندوب' : 'شريك'}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الرصيد الافتتاحي</label>
            <input type="number" value={form.openingBalance} onChange={(e) => setForm({...form, openingBalance: e.target.value})} className="input-field" placeholder="0.00" step="0.01" />
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
