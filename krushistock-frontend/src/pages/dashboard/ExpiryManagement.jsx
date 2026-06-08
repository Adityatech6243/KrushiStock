import React, { useState, useEffect } from 'react';
import { getNearExpiryProducts, getExpiredProducts, getDeadStockProducts, updateStockStatuses, getWasteAnalytics } from '../../services/inventoryService';
import { updateProduct, getAllCategories } from '../../services/productService';
import { updateStock, recordStockAdjustment } from '../../services/stockService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { formatCurrency } from '../../utils/helpers';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import { RotateCw, Hourglass, ShieldAlert, Archive, Sparkles, HelpCircle } from 'lucide-react';

const ExpiryManagement = () => {
  const [activeTab, setActiveTab] = useState('near-expiry');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Table Data & Pagination
  const [dataList, setDataList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  // KPI / Summary Data
  const [summary, setSummary] = useState({
    nearExpiry: { count: 0, value: 0 },
    expired: { count: 0, value: 0 },
    deadStock: { count: 0, value: 0 }
  });

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchTabData(1);
    setSelectedProduct(null);
  }, [activeTab, search, category]);

  const fetchCategories = async () => {
    try {
      const response = await getAllCategories(1, 100000);
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await getWasteAnalytics();
      if (response?.success && response.data?.summary) {
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching waste summary:', error);
    }
  };

  const fetchTabData = async (page = 1) => {
    setLoading(true);
    try {
      let response;
      if (activeTab === 'near-expiry') {
        response = await getNearExpiryProducts(page, 10, search, category);
      } else if (activeTab === 'expired') {
        response = await getExpiredProducts(page, 10, search, category);
      } else {
        response = await getDeadStockProducts(page, 10, search, category);
      }

      if (response?.success) {
        setDataList(response.data || []);
        setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch (error) {
      console.error('Error fetching tab data:', error);
      showError('Error', 'Failed to load list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    fetchTabData(newPage);
  };

  const handleSyncStatus = async () => {
    setSyncing(true);
    try {
      const result = await updateStockStatuses();
      if (result.success) {
        showSuccess('Sync Completed', `Successfully recalculated stock statuses. ${result.data?.updatedCount || 0} changes applied.`);
        await fetchSummary();
        await fetchTabData(1);
      }
    } catch (error) {
      console.error('Error syncing stock status:', error);
      showError('Sync Failed', 'Could not sync inventory statuses.');
    } finally {
      setSyncing(false);
    }
  };

  // Action: Apply Discount (Quick update selling price)
  const handleApplyDiscount = async (product) => {
    const suggestedPrice = product.discountedPrice;
    const isConfirmed = await showConfirm(
      'Apply Discount Plan?',
      `Are you sure you want to update ${product.name}'s selling price to ₹${suggestedPrice} (applying a ${product.suggestedDiscount}% discount)?`
    );

    if (isConfirmed) {
      try {
        await updateProduct(product._id, {
          sellingPrice: suggestedPrice,
          price: suggestedPrice // align both
        });
        showSuccess('Price Updated', `Selling price for ${product.name} updated to ₹${suggestedPrice}.`);
        await fetchSummary();
        await fetchTabData(pagination.page);
        setSelectedProduct(null);
      } catch (error) {
        console.error('Error applying discount price:', error);
        showError('Update Failed', 'Failed to update selling price.');
      }
    }
  };

  // Action: Dispose Expired Stock (Set stock quantity to 0)
  const handleDisposeStock = async (product) => {
    const isConfirmed = await showConfirm(
      'Dispose Expired Stock?',
      `Are you sure you want to dispose of all ${product.quantity} ${product.unit || 'units'} of ${product.name}? This will set the quantity to 0 and record it as waste.`
    );

    if (isConfirmed) {
      try {
        await recordStockAdjustment(product._id, -product.quantity, 'disposal', 'Expired stock disposal');
        showSuccess('Stock Disposed', `${product.name} inventory zeroed out.`);
        await fetchSummary();
        await fetchTabData(pagination.page);
        setSelectedProduct(null);
      } catch (error) {
        console.error('Error disposing stock:', error);
        showError('Failed to Dispose', 'Could not dispose of the expired stock.');
      }
    }
  };

  // Columns Configuration
  const nearExpiryColumns = [
    { header: 'Product Name', accessor: 'name' },
    {
      header: 'Expiry Date',
      accessor: 'expiryDate',
      render: (row) => {
        const remainingDays = row.expiryDate ? Math.ceil((new Date(row.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
        return (
          <div>
            <div className="font-semibold text-gray-800">
              {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : 'N/A'}
            </div>
            <div className="text-xs text-amber-600 font-medium">
              {remainingDays} days remaining
            </div>
          </div>
        );
      }
    },
    {
      header: 'Stock',
      accessor: 'quantity',
      render: (row) => `${row.quantity} ${row.unit || ''}`
    },
    {
      header: 'Price (₹)',
      accessor: 'sellingPrice',
      render: (row) => (
        <div>
          <div className="text-gray-500 line-through text-xs">₹{row.sellingPrice || row.price}</div>
          <div className="text-emerald-600 font-bold">₹{row.discountedPrice}</div>
        </div>
      )
    },
    {
      header: 'Suggested Plan',
      accessor: 'suggestedDiscount',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          {row.suggestedDiscount}% OFF
        </span>
      )
    },
    {
      header: 'Potential Loss',
      accessor: 'potentialLoss',
      render: (row) => formatCurrency(row.potentialLoss)
    },
    {
      header: 'Supplier',
      accessor: 'supplierName',
      render: (row) => row.supplierName || 'N/A'
    }
  ];

  const expiredColumns = [
    { header: 'Product Name', accessor: 'name' },
    {
      header: 'Expiry Date',
      accessor: 'expiryDate',
      render: (row) => (
        <span className="font-semibold text-rose-600">
          {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : 'N/A'} (Expired)
        </span>
      )
    },
    {
      header: 'Stock',
      accessor: 'quantity',
      render: (row) => `${row.quantity} ${row.unit || ''}`
    },
    {
      header: 'Purchase Cost (₹)',
      accessor: 'purchasePrice',
      render: (row) => formatCurrency(row.purchasePrice)
    },
    {
      header: 'Waste Value',
      accessor: 'wasteValue',
      render: (row) => (
        <span className="font-bold text-red-600">
          {formatCurrency(row.wasteValue)}
        </span>
      )
    },
    {
      header: 'Supplier',
      accessor: 'supplierName',
      render: (row) => row.supplierName || 'N/A'
    }
  ];

  const deadStockColumns = [
    { header: 'Product Name', accessor: 'name' },
    {
      header: 'Days Inactive',
      accessor: 'daysInactive',
      render: (row) => (
        <div>
          <span className="font-bold text-violet-700">{row.daysInactive} days</span>
          <span className="block text-xs text-gray-500">No sales record</span>
        </div>
      )
    },
    {
      header: 'Stock Quantity',
      accessor: 'quantity',
      render: (row) => `${row.quantity} ${row.unit || ''}`
    },
    {
      header: 'Locked Capital',
      accessor: 'deadStockValue',
      render: (row) => (
        <span className="font-bold text-gray-700">
          {formatCurrency(row.deadStockValue)}
        </span>
      )
    },
    {
      header: 'Last Sold Date',
      accessor: 'lastSoldDate',
      render: (row) => row.lastSoldDate ? new Date(row.lastSoldDate).toLocaleDateString() : 'Never Sold (New)'
    },
    {
      header: 'Supplier',
      accessor: 'supplierName',
      render: (row) => row.supplierName || 'N/A'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Expiry & Waste Reduction Management</h1>
          <p className="text-slate-500 text-xs md:text-sm">Proactively manage shelf lifecycles, clear stagnant stocks, and minimize waste capital losses.</p>
        </div>
        <div>
          <Button
            variant="outline"
            onClick={handleSyncStatus}
            disabled={syncing}
            className="flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RotateCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>Recalculate Statuses</span>
          </Button>
        </div>
      </div>

      {/* Expiry Alerts Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Near Expiry Card */}
        <div className="bg-white border-l-4 border-amber-500 rounded-xl shadow-soft hover:shadow-soft-md transition-shadow p-5 flex items-start gap-4">
          <div className="text-2xl p-2.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <Hourglass size={20} className="stroke-[2.5]" />
          </div>
          <div className="flex-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Near Expiry (30 days)</span>
            <div className="text-xl font-black text-slate-800 mt-1">{summary.nearExpiry?.count || 0} Products</div>
            <div className="text-xs text-slate-500 mt-1">
              Retail value: <span className="font-bold text-amber-600">{formatCurrency(summary.nearExpiry?.value || 0)}</span>
            </div>
          </div>
        </div>

        {/* Expired Card */}
        <div className="bg-white border-l-4 border-rose-500 rounded-xl shadow-soft hover:shadow-soft-md transition-shadow p-5 flex items-start gap-4">
          <div className="text-2xl p-2.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
            <ShieldAlert size={20} className="stroke-[2.5]" />
          </div>
          <div className="flex-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Expired Stocks</span>
            <div className="text-xl font-black text-slate-800 mt-1">{summary.expired?.count || 0} Products</div>
            <div className="text-xs text-slate-500 mt-1">
              Write-off loss: <span className="font-bold text-rose-600">{formatCurrency(summary.expired?.value || 0)}</span>
            </div>
          </div>
        </div>

        {/* Dead Stock Card */}
        <div className="bg-white border-l-4 border-violet-500 rounded-xl shadow-soft hover:shadow-soft-md transition-shadow p-5 flex items-start gap-4">
          <div className="text-2xl p-2.5 bg-violet-50 text-violet-600 rounded-lg border border-violet-100">
            <Archive size={20} className="stroke-[2.5]" />
          </div>
          <div className="flex-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Dead Stock (90+ Days)</span>
            <div className="text-xl font-black text-slate-800 mt-1">{summary.deadStock?.count || 0} Products</div>
            <div className="text-xs text-slate-500 mt-1">
              Locked capital: <span className="font-bold text-violet-600">{formatCurrency(summary.deadStock?.value || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs and Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left/Middle: Table Listings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-soft border border-slate-100 overflow-hidden">
            
            {/* Tabs Header */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 gap-1">
              <button
                className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'near-expiry'
                    ? 'bg-white text-primary-700 shadow-soft border border-slate-150'
                    : 'text-slate-500 hover:text-slate-850 hover:bg-slate-100/50'
                }`}
                onClick={() => setActiveTab('near-expiry')}
              >
                Near Expiry Alert
              </button>
              <button
                className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'expired'
                    ? 'bg-white text-primary-700 shadow-soft border border-slate-150'
                    : 'text-slate-500 hover:text-slate-850 hover:bg-slate-100/50'
                }`}
                onClick={() => setActiveTab('expired')}
              >
                Expired Products
              </button>
              <button
                className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'dead-stock'
                    ? 'bg-white text-primary-700 shadow-soft border border-slate-150'
                    : 'text-slate-500 hover:text-slate-850 hover:bg-slate-100/50'
                }`}
                onClick={() => setActiveTab('dead-stock')}
              >
                Dead Stock List
              </button>
            </div>

            {/* Filter Panel */}
            <div className="p-4 bg-white border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white text-sm text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all hover:border-slate-300"
                />
              </div>
              <div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white text-sm text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all hover:border-slate-300"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table Area */}
            <div className="p-4">
              <Table
                columns={
                  activeTab === 'near-expiry'
                    ? nearExpiryColumns
                    : activeTab === 'expired'
                    ? expiredColumns
                    : deadStockColumns
                }
                data={dataList}
                loading={loading}
                onEdit={(row) => setSelectedProduct(row)}
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </div>

          </div>
        </div>

        {/* Right side: Smart Action Station / Detail Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-soft border border-slate-100 p-5 sticky top-24">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-primary-600" />
              Smart Action Station
            </h3>
            
            {selectedProduct ? (
              <div className="space-y-5 animate-fadeIn">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-primary-700 leading-tight">{selectedProduct.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Batch: {selectedProduct.batchNumber || 'N/A'}</p>
                </div>

                {/* Expiry / Dead Stock contextual details */}
                <div className="space-y-2.5 bg-slate-50/50 rounded-xl p-3.5 border border-slate-100 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Available Stock:</span>
                    <span className="text-slate-800">{selectedProduct.quantity} {selectedProduct.unit}</span>
                  </div>
                  {selectedProduct.expiryDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Expiry Date:</span>
                      <span className="text-slate-850">{new Date(selectedProduct.expiryDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedProduct.purchasePrice !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Purchase Price:</span>
                      <span className="text-slate-850">{formatCurrency(selectedProduct.purchasePrice)}</span>
                    </div>
                  )}
                  {selectedProduct.sellingPrice !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Sell Price:</span>
                      <span className="text-slate-850">{formatCurrency(selectedProduct.sellingPrice)}</span>
                    </div>
                  )}
                </div>

                {/* Suggested Strategy section */}
                {activeTab === 'near-expiry' && (
                  <div className="border border-amber-100 bg-amber-50/50 rounded-xl p-4 space-y-3">
                    <h5 className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Discount Strategy</h5>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-amber-900 font-medium">Suggested Markdown:</span>
                      <span className="text-base font-black text-amber-700">{selectedProduct.suggestedDiscount}% OFF</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-amber-900 font-medium">Recommended Price:</span>
                      <span className="text-base font-black text-emerald-700">{formatCurrency(selectedProduct.discountedPrice)}</span>
                    </div>
                    <div className="text-[10px] text-amber-800 italic bg-amber-100/50 p-2.5 rounded-lg border border-amber-200/50 leading-relaxed">
                      {selectedProduct.recommendation}
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => handleApplyDiscount(selectedProduct)}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white mt-2 border-transparent shadow-sm shadow-amber-150"
                    >
                      Apply Suggested Discount
                    </Button>
                  </div>
                )}

                {activeTab === 'expired' && (
                  <div className="border border-rose-150 bg-rose-50/50 rounded-xl p-4 space-y-3">
                    <h5 className="text-[10px] font-bold text-rose-800 uppercase tracking-widest">Waste Action</h5>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-rose-900 font-medium">Write-off Loss:</span>
                      <span className="text-base font-black text-rose-700">{formatCurrency(selectedProduct.wasteValue)}</span>
                    </div>
                    <div className="text-[10px] text-rose-800 italic bg-rose-100/50 p-2.5 rounded-lg border border-rose-200/50 leading-relaxed">
                      {selectedProduct.recommendation}
                    </div>
                    <Button
                      variant="danger"
                      onClick={() => handleDisposeStock(selectedProduct)}
                      className="w-full mt-2"
                    >
                      Record Disposal / Dump Stock
                    </Button>
                  </div>
                )}

                {activeTab === 'dead-stock' && (
                  <div className="border border-violet-150 bg-violet-50/50 rounded-xl p-4 space-y-3">
                    <h5 className="text-[10px] font-bold text-violet-800 uppercase tracking-widest">Stagnant Stock Strategy</h5>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-violet-900 font-medium">Days Inactive:</span>
                      <span className="text-base font-black text-violet-700">{selectedProduct.daysInactive} Days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-violet-900 font-medium">Capital Blocked:</span>
                      <span className="text-base font-black text-violet-700">{formatCurrency(selectedProduct.deadStockValue)}</span>
                    </div>
                    <div className="text-[10px] text-violet-800 italic bg-violet-100/50 p-2.5 rounded-lg border border-violet-200/50 leading-relaxed">
                      {selectedProduct.recommendation}
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => handleApplyDiscount({ ...selectedProduct, suggestedDiscount: 15, discountedPrice: Number((selectedProduct.sellingPrice * 0.85).toFixed(2)) })}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white mt-2 border-transparent shadow-sm shadow-violet-150"
                    >
                      Apply 15% Clearance Sale
                    </Button>
                  </div>
                )}

                <Button
                  variant="secondary"
                  onClick={() => setSelectedProduct(null)}
                  className="w-full"
                >
                  Clear Selection
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <HelpCircle size={20} />
                </div>
                <h4 className="text-xs font-bold text-slate-700 mt-3">No product selected</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] mx-auto font-semibold">
                  Click the Edit action icon on any product table row to launch smart strategies.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExpiryManagement;
