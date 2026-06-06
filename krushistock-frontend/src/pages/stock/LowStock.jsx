import React, { useState, useEffect } from 'react';
import { getLowStockProducts } from '../../services/stockService';
import Table from '../../components/common/Table';
import { formatNumber } from '../../utils/helpers';
import { AlertTriangle, CheckCircle2, Phone, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

const LowStock = () => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    fetchLowStockProducts(pagination.page);
  }, [pagination.page]);

  const fetchLowStockProducts = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getLowStockProducts(page, 10);
      setLowStockItems(response.data);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching low stock products:', error);
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
        <div className="flex flex-col">
          <div className="font-semibold text-slate-800 text-sm">{row.product?.name}</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{row.product?.category?.name}</div>
        </div>
      )
    },
    {
      header: 'Current Stock',
      accessor: 'currentStock',
      render: (row) => (
        <span className="text-rose-600 font-bold text-sm bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
          {formatNumber(row.currentStock)} <span className="text-[10px] text-rose-500 font-semibold">{row.unit}</span>
        </span>
      )
    },
    {
      header: 'Reorder Level',
      accessor: 'reorderLevel',
      render: (row) => (
        <span className="font-semibold text-slate-600 text-sm">
          {formatNumber(row.reorderLevel)} <span className="text-xs text-slate-400 font-medium">{row.unit}</span>
        </span>
      )
    },
    {
      header: 'Supplier',
      accessor: 'supplier',
      render: (row) => (
        <div className="flex flex-col">
          <div className="text-slate-800 font-semibold text-xs">{row.supplier?.name}</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            <Phone size={10} /> {row.supplier?.phone}
          </div>
        </div>
      )
    },
    {
      header: 'Action Required',
      accessor: 'action',
      render: (row) => {
        if (row.currentStock === 0) {
          return <span className="text-[10px] px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-full font-bold shadow-sm inline-block">Out of Stock - Urgent!</span>;
        } else if (row.currentStock <= row.reorderLevel / 2) {
          return <span className="text-[10px] px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full font-bold shadow-sm inline-block">Critical Shortage</span>;
        } else {
          return <span className="text-[10px] px-2.5 py-0.5 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-full font-bold shadow-sm inline-block">Low Stock - Restock</span>;
        }
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Low Stock Alerts</h1>
        <p className="text-slate-500 text-xs md:text-sm">Products that have fallen below reorder levels and require restocking.</p>
      </div>

      {loading || lowStockItems.length > 0 ? (
        <div className="space-y-6 animate-fadeIn">
          {lowStockItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                <AlertTriangle size={18} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-sm">
                  {lowStockItems.length} products require restocking attention
                </h3>
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  Immediate contact with suppliers is recommended to maintain business continuity.
                </p>
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-xl border border-slate-100 p-5 md:p-6 shadow-soft space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Alert Logs</h2>
              <Link 
                to="/purchases"
                className="flex items-center gap-1.5 text-xs font-bold text-primary-700 bg-primary-50 border border-primary-150 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <ShoppingCart size={13} /> Order Stock Now
              </Link>
            </div>
            <Table columns={columns} data={lowStockItems} loading={loading} pagination={pagination} onPageChange={handlePageChange} />
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl shadow-soft p-12 text-center max-w-lg mx-auto animate-fadeIn mt-10">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <CheckCircle2 size={30} className="stroke-[2.2]" />
          </div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">
            Inventory Levels Stable
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            No products are currently triggered by low stock reorder thresholds.
          </p>
        </div>
      )}
    </div>
  );
};

export default LowStock;
