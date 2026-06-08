import React, { useState, useEffect } from 'react';
import { 
  getAdvancedProfitReport, 
  getAdvancedSupplierPerformance, 
  getAdvancedFarmerCreditLedger, 
  getAdvancedTaxGstReport,
  exportReport
} from '../../services/reportService';
import { getStoreSettings } from '../../services/settingsService';
import { getUserInfo } from '../../utils/auth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';
import Select from '../../components/common/Select';
import { formatCurrency, formatNumber } from '../../utils/helpers';
import { 
  Printer, 
  Download, 
  Search, 
  Filter, 
  TrendingUp, 
  DollarSign, 
  Factory, 
  Users, 
  Percent, 
  Scale, 
  Lock, 
  ShieldAlert, 
  Calendar 
} from 'lucide-react';

const AdvancedReports = () => {
  const userInfo = getUserInfo();
  const isAdmin = userInfo?.role === 'admin';

  const [activeTab, setActiveTab] = useState(isAdmin ? 'profit' : 'credit');
  const [storeSettings, setStoreSettings] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '' // used in credit ledger
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printData, setPrintData] = useState(null);

  // Report States
  const [profitData, setProfitData] = useState(null);
  const [supplierData, setSupplierData] = useState(null);
  const [creditData, setCreditData] = useState(null);
  const [taxData, setTaxData] = useState(null);

  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        const res = await getStoreSettings();
        if (res?.success && res?.data) {
          setStoreSettings(res.data);
        }
      } catch (err) {
        console.error('Error fetching store settings:', err);
      }
    };
    fetchStoreSettings();
  }, []);

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const generateReport = async () => {
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      if (end < start) {
        showError('Invalid Date Range', 'End date must be greater than or equal to start date.');
        return;
      }
    }

    setLoading(true);
    try {
      if (activeTab === 'profit' && isAdmin) {
        const res = await getAdvancedProfitReport(filters);
        setProfitData(res.data);
      } else if (activeTab === 'supplier') {
        const res = await getAdvancedSupplierPerformance(filters);
        setSupplierData(res.data);
      } else if (activeTab === 'credit') {
        const res = await getAdvancedFarmerCreditLedger(filters);
        setCreditData(res.data);
      } else if (activeTab === 'tax' && isAdmin) {
        const res = await getAdvancedTaxGstReport(filters);
        setTaxData(res.data);
      }
    } catch (err) {
      console.error(`Error loading report for tab ${activeTab}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [activeTab, filters.status]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      let dataToPrint = null;
      if (activeTab === 'profit' && isAdmin) {
        const res = await getAdvancedProfitReport({ ...filters, limit: 100000 });
        dataToPrint = res.data;
      } else if (activeTab === 'supplier') {
        const res = await getAdvancedSupplierPerformance({ ...filters, limit: 100000 });
        dataToPrint = res.data;
      } else if (activeTab === 'credit') {
        const res = await getAdvancedFarmerCreditLedger({ ...filters, limit: 100000 });
        dataToPrint = res.data;
      } else if (activeTab === 'tax' && isAdmin) {
        const res = await getAdvancedTaxGstReport({ ...filters, limit: 100000 });
        dataToPrint = res.data;
      }
      setPrintData(dataToPrint);
    } catch (err) {
      console.error('Error fetching print data:', err);
      setPrinting(false);
    }
  };

  useEffect(() => {
    if (printing && printData) {
      const timer = setTimeout(() => {
        window.print();
        setPrinting(false);
        setPrintData(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [printing, printData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportReport(activeTab, filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeTab}-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  // --- TAB 1: PROFIT & MARGIN ---
  const profitProductColumns = [
    { header: 'Product Name', accessor: 'productName', render: (row) => <span className="font-bold text-slate-800">{row.productName}</span> },
    { header: 'Category', accessor: 'category', render: (row) => <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{row.category}</span> },
    { header: 'Qty Sold', accessor: 'quantitySold', render: (row) => <span className="font-semibold">{formatNumber(row.quantitySold)}</span> },
    { header: 'Revenue', accessor: 'revenue', render: (row) => <span className="font-semibold text-slate-800">{formatCurrency(row.revenue)}</span> },
    { header: 'Estimated COGS', accessor: 'cogs', render: (row) => <span className="text-slate-500">{formatCurrency(row.cogs)}</span> },
    { header: 'Gross Profit', accessor: 'profit', render: (row) => <span className={`font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(row.profit)}</span> },
    { header: 'Margin (%)', accessor: 'margin', render: (row) => <span className={`font-black ${row.margin >= 15 ? 'text-emerald-700' : 'text-slate-700'}`}>{row.margin.toFixed(1)}%</span> }
  ];

  const profitCategoryColumns = [
    { header: 'Category Name', accessor: 'categoryName', render: (row) => <span className="font-bold text-slate-800">{row.categoryName}</span> },
    { header: 'Revenue', accessor: 'revenue', render: (row) => <span className="font-semibold text-slate-800">{formatCurrency(row.revenue)}</span> },
    { header: 'Estimated COGS', accessor: 'cogs', render: (row) => <span className="text-slate-500">{formatCurrency(row.cogs)}</span> },
    { header: 'Gross Profit', accessor: 'profit', render: (row) => <span className={`font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(row.profit)}</span> },
    { header: 'Margin (%)', accessor: 'margin', render: (row) => <span className="font-black text-slate-700">{row.margin.toFixed(1)}%</span> }
  ];

  // --- TAB 2: SUPPLIER PERFORMANCE ---
  const supplierColumns = [
    { header: 'Supplier Name', accessor: 'supplierName', render: (row) => <span className="font-bold text-slate-800">{row.supplierName}</span> },
    { header: 'Phone / GSTIN', accessor: 'phone', render: (row) => <div className="text-xs text-slate-500"><div>{row.phone}</div><div className="text-[10px] font-semibold text-slate-400">GST: {row.gst}</div></div> },
    { header: 'Orders Count', accessor: 'orderCount', render: (row) => <span className="font-semibold">{row.orderCount} purchases</span> },
    { header: 'Total Volume', accessor: 'purchaseVolume', render: (row) => <span className="font-black text-slate-800">{formatCurrency(row.purchaseVolume)}</span> },
    { header: 'Liabilities', accessor: 'outstandingLiabilities', render: (row) => <span className={`font-bold ${row.outstandingLiabilities > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{formatCurrency(row.outstandingLiabilities)}</span> },
    { header: 'Items Supplied', accessor: 'suppliedProducts', render: (row) => <span className="text-xs text-slate-600 font-medium max-w-xs truncate block">{row.suppliedProducts.join(', ') || 'None'}</span> },
    { header: 'Last Order', accessor: 'lastPurchaseDate', render: (row) => <span className="text-xs text-slate-400 font-semibold">{row.lastPurchaseDate ? new Date(row.lastPurchaseDate).toLocaleDateString('en-IN') : 'N/A'}</span> }
  ];

  // --- TAB 3: FARMER CREDIT LEDGER ---
  const creditColumns = [
    { header: 'Farmer Name', accessor: 'farmerName', render: (row) => <span className="font-bold text-slate-800">{row.farmerName}</span> },
    { header: 'Phone & Village', accessor: 'phone', render: (row) => <div className="text-xs text-slate-500"><div>{row.phone}</div><div className="text-[10px] font-semibold text-slate-400">{row.village}</div></div> },
    { header: 'Total Purchases', accessor: 'totalPurchases', render: (row) => <span className="font-semibold">{formatCurrency(row.totalPurchases)}</span> },
    { header: 'Amount Paid', accessor: 'amountPaid', render: (row) => <span className="text-emerald-600 font-medium">{formatCurrency(row.amountPaid)}</span> },
    { header: 'Balance Due', accessor: 'amountDue', render: (row) => <span className={`font-black ${row.amountDue > 0 ? 'text-amber-600' : 'text-slate-850'}`}>{formatCurrency(row.amountDue)}</span> },
    { header: 'Overdue Amount', accessor: 'overdueAmount', render: (row) => <span className={`font-bold ${row.overdueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{row.overdueAmount > 0 ? formatCurrency(row.overdueAmount) : '—'}</span> },
    { header: 'Overdue Count', accessor: 'overdueCount', render: (row) => <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${row.overdueCount > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'text-slate-400'}`}>{row.overdueCount > 0 ? `${row.overdueCount} bills` : 'None'}</span> },
    { header: 'Last Bill Date', accessor: 'lastSaleDate', render: (row) => <span className="text-xs text-slate-400 font-semibold">{row.lastSaleDate ? new Date(row.lastSaleDate).toLocaleDateString('en-IN') : 'N/A'}</span> }
  ];

  // --- TAB 4: TAX / GST ---
  const taxColumns = [
    { header: 'Month Period', accessor: 'month', render: (row) => <span className="font-bold text-slate-800">{row.month}</span> },
    { header: 'GST Collected (Sales)', accessor: 'gstCollected', render: (row) => <span className="font-semibold text-slate-800">{formatCurrency(row.gstCollected)}</span> },
    { header: 'GST Paid (Purchases)', accessor: 'gstPaid', render: (row) => <span className="font-semibold text-slate-650">{formatCurrency(row.gstPaid)}</span> },
    { header: 'Net Liability / Credit', accessor: 'netLiability', render: (row) => <span className={`font-black ${row.netLiability >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{row.netLiability >= 0 ? `Pay: ${formatCurrency(row.netLiability)}` : `Credit: ${formatCurrency(Math.abs(row.netLiability))}`}</span> }
  ];

  // Tab configurations
  const tabs = [
    { id: 'profit', label: 'Profit & Margin', icon: TrendingUp, adminOnly: true },
    { id: 'supplier', label: 'Supplier Performance', icon: Factory, adminOnly: false },
    { id: 'credit', label: 'Farmer Credit Ledger', icon: Users, adminOnly: false },
    { id: 'tax', label: 'Tax / GST (ITC)', icon: Scale, adminOnly: true }
  ];

  const filteredTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      {/* Print-only Header */}
      {printData && (
        <div className="hidden print:block mb-6 text-center border-b border-slate-350 pb-4">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            {storeSettings?.organizationName || 'Mahalaxmi Sheti Seva Kendra'}
          </h1>
          <p className="text-xs text-slate-700 font-bold mt-1">
            {storeSettings?.address || 'Hasur Khurd, Tal. Kagal, Dist. Kolhapur, Maharashtra - 416218'}
          </p>
          <p className="text-xs text-slate-600 font-semibold mt-0.5">
            Phone: {storeSettings?.phone || '7820974939'} | Email: {storeSettings?.email || 'info@krushistock.com'}
            {storeSettings?.gst && ` | GSTIN: ${storeSettings.gst}`}
          </p>
          <div className="mt-4 border-t border-dashed border-slate-200 pt-3">
            <h2 className="text-md font-bold text-slate-800 uppercase tracking-wide">
              Advanced Report: {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
            </p>
          </div>
          {(filters.startDate || filters.endDate) && (
            <p className="text-[10px] text-slate-500 font-bold mt-2 bg-slate-50 py-1 border rounded-lg max-w-md mx-auto">
              Period: {filters.startDate || 'Beginning'} to {filters.endDate || 'Present'}
            </p>
          )}
        </div>
      )}

      {/* Screen Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 print:hidden gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Scale className="text-primary-600" size={24} />
            Advanced Reporting
          </h1>
          <p className="text-slate-500 text-xs md:text-sm">
            Inspect detailed profit margins, supplier performance metrics, aging credit ledgers, and input tax credit accounts.
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 overflow-x-auto print:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isLocked = tab.adminOnly && !isAdmin;
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (!isLocked) {
                  setActiveTab(tab.id);
                }
              }}
              disabled={isLocked}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                isSelected
                  ? 'border-primary-600 text-primary-600 font-extrabold'
                  : isLocked
                  ? 'border-transparent text-slate-300 cursor-not-allowed'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={14} className={isLocked ? 'text-slate-350' : ''} />
              {tab.label}
              {isLocked && <Lock size={10} className="text-slate-400" />}
            </button>
          );
        })}
      </div>

      {/* Shared Filters Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5 print:hidden space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
          <Filter size={14} className="text-slate-400" />
          Filter Settings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <Input
            label="Start Date"
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleChange}
          />
          <Input
            label="End Date"
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleChange}
          />
          {activeTab === 'credit' ? (
            <Select
              label="Credit Status"
              name="status"
              value={filters.status}
              onChange={handleChange}
              options={[
                { value: '', label: 'All Credit Accounts' },
                { value: 'active', label: 'Active Balance Outstanding' },
                { value: 'overdue', label: 'Overdue Bills Only' }
              ]}
            />
          ) : (
            <div className="hidden md:block"></div>
          )}
          <Button 
            variant="primary" 
            onClick={generateReport} 
            className="flex items-center justify-center gap-2 text-xs font-bold py-2.5 w-full"
          >
            <Search size={14} className="stroke-[2.5]" />
            Reload Report
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader size="md" />
        </div>
      )}

      {/* Main Content Render */}
      {!loading && (
        <div className="space-y-6">
          {/* TAB 1: PROFIT & MARGIN */}
          {activeTab === 'profit' && isAdmin && profitData && (
            <div className="space-y-6 animate-fadeIn">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-primary-500">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Sales Revenue</span>
                  <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(profitData.summary.totalRevenue)}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-slate-400">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Estimated COGS</span>
                  <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(profitData.summary.totalCOGS)}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-emerald-500">
                  <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Gross Profit</span>
                  <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(profitData.summary.totalProfit)}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-amber-500">
                  <span className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">Total Profit Margin</span>
                  <div className="text-xl font-black text-slate-800 mt-1">{profitData.summary.profitMargin.toFixed(2)}%</div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-soft overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Category Performance</h3>
                </div>
                <Table columns={profitCategoryColumns} data={profitData.categories} />
              </div>

              {/* Product Breakdown */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-soft overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Product Profitability Breakdown</h3>
                </div>
                <Table columns={profitProductColumns} data={profitData.items} />
              </div>
            </div>
          )}

          {/* TAB 2: SUPPLIER PERFORMANCE */}
          {activeTab === 'supplier' && supplierData && (
            <div className="space-y-6 animate-fadeIn">
              {/* Summary Cards */}
              {isAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-primary-500">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Active Suppliers</span>
                    <div className="text-xl font-black text-slate-800 mt-1">{supplierData.summary.totalSuppliers}</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-emerald-500">
                    <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Total Purchase Volume</span>
                    <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(supplierData.summary.totalPurchaseVolume)}</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-amber-500">
                    <span className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">Outstanding Liabilities</span>
                    <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(supplierData.summary.totalOutstanding)}</div>
                  </div>
                </div>
              )}

              {/* Supplier Table */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-soft overflow-hidden">
                <Table columns={supplierColumns} data={supplierData.items} />
              </div>
            </div>
          )}

          {/* TAB 3: FARMER CREDIT LEDGER */}
          {activeTab === 'credit' && creditData && (
            <div className="space-y-6 animate-fadeIn">
              {/* Summary Cards */}
              {isAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-primary-500">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Credit Accounts</span>
                    <div className="text-xl font-black text-slate-800 mt-1">{creditData.summary.farmersWithBalance} farmers</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-amber-500">
                    <span className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">Outstanding Balance Due</span>
                    <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(creditData.summary.totalOutstandingCredit)}</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-rose-500">
                    <span className="text-rose-600 text-[10px] font-bold uppercase tracking-wider">Total Overdue Credits</span>
                    <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(creditData.summary.totalOverdueAmount)}</div>
                  </div>
                </div>
              )}

              {/* Credit Table */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-soft overflow-hidden">
                <Table columns={creditColumns} data={creditData.items} />
              </div>
            </div>
          )}

          {/* TAB 4: TAX / GST */}
          {activeTab === 'tax' && isAdmin && taxData && (
            <div className="space-y-6 animate-fadeIn">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-primary-500">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">GST Collected (Sales)</span>
                  <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(taxData.summary.totalGstCollected)}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-slate-400">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">GST Paid (ITC Credits)</span>
                  <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(taxData.summary.totalGstPaid)}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-emerald-500">
                  <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Net Tax Liability / Refund</span>
                  <div className="text-xl font-black text-slate-800 mt-1">
                    {taxData.summary.netTaxLiability >= 0 
                      ? `Liability: ${formatCurrency(taxData.summary.netTaxLiability)}` 
                      : `Credit: ${formatCurrency(Math.abs(taxData.summary.netTaxLiability))}`}
                  </div>
                </div>
              </div>

              {/* Tax Table */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-soft overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Monthly Tax Ledger Mappings</h3>
                </div>
                <Table columns={taxColumns} data={taxData.items} />
              </div>
            </div>
          )}

          {/* Locked / Forbidden Non-Admin view */}
          {((activeTab === 'profit' || activeTab === 'tax') && !isAdmin) && (
            <div className="bg-white rounded-xl border border-slate-150 p-12 text-center shadow-soft flex flex-col items-center justify-center space-y-4 animate-fadeIn">
              <div className="p-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-full">
                <ShieldAlert size={40} className="stroke-[2.5]" />
              </div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">Access Denied</h2>
              <p className="text-sm text-slate-500 max-w-md leading-relaxed">
                Profit statistics and Tax/GST audits are restricted to store administrators. Please contact your manager to request access.
              </p>
            </div>
          )}

          {/* Action buttons */}
          {(!((activeTab === 'profit' || activeTab === 'tax') && !isAdmin)) && (
            <div className="flex flex-wrap gap-3 mt-4 print:hidden">
              <Button 
                variant="secondary" 
                onClick={handlePrint}
                disabled={printing}
                className="flex items-center gap-1.5 text-xs font-bold py-2"
              >
                <Printer size={14} className="stroke-[2.5]" />
                {printing ? 'Preparing Print...' : 'Print Report'}
              </Button>
              <Button 
                variant="outline" 
                disabled={exporting}
                onClick={handleExport}
                className="flex items-center gap-1.5 text-xs font-semibold py-2"
              >
                <Download size={14} className="stroke-[2]" />
                {exporting ? 'Exporting...' : 'Export to CSV'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Print-only layout render */}
      {printData && (
        <div className="hidden print:block w-full">
          {activeTab === 'profit' && (
            <div className="space-y-6">
              <div className="border border-slate-300 p-4 rounded mb-4">
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div><strong>Total Sales:</strong> {formatCurrency(printData.summary.totalRevenue)}</div>
                  <div><strong>Total COGS:</strong> {formatCurrency(printData.summary.totalCOGS)}</div>
                  <div><strong>Gross Profit:</strong> {formatCurrency(printData.summary.totalProfit)}</div>
                  <div><strong>Profit Margin:</strong> {printData.summary.profitMargin.toFixed(2)}%</div>
                </div>
              </div>
              <h3 className="font-bold text-sm mb-2 uppercase">Product Profitability Breakdown</h3>
              <table className="min-w-full text-xs text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-350 font-bold">
                    <th className="px-3 py-1.5 border border-slate-300">Product Name</th>
                    <th className="px-3 py-1.5 border border-slate-300">Category</th>
                    <th className="px-3 py-1.5 border border-slate-300">Qty Sold</th>
                    <th className="px-3 py-1.5 border border-slate-300">Revenue</th>
                    <th className="px-3 py-1.5 border border-slate-300">COGS</th>
                    <th className="px-3 py-1.5 border border-slate-300">Profit</th>
                    <th className="px-3 py-1.5 border border-slate-300">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.items.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="px-3 py-1 border border-slate-200 font-bold">{row.productName}</td>
                      <td className="px-3 py-1 border border-slate-200">{row.category}</td>
                      <td className="px-3 py-1 border border-slate-200">{row.quantitySold}</td>
                      <td className="px-3 py-1 border border-slate-200">{formatCurrency(row.revenue)}</td>
                      <td className="px-3 py-1 border border-slate-200">{formatCurrency(row.cogs)}</td>
                      <td className="px-3 py-1 border border-slate-200 font-bold">{formatCurrency(row.profit)}</td>
                      <td className="px-3 py-1 border border-slate-200 font-bold">{row.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'supplier' && (
            <div className="space-y-6">
              <h3 className="font-bold text-sm mb-2 uppercase">Supplier Performance Audits</h3>
              <table className="min-w-full text-xs text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-350 font-bold">
                    <th className="px-3 py-1.5 border border-slate-300">Supplier Name</th>
                    <th className="px-3 py-1.5 border border-slate-300">Phone</th>
                    <th className="px-3 py-1.5 border border-slate-300">GSTIN</th>
                    <th className="px-3 py-1.5 border border-slate-300">Orders</th>
                    <th className="px-3 py-1.5 border border-slate-300">Volume</th>
                    <th className="px-3 py-1.5 border border-slate-300">Liabilities</th>
                    <th className="px-3 py-1.5 border border-slate-300">Last Order Date</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.items.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="px-3 py-1 border border-slate-200 font-bold">{row.supplierName}</td>
                      <td className="px-3 py-1 border border-slate-200">{row.phone}</td>
                      <td className="px-3 py-1 border border-slate-200">{row.gst}</td>
                      <td className="px-3 py-1 border border-slate-200">{row.orderCount}</td>
                      <td className="px-3 py-1 border border-slate-200 font-bold">{formatCurrency(row.purchaseVolume)}</td>
                      <td className="px-3 py-1 border border-slate-200 font-bold text-amber-600">{formatCurrency(row.outstandingLiabilities)}</td>
                      <td className="px-3 py-1 border border-slate-200">{row.lastPurchaseDate ? new Date(row.lastPurchaseDate).toLocaleDateString('en-IN') : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'credit' && (
            <div className="space-y-6">
              <h3 className="font-bold text-sm mb-2 uppercase">Farmer Credit Ledger Aging Report</h3>
              <table className="min-w-full text-xs text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-350 font-bold">
                    <th className="px-3 py-1.5 border border-slate-300">Farmer Name</th>
                    <th className="px-3 py-1.5 border border-slate-300">Phone</th>
                    <th className="px-3 py-1.5 border border-slate-300">Village</th>
                    <th className="px-3 py-1.5 border border-slate-300">Purchases</th>
                    <th className="px-3 py-1.5 border border-slate-300">Amount Paid</th>
                    <th className="px-3 py-1.5 border border-slate-300">Outstanding</th>
                    <th className="px-3 py-1.5 border border-slate-300">Overdue Amount</th>
                    <th className="px-3 py-1.5 border border-slate-300">Overdue count</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.items.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="px-3 py-1 border border-slate-200 font-bold">{row.farmerName}</td>
                      <td className="px-3 py-1 border border-slate-200">{row.phone}</td>
                      <td className="px-3 py-1 border border-slate-200">{row.village}</td>
                      <td className="px-3 py-1 border border-slate-200">{formatCurrency(row.totalPurchases)}</td>
                      <td className="px-3 py-1 border border-slate-200">{formatCurrency(row.amountPaid)}</td>
                      <td className="px-3 py-1 border border-slate-200 font-bold">{formatCurrency(row.amountDue)}</td>
                      <td className="px-3 py-1 border border-slate-200 font-bold text-rose-600">{formatCurrency(row.overdueAmount)}</td>
                      <td className="px-3 py-1 border border-slate-200">{row.overdueCount} bills</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-6">
              <div className="border border-slate-300 p-4 rounded mb-4">
                <div className="grid grid-cols-3 gap-4 text-xs font-bold">
                  <div>GST Collected (Sales): {formatCurrency(printData.summary.totalGstCollected)}</div>
                  <div>GST Paid (Purchases): {formatCurrency(printData.summary.totalGstPaid)}</div>
                  <div>
                    Net Tax Liability: {printData.summary.netTaxLiability >= 0 
                      ? formatCurrency(printData.summary.netTaxLiability)
                      : `Refund: ${formatCurrency(Math.abs(printData.summary.netTaxLiability))}`}
                  </div>
                </div>
              </div>
              <h3 className="font-bold text-sm mb-2 uppercase">Monthly Tax Breakdown Mappings</h3>
              <table className="min-w-full text-xs text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-350 font-bold">
                    <th className="px-3 py-1.5 border border-slate-300">Month</th>
                    <th className="px-3 py-1.5 border border-slate-300">GST Collected</th>
                    <th className="px-3 py-1.5 border border-slate-300">GST Paid</th>
                    <th className="px-3 py-1.5 border border-slate-300">Net Liability</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.items.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="px-3 py-1 border border-slate-200 font-bold">{row.month}</td>
                      <td className="px-3 py-1 border border-slate-200">{formatCurrency(row.gstCollected)}</td>
                      <td className="px-3 py-1 border border-slate-200">{formatCurrency(row.gstPaid)}</td>
                      <td className="px-3 py-1 border border-slate-200 font-bold">{formatCurrency(row.netLiability)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedReports;
