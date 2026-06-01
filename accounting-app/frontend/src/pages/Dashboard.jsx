import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const formatNum = (n) => {
  if (n == null) return '0.00';
  return Number(n).toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [cashRes, bankRes, plRes] = await Promise.all([
          axios.get('/api/cash/transactions'),
          axios.get('/api/bank/transactions'),
          axios.get('/api/reports/balance-sheet')
        ]);
        setStats({
          cashBalance: cashRes.data.currentBalance,
          bankBalance: bankRes.data.currentBalance,
          assets: plRes.data.assets,
          liabilities: plRes.data.liabilities,
          equity: plRes.data.equity
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    {
      title: 'رصيد الخزينة',
      value: stats?.cashBalance,
      color: 'bg-green-600',
      icon: '💰',
      link: '/cash'
    },
    {
      title: 'رصيد البنك',
      value: stats?.bankBalance,
      color: 'bg-blue-600',
      icon: '🏦',
      link: '/bank'
    },
    {
      title: 'إجمالي الأصول',
      value: stats?.assets?.total,
      color: 'bg-purple-600',
      icon: '📊',
      link: '/reports'
    },
    {
      title: 'صافي حقوق الملكية',
      value: stats?.equity?.net,
      color: 'bg-orange-600',
      icon: '📈',
      link: '/reports'
    }
  ];

  const quickLinks = [
    { path: '/cash', label: 'الخزينة', desc: 'إدارة المدفوعات النقدية', icon: '💵' },
    { path: '/bank', label: 'المصرف', desc: 'المعاملات البنكية', icon: '🏦' },
    { path: '/contacts?type=CUSTOMER', label: 'العملاء', desc: 'كشوف حسابات العملاء', icon: '👥' },
    { path: '/contacts?type=SUPPLIER', label: 'الموردين', desc: 'حسابات الموردين', icon: '🏭' },
    { path: '/contacts?type=SALES_REP', label: 'المناديب', desc: 'حسابات المناديب', icon: '👤' },
    { path: '/commissions', label: 'العمولات', desc: 'تتبع عمولات المبيعات', icon: '💹' },
    { path: '/journal', label: 'القيود', desc: 'القيود المحاسبية', icon: '📒' },
    { path: '/reports', label: 'التقارير', desc: 'التقارير المالية', icon: '📊' }
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('ar-LY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <Link to={card.link} key={i}>
            <div className={`${card.color} rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">{card.title}</p>
                  {loading ? (
                    <div className="h-8 w-24 bg-white bg-opacity-30 rounded animate-pulse mt-2"></div>
                  ) : (
                    <p className="text-2xl font-bold mt-1">{formatNum(card.value)}</p>
                  )}
                </div>
                <span className="text-3xl">{card.icon}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-800 mb-4">الوصول السريع</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map((link, i) => (
            <Link
              key={i}
              to={link.path}
              className="p-4 border border-green-100 rounded-xl hover:bg-green-50 hover:border-green-300 transition-all group"
            >
              <div className="text-2xl mb-2">{link.icon}</div>
              <h3 className="font-semibold text-gray-700 group-hover:text-green-700 text-sm">{link.label}</h3>
              <p className="text-xs text-gray-400 mt-1">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Balance Summary */}
      {stats && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">ملخص المركز المالي</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 rounded-xl p-4">
              <h3 className="text-green-700 font-bold mb-3">الأصول</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">النقدية:</span>
                  <span className="font-semibold">{formatNum(stats.assets.cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">البنك:</span>
                  <span className="font-semibold">{formatNum(stats.assets.bank)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">المدينون:</span>
                  <span className="font-semibold">{formatNum(stats.assets.receivables)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-green-700">
                  <span>الإجمالي:</span>
                  <span>{formatNum(stats.assets.total)}</span>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-4">
              <h3 className="text-red-700 font-bold mb-3">الخصوم</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">الدائنون:</span>
                  <span className="font-semibold">{formatNum(stats.liabilities.payables)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-red-700">
                  <span>الإجمالي:</span>
                  <span>{formatNum(stats.liabilities.total)}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="text-blue-700 font-bold mb-3">حقوق الملكية</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-t pt-2 font-bold text-blue-700">
                  <span>الصافي:</span>
                  <span>{formatNum(stats.equity.net)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
