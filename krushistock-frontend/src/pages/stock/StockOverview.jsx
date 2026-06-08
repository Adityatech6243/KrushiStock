import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStockOverview, getStockMovements } from '../../services/stockService';
import Table from '../../components/common/Table';
import { formatCurrency, formatNumber, formatDate } from '../../utils/helpers';
import { Package, TrendingUp, AlertTriangle, Activity } from 'lucide-react';

const StockOverview = () => {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalValue: 0,
    totalItems: 0,
    lowStockItems: 0
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Movements state
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [movementsPagination, setMovementsPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    fetchStockOverview(pagination.page);
  }, [pagination.page]);

  useEffect(() => {
    fetchMovements(movementsPagination.page);
  }, [movementsPagination.page]);

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

  const fetchMovements = async (page = 1) => {
    setMovementsLoading(true);
    try {
      const response = await getStockMovements(page, 10);
      setMovements(response.data);
      setMovementsPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching stock movements:', error);
    } finally {
      setMovementsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleMovementsPageChange = (newPage) => {
    setMovementsPagination(prev => ({ ...prev, page: newPage }));
  };

  const columns = [
    {
      header: 'Product',
      accessor: 'product',
      render: (row) => (
        <div className="flex flex-col">
          <div className="font-semibold text-slate-800 text-sm">{row.product?.name}</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{row.product?.category?.name || 'Category'}</div>
        </div>
      )
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      render: (row) => (
        <span className="font-bold text-slate-700">
          {formatNumber(row.quantity)} <span className="text-slate-400 font-semibold text-xs">{row.unit}</span>
        </span>
      )
    },
    {
      header: 'Unit Price',
      accessor: 'price',
      render: (row) => (
        <span className="font-medium text-slate-500">{formatCurrency(row.price)}</span>
      )
    },
    {
      header: 'Total Value',
      accessor: 'value',
      render: (row) => (
        <span className="font-bold text-slate-900">{formatCurrency(row.value || row.quantity * row.price)}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const isLowStock = row.quantity <= (row.reorderLevel || 10);
        return (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isLowStock
                ? 'bg-rose-50 text-rose-700 border-rose-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}
          >
            {isLowStock ? 'Low Stock' : 'In Stock'}
          </span>
        );
      }
    }
  ];

  const movementColumns = [
    {
      header: 'Date',
      accessor: 'createdAt',
      render: (row) => formatDate(row.createdAt)
    },
    {
      header: 'Product',
      accessor: 'product',
      render: (row) => row.product?.name || 'Deleted Product'
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (row) => {
        const type = row.type || 'adjustment';
        let badgeClass = '';
        switch (type) {
          case 'purchase':
          case 'purchase_update':
            badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
            break;
          case 'sale':
          case 'sale_update':
            badgeClass = 'bg-blue-50 text-blue-700 border-blue-100';
            break;
          case 'disposal':
            badgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
            break;
          case 'correction':
            badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
            break;
          case 'purchase_delete':
          case 'sale_delete':
          case 'purchase_update_reversal':
          case 'sale_update_reversal':
            badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
            break;
          default:
            badgeClass = 'bg-primary-50 text-primary-700 border-primary-100';
        }
        const formattedType = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${badgeClass}`}>
            {formattedType}
          </span>
        );
      }
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      render: (row) => {
        const isPositive = row.quantity > 0;
        return (
          <span className={`font-bold text-sm ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositive ? '+' : ''}{formatNumber(row.quantity)}
          </span>
        );
      }
    },
    {
      header: 'Prev / New',
      render: (row) => (
        <span className="text-xs text-slate-500 font-medium">
          {formatNumber(row.previousQuantity)} → {formatNumber(row.newQuantity)}
        </span>
      )
    },
    {
      header: 'Reference',
      accessor: 'referenceNumber',
      render: (row) => row.referenceNumber || 'N/A'
    },
    {
      header: 'Note',
      accessor: 'note',
      render: (row) => <span className="text-slate-500 text-xs italic">{row.note || 'N/A'}</span>
    },
    {
      header: 'User',
      accessor: 'createdBy',
      render: (row) => row.createdBy?.name || 'System'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Stock Inventory Overview</h1>
        <p className="text-slate-500 text-xs md:text-sm">Real-time status of available agricultural stocks and capital distribution.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Stock Value</span>
            <div className="text-2xl font-black text-slate-800">
              {formatCurrency(summary.totalValue)}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <TrendingUp size={20} className="stroke-[2.5]" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Items</span>
            <div className="text-2xl font-black text-slate-800">
              {formatNumber(summary.totalItems)}
            </div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Package size={20} className="stroke-[2.5]" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Low Stock Items</span>
            <div className="text-2xl font-black text-rose-600">
              {formatNumber(summary.lowStockItems)}
            </div>
            <Link to="/stock/low-stock" className="text-xs font-semibold text-rose-600 hover:text-rose-800 inline-block mt-1">
              View Low Stock Alerts →
            </Link>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
            <AlertTriangle size={20} className="stroke-[2.5]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-5 md:p-6 shadow-soft space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Inventory Status List</h2>
        <Table columns={columns} data={stockData} loading={loading} pagination={pagination} onPageChange={handlePageChange} />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-5 md:p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Activity size={18} className="text-primary-600 stroke-[2.2]" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Stock Movements</h2>
        </div>
        <Table columns={movementColumns} data={movements} loading={movementsLoading} pagination={movementsPagination} onPageChange={handleMovementsPageChange} />
      </div>
    </div>
  );
};

export default StockOverview;
