import React, { useState } from 'react';
import { getPurchaseReport } from '../../services/reportService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';
import { formatDate, formatCurrency, formatNumber } from '../../utils/helpers';

const PurchaseReport = () => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    supplier: ''
  });
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalPurchases: 0,
    totalTransactions: 0,
    pendingPayments: 0
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
      const response = await getPurchaseReport({ ...filters, page, limit: 10 });
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
    {
      header: 'Date',
      accessor: 'date',
      render: (row) => formatDate(row.date)
    },
    { header: 'Purchase #', accessor: 'purchaseNumber' },
    { header: 'Supplier', accessor: 'supplier' },
    {
      header: 'Items',
      accessor: 'items',
      render: (row) => formatNumber(row.items)
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      render: (row) => formatNumber(row.quantity)
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (row) => formatCurrency(row.amount)
    },
    {
      header: 'Payment Status',
      accessor: 'paymentStatus',
      render: (row) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            row.paymentStatus === 'Paid'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {row.paymentStatus}
        </span>
      )
    }
  ];

  return (
    <div>
      {/* Print-only Header */}
      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">KrushiStock</h1>
        <h2 className="text-xl font-semibold text-gray-600 mt-2">Purchase & Payment Report</h2>
        <p className="text-sm text-gray-500 mt-1">Generated on: {new Date().toLocaleDateString()}</p>
        {(filters.startDate || filters.endDate) && (
          <p className="text-sm text-gray-500">
            Period: {filters.startDate || 'Beginning'} to {filters.endDate || 'Present'}
          </p>
        )}
      </div>

      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-800">Purchase Report</h1>
        <p className="text-gray-600">Generate purchase and payment reports</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6 print:hidden">
        <h3 className="text-lg font-semibold mb-4">Report Filters</h3>
        <div className="grid grid-cols-4 gap-4">
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
            label="Supplier"
            type="text"
            name="supplier"
            value={filters.supplier}
            onChange={handleChange}
            placeholder="Filter by supplier"
          />
          <div className="flex items-end">
            <Button variant="primary" onClick={() => generateReport(1)} className="w-full">
              Generate Report
            </Button>
          </div>
        </div>
      </div>

      {loading && <Loader />}

      {!loading && reportData.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Total Purchases</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.totalPurchases)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Total Transactions</div>
              <div className="text-2xl font-bold text-gray-800">
                {formatNumber(summary.totalTransactions)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Pending Payments</div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.pendingPayments)}
              </div>
            </div>
          </div>

          <Table columns={columns} data={reportData} pagination={pagination} onPageChange={handlePageChange} />

          <div className="mt-6 flex gap-3 print:hidden">
            <Button variant="secondary" onClick={() => window.print()}>
              Print Report
            </Button>
            <Button variant="outline" onClick={() => console.log('Export to Excel')}>
              Export to Excel
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default PurchaseReport;
