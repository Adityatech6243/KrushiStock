import React, { useState } from 'react';
import { getStockReport } from '../../services/reportService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';
import { formatCurrency, formatNumber } from '../../utils/helpers';
import { Printer, Download, Search, Calendar, Filter, Package, DollarSign } from 'lucide-react';

const StockReport = () => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: ''
  });
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalValue: 0,
    totalQuantity: 0
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const generateReport = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getStockReport({ ...filters, page, limit: 10 });
      setReportData(response.data.items);
      setSummary(response.data.summary);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    generateReport(newPage);
  };

  const columns = [
    { header: 'Product Name', accessor: 'product', render: (row) => <span className="font-bold text-slate-800">{row.product}</span> },
    { header: 'Category', accessor: 'category', render: (row) => <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">{row.category}</span> },
    {
      header: 'Opening Stock',
      accessor: 'openingStock',
      render: (row) => <span className="font-semibold">{formatNumber(row.openingStock)}</span>
    },
    {
      header: 'Purchases (+)',
      accessor: 'purchases',
      render: (row) => <span className="text-emerald-600 font-bold">+{formatNumber(row.purchases)}</span>
    },
    {
      header: 'Sales (-)',
      accessor: 'sales',
      render: (row) => <span className="text-rose-600 font-bold">-{formatNumber(row.sales)}</span>
    },
    {
      header: 'Closing Stock',
      accessor: 'closingStock',
      render: (row) => <span className="font-black text-slate-800">{formatNumber(row.closingStock)}</span>
    },
    {
      header: 'Estimated Value',
      accessor: 'value',
      render: (row) => <span className="font-black text-slate-900">{formatCurrency(row.value)}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Print-only Header */}
      <div className="hidden print:block mb-8 text-center border-b border-slate-300 pb-5">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">KrushiStock</h1>
        <h2 className="text-lg font-bold text-slate-600 mt-1">Stock Valuation & Inventory Report</h2>
        <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
        {(filters.startDate || filters.endDate) && (
          <p className="text-xs text-slate-500 font-bold mt-2 bg-slate-50 py-1 border rounded-lg">
            Period: {filters.startDate || 'Beginning'} to {filters.endDate || 'Present'}
          </p>
        )}
      </div>

      {/* Screen Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Package className="text-primary-600" size={24} />
            Stock Report
          </h1>
          <p className="text-slate-500 text-xs md:text-sm">Generate real-time stock flow, ledger statements, and overall asset valuations.</p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5 print:hidden space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
          <Filter size={14} className="text-slate-400" />
          Filter Criteria
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
          <Input
            label="Category Name"
            type="text"
            name="category"
            value={filters.category}
            onChange={handleChange}
            placeholder="e.g. Fertilizers"
          />
          <div className="flex items-end">
            <Button 
              variant="primary" 
              onClick={() => generateReport(1)} 
              className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5"
            >
              <Search size={14} className="stroke-[2.5]" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader size="md" />
        </div>
      )}

      {!loading && reportData.length > 0 && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Value */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-emerald-500 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Total Inventory Assets</span>
                <div className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(summary.totalValue)}</div>
              </div>
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <DollarSign size={20} className="stroke-[2.5]" />
              </div>
            </div>

            {/* Total Quantity */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-slate-500 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Quantity Count</span>
                <div className="text-2xl font-black text-slate-800 mt-1">{formatNumber(summary.totalQuantity)}</div>
              </div>
              <div className="p-3.5 bg-slate-50 text-slate-650 rounded-xl border border-slate-150">
                <Package size={20} className="stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-soft overflow-hidden">
            <Table columns={columns} data={reportData} pagination={pagination} onPageChange={handlePageChange} />
          </div>

          {/* Buttons Footer */}
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Button 
              variant="secondary" 
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-bold py-2"
            >
              <Printer size={14} className="stroke-[2.5]" />
              Print Report
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                // Mock Excel Export action
                alert("Stock report data exported to CSV successfully.");
              }}
              className="flex items-center gap-1.5 text-xs font-semibold py-2"
            >
              <Download size={14} className="stroke-[2]" />
              Export to CSV
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockReport;
