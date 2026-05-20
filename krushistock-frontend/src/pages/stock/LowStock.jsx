import React, { useState, useEffect } from 'react';
import { getLowStockProducts } from '../../services/stockService';
import Table from '../../components/common/Table';
import Loader from '../../components/common/Loader';
import { formatNumber } from '../../utils/helpers';

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
        <div>
          <div className="font-medium">{row.product?.name}</div>
          <div className="text-xs text-gray-500">{row.product?.category?.name}</div>
        </div>
      )
    },
    {
      header: 'Current Stock',
      accessor: 'currentStock',
      render: (row) => (
        <span className="text-red-600 font-medium">
          {formatNumber(row.currentStock)} {row.unit}
        </span>
      )
    },
    {
      header: 'Reorder Level',
      accessor: 'reorderLevel',
      render: (row) => `${formatNumber(row.reorderLevel)} ${row.unit}`
    },
    {
      header: 'Supplier',
      accessor: 'supplier',
      render: (row) => (
        <div>
          <div>{row.supplier?.name}</div>
          <div className="text-xs text-gray-500">{row.supplier?.phone}</div>
        </div>
      )
    },
    {
      header: 'Action Required',
      accessor: 'action',
      render: (row) => {
        if (row.currentStock === 0) {
          return <span className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full font-bold shadow-sm inline-block">Out of Stock - Urgent!</span>;
        } else if (row.currentStock <= row.reorderLevel / 2) {
          return <span className="text-xs px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold shadow-sm inline-block">Critical Shortage</span>;
        } else {
          return <span className="text-xs px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium shadow-sm inline-block">Low Stock - Restock</span>;
        }
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
        <h1 className="text-2xl font-bold text-gray-800">Low Stock Alert</h1>
        <p className="text-gray-600">Products that need to be reordered</p>
      </div>

      {lowStockItems.length > 0 ? (
        <>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-800">
                  {lowStockItems.length} products need immediate attention
                </h3>
                <p className="text-sm text-yellow-700">
                  Please contact suppliers to restock these items
                </p>
              </div>
            </div>
          </div>
          <Table columns={columns} data={lowStockItems} pagination={pagination} onPageChange={handlePageChange} />
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            All Stock Levels are Good
          </h3>
          <p className="text-gray-600">No products require immediate reordering</p>
        </div>
      )}
    </div>
  );
};

export default LowStock;
