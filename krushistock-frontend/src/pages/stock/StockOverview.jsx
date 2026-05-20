import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStockOverview } from '../../services/stockService';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';
import { formatCurrency, formatNumber } from '../../utils/helpers';

const StockOverview = () => {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalValue: 0,
    totalItems: 0,
    lowStockItems: 0
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    fetchStockOverview(pagination.page);
  }, [pagination.page]);

  const fetchStockOverview = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getStockOverview(page, 10);
      setStockData(response.data.items);
      setSummary(response.data.summary);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching stock overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const columns = [
    {
      header: 'Product',
      accessor: 'product',
      render: (row) => (
        <div>
          <div className="font-medium">{row.product?.name}</div>
          <div className="text-xs text-gray-500">{row.product?.category?.name}</div>
        </div>
      )
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      render: (row) => `${formatNumber(row.quantity)} ${row.unit}`
    },
    {
      header: 'Unit Price',
      accessor: 'price',
      render: (row) => formatCurrency(row.price)
    },
    {
      header: 'Total Value',
      accessor: 'value',
      render: (row) => formatCurrency(row.value || row.quantity * row.price)
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const isLowStock = row.quantity <= (row.reorderLevel || 10);
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              isLowStock
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {isLowStock ? 'Low Stock' : 'In Stock'}
          </span>
        );
      }
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Stock Overview</h1>
        <p className="text-gray-600">Current inventory status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-2">Total Stock Value</div>
          <div className="text-2xl font-bold text-gray-800">
            {formatCurrency(summary.totalValue)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-2">Total Items</div>
          <div className="text-2xl font-bold text-gray-800">
            {formatNumber(summary.totalItems)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-2">Low Stock Items</div>
          <div className="text-2xl font-bold text-red-600">
            {formatNumber(summary.lowStockItems)}
          </div>
          <Link to="/stock/low-stock" className="text-sm text-blue-600 hover:underline">
            View Details →
          </Link>
        </div>
      </div>

      <Table columns={columns} data={stockData} pagination={pagination} onPageChange={handlePageChange} />
    </div>
  );
};

export default StockOverview;
