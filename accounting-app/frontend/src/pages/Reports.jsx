import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PrintButton from '../components/PrintButton';

const formatNum = (n) => Number(n || 0).toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-LY') : '';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('pl');
  const [plData, setPlData] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const fetchPL = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reports/profit-loss', { params: filter });
      setPlData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reports/general-ledger', { params: filter });
      setLedgerData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reports/balance-sheet');
      setBalanceSheet(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pl') fetchPL();
    else if (activeTab === 'ledger') fetchLedger();
    else if (activeTab === 'balance') fetchBalanceSheet();
  }, [activeTab]);

  const tabs = [
    { id: 'pl', label: 'قائمة الأرباح والخسائر' },
    { id: 'ledger', label: 'دفتر الأستاذ العام' },
    { id: 'balance', label: 'الميزانية العمومية' }
  ];

  const plPrintHeaders = ['البند', 'المبلغ'];
  const plPrintData = plData ? [
    ['إيرادات المبيعات', formatNum(plData.totalSales)],
    ['إجمالي العمولات', formatNum(plData.totalCommissions)],
    ['إجمالي الإيرادات', formatNum(plData.totalIncome)],
    ['إجمالي المشتريات', formatNum(plData.totalPurchases)],
    ['إجمالي المصروفات', formatNum(plData.totalExpenses)],
    ['صافي الربح / الخسارة', formatNum(plData.netProfit)]
  ] : [];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التقارير المالية</h1>
          <p className="text-gray-500 text-sm">التحليل المالي والتقارير</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-gray-200 pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-transparent hover:bg-green-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      {activeTab !== 'balance' && (
        <div className="card flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">من:</label>
            <input type="date" value={filter.from} onChange={(e) => setFilter({...filter, from: e.target.value})} className="input-field w-36" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">إلى:</label>
            <input type="date" value={filter.to} onChange={(e) => setFilter({...filter, to: e.target.value})} className="input-field w-36" />
          </div>
          <button
            onClick={() => { if (activeTab === 'pl') fetchPL(); else fetchLedger(); }}
            className="btn-primary text-sm py-2"
          >
            تحديث
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mr-3"></div>
          <span className="text-gray-500">جاري التحميل...</span>
        </div>
      )}

      {/* P&L Report */}
      {activeTab === 'pl' && plData && !loading && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PrintButton
              title="قائمة الأرباح والخسائر"
              headers={plPrintHeaders}
              data={plPrintData}
              filename="profit-loss"
              summaryRows={[{ label: 'صافي الربح', value: formatNum(plData.netProfit) }]}
            />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-500 text-white rounded-xl p-4">
              <p className="text-sm opacity-90">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold mt-1">{formatNum(plData.totalIncome)}</p>
            </div>
            <div className="bg-red-500 text-white rounded-xl p-4">
              <p className="text-sm opacity-90">إجمالي المصروفات</p>
              <p className="text-2xl font-bold mt-1">{formatNum(plData.totalExpenses)}</p>
            </div>
            <div className="bg-orange-500 text-white rounded-xl p-4">
              <p className="text-sm opacity-90">إجمالي العمولات</p>
              <p className="text-2xl font-bold mt-1">{formatNum(plData.totalCommissions)}</p>
            </div>
            <div className={`${plData.netProfit >= 0 ? 'bg-blue-600' : 'bg-red-700'} text-white rounded-xl p-4`}>
              <p className="text-sm opacity-90">{plData.netProfit >= 0 ? 'صافي الربح' : 'صافي الخسارة'}</p>
              <p className="text-2xl font-bold mt-1">{formatNum(Math.abs(plData.netProfit))}</p>
            </div>
          </div>

          {/* P&L Statement */}
          <div className="card">
            <h2 className="text-xl font-bold text-green-700 text-center mb-6 pb-3 border-b">
              قائمة الأرباح والخسائر
              <p className="text-sm font-normal text-gray-500 mt-1">
                من {formatDate(plData.from)} إلى {formatDate(plData.to)}
              </p>
            </h2>

            <div className="space-y-4">
              {/* Income Section */}
              <div>
                <h3 className="bg-green-700 text-white px-4 py-2 rounded-lg font-semibold mb-2">الإيرادات</h3>
                <div className="space-y-2 pr-4">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">إيرادات المبيعات</span>
                    <span className="font-semibold text-green-600">{formatNum(plData.totalSales)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">عمولات المناديب</span>
                    <span className="font-semibold text-green-600">{formatNum(plData.totalCommissions)}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-green-50 px-3 rounded font-bold">
                    <span className="text-green-800">إجمالي الإيرادات</span>
                    <span className="text-green-700 text-lg">{formatNum(plData.totalIncome)}</span>
                  </div>
                </div>
              </div>

              {/* Expenses Section */}
              <div>
                <h3 className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold mb-2">المصروفات والتكاليف</h3>
                <div className="space-y-2 pr-4">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">تكلفة البضاعة المباعة</span>
                    <span className="font-semibold text-red-600">{formatNum(plData.totalPurchases)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">المصروفات التشغيلية</span>
                    <span className="font-semibold text-red-600">{formatNum(plData.totalExpenses - plData.totalPurchases)}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-red-50 px-3 rounded font-bold">
                    <span className="text-red-800">إجمالي المصروفات</span>
                    <span className="text-red-700 text-lg">{formatNum(plData.totalExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* Net Result */}
              <div className={`flex justify-between p-4 rounded-xl font-bold text-lg ${plData.netProfit >= 0 ? 'bg-blue-600 text-white' : 'bg-red-700 text-white'}`}>
                <span>{plData.netProfit >= 0 ? 'صافي الربح' : 'صافي الخسارة'}</span>
                <span className="text-xl">{formatNum(Math.abs(plData.netProfit))}</span>
              </div>
            </div>
          </div>

          {/* Income entries detail */}
          {plData.incomeEntries && plData.incomeEntries.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="bg-green-700 p-3">
                <h3 className="text-white font-semibold">تفاصيل الإيرادات</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="table-arabic">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>البيان</th>
                      <th>رقم القيد</th>
                      <th>النوع</th>
                      <th>المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plData.incomeEntries.map((e, i) => (
                      <tr key={i}>
                        <td>{formatDate(e.date)}</td>
                        <td className="text-right">{e.description}</td>
                        <td className="font-mono">{e.entryNumber}</td>
                        <td>مبيعات</td>
                        <td className="text-green-600 font-semibold">{formatNum(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* General Ledger */}
      {activeTab === 'ledger' && ledgerData && !loading && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PrintButton
              title="دفتر الأستاذ العام"
              headers={['الحساب', 'التاريخ', 'القيد', 'مدين', 'دائن']}
              data={ledgerData.accounts.flatMap(acc =>
                acc.entries.map(e => [acc.accountName, formatDate(e.date), e.entryNumber, formatNum(e.debit), formatNum(e.credit)])
              )}
              filename="general-ledger"
            />
          </div>
          {ledgerData.accounts.length === 0 ? (
            <div className="card text-center text-gray-400 py-12">لا توجد بيانات للفترة المحددة</div>
          ) : (
            ledgerData.accounts.map((acc, i) => (
              <div key={i} className="card overflow-hidden p-0">
                <div className="bg-green-700 p-3 flex justify-between items-center">
                  <h3 className="text-white font-semibold">{acc.accountName}</h3>
                  <div className="text-green-200 text-sm">
                    م: {formatNum(acc.totalDebit)} | د: {formatNum(acc.totalCredit)} | ص: {formatNum(acc.totalDebit - acc.totalCredit)}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="table-arabic">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>البيان</th>
                        <th>رقم القيد</th>
                        <th>البيان التفصيلي</th>
                        <th>مدين</th>
                        <th>دائن</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acc.entries.map((e, j) => (
                        <tr key={j}>
                          <td>{formatDate(e.date)}</td>
                          <td className="text-right">{e.description}</td>
                          <td className="font-mono text-green-700">{e.entryNumber}</td>
                          <td className="text-gray-500">{e.lineDescription || '-'}</td>
                          <td className="text-blue-600 font-medium">{e.debit > 0 ? formatNum(e.debit) : '-'}</td>
                          <td className="text-green-600 font-medium">{e.credit > 0 ? formatNum(e.credit) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-semibold text-sm">
                        <td colSpan="4" className="text-right px-3 py-2">الإجمالي</td>
                        <td className="text-blue-700 text-center">{formatNum(acc.totalDebit)}</td>
                        <td className="text-green-700 text-center">{formatNum(acc.totalCredit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Balance Sheet */}
      {activeTab === 'balance' && balanceSheet && !loading && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PrintButton
              title="الميزانية العمومية"
              headers={['البند', 'المبلغ']}
              data={[
                ['النقدية', formatNum(balanceSheet.assets.cash)],
                ['البنك', formatNum(balanceSheet.assets.bank)],
                ['المدينون', formatNum(balanceSheet.assets.receivables)],
                ['إجمالي الأصول', formatNum(balanceSheet.assets.total)],
                ['الدائنون', formatNum(balanceSheet.liabilities.payables)],
                ['إجمالي الخصوم', formatNum(balanceSheet.liabilities.total)],
                ['صافي حقوق الملكية', formatNum(balanceSheet.equity.net)]
              ]}
              filename="balance-sheet"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="card">
              <h2 className="text-lg font-bold text-green-700 border-b pb-3 mb-4">الأصول</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">النقدية في الخزينة</span>
                  <span className="font-semibold">{formatNum(balanceSheet.assets.cash)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">الرصيد البنكي</span>
                  <span className="font-semibold">{formatNum(balanceSheet.assets.bank)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">حسابات القبض (العملاء)</span>
                  <span className="font-semibold">{formatNum(balanceSheet.assets.receivables)}</span>
                </div>
                <div className="flex justify-between py-3 bg-green-50 px-3 rounded-lg font-bold">
                  <span className="text-green-800">إجمالي الأصول</span>
                  <span className="text-green-700 text-lg">{formatNum(balanceSheet.assets.total)}</span>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-4">
              <div className="card">
                <h2 className="text-lg font-bold text-red-600 border-b pb-3 mb-4">الخصوم</h2>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">حسابات الدفع (الموردون)</span>
                    <span className="font-semibold">{formatNum(balanceSheet.liabilities.payables)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-red-50 px-3 rounded-lg font-bold">
                    <span className="text-red-800">إجمالي الخصوم</span>
                    <span className="text-red-700 text-lg">{formatNum(balanceSheet.liabilities.total)}</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h2 className="text-lg font-bold text-blue-600 border-b pb-3 mb-4">حقوق الملكية</h2>
                <div className="flex justify-between py-3 bg-blue-50 px-3 rounded-lg font-bold">
                  <span className="text-blue-800">صافي حقوق الملكية</span>
                  <span className="text-blue-700 text-lg">{formatNum(balanceSheet.equity.net)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
