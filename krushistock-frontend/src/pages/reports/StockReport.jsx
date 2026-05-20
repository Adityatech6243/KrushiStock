import React, { useState } from 'react';
import { getStockReport } from '../../services/reportService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';
import { formatCurrency, formatNumber } from '../../utils/helpers';

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
    { header: 'Product', accessor: 'product' },
    { header: 'Category', accessor: 'category' },
    {
      header: 'Opening Stock',
      accessor: 'openingStock',
      render: (row) => formatNumber(row.openingStock)
    },
    {
      header: 'Purchases',
      accessor: 'purchases',
      render: (row) => formatNumber(row.purchases)
    },
    {
      header: 'Sales',
      accessor: 'sales',
      render: (row) => formatNumber(row.sales)
    },
    {
      header: 'Closing Stock',
      accessor: 'closingStock',
      render: (row) => formatNumber(row.closingStock)
    },
    {
      header: 'Value',
      accessor: 'value',
      render: (row) => formatCurrency(row.value)
    }
  ];

  return (
    <div>
      {/* Print-only Header */}
      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">KrushiStock</h1>
        <h2 className="text-xl font-semibold text-gray-600 mt-2">Stock Inventory Report</h2>
        <p className="text-sm text-gray-500 mt-1">Generated on: {new Date().toLocaleDateString()}</p>
        {(filters.startDate || filters.endDate) && (
          <p className="text-sm text-gray-500">
            Period: {filters.startDate || 'Beginning'} to {filters.endDate || 'Present'}
          </p>
        )}
      </div>

      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-800">Stock Report</h1>
        <p className="text-gray-600">Generate stock movement and valuation reports</p>
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
            label="Category"
            type="text"
            name="category"
            value={filters.category}
            onChange={handleChange}
            placeholder="Filter by category"
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
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Total Stock Value</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalValue)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Total Quantity</div>
              <div className="text-2xl font-bold text-gray-800">
                {formatNumber(summary.totalQuantity)}
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

export default StockReport;
