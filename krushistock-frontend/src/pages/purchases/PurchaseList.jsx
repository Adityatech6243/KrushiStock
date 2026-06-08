import React, { useState, useEffect } from 'react';
import { getAllPurchases, deletePurchase, createPurchase, updatePurchase } from '../../services/purchaseService';
import { getAllProducts, getAllSuppliers } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePositiveNumber, validateRequired, validateDateRange } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { formatDate, formatCurrency, formatDateForInput, getLocalDateString } from '../../utils/helpers';
import { getUserInfo } from '../../utils/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

const PurchaseList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = getUserInfo()?.role === 'admin';
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Form state
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    supplier: '',
    purchaseDate: getLocalDateString(),
    paymentMethod: 'Cash',
    paymentStatus: 'Paid'
  });
  const [items, setItems] = useState([
    { product: '', quantity: '', price: '', mrp: '', batchNumber: '', manufactureDate: '', expiryDate: '' }
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchPurchases(pagination.page);
    fetchSuppliers();
    fetchProducts();
  }, [pagination.page]);

  useEffect(() => {
    if (
      location.state?.reorderProduct &&
      products.length > 0 &&
      suppliers.length > 0
    ) {
      const reorderProduct = location.state.reorderProduct;
      const reorderSupplier = location.state.reorderSupplier;
      const suggestedQuantity = location.state.suggestedQuantity || 1;

      setFormData(prev => ({
        ...prev,
        supplier: reorderSupplier?._id || ''
      }));

      // Find the loaded product to get the most up-to-date purchasePrice and mrp
      const loadedProd = products.find(p => p._id === reorderProduct._id) || reorderProduct;

      setItems([
        {
          product: loadedProd._id,
          quantity: String(suggestedQuantity),
          price: String(loadedProd.purchasePrice !== undefined ? loadedProd.purchasePrice : loadedProd.price || ''),
          mrp: String(loadedProd.mrp || 0),
          batchNumber: loadedProd.batchNumber || '',
          expiryDate: loadedProd.expiryDate ? formatDateForInput(loadedProd.expiryDate) : ''
        }
      ]);

      // Scroll to form smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Clear state so reload doesn't trigger prefill
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, products, suppliers, navigate, location.pathname]);

  const fetchPurchases = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getAllPurchases(page, 10);
      setPurchases(response.data);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await getAllSuppliers(1, 100000);
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await getAllProducts(1, 100000);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (formErrors[e.target.name]) {
      setFormErrors({
        ...formErrors,
        [e.target.name]: ''
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'product') {
      const product = products.find((p) => p._id === value);
      if (product) {
        newItems[index].price = product.purchasePrice !== undefined ? product.purchasePrice : product.price;
        newItems[index].mrp = product.mrp || 0;
        newItems[index].batchNumber = product.batchNumber || '';
        newItems[index].manufactureDate = product.manufactureDate ? formatDateForInput(product.manufactureDate) : '';
        newItems[index].expiryDate = product.expiryDate ? formatDateForInput(product.expiryDate) : '';
      }
    }

    setItems(newItems);
    
    if (fieldErrors.length > 0) {
      const newErrors = [...fieldErrors];
      if (newErrors[index]) {
        newErrors[index] = { ...newErrors[index], [field]: '' };
        if (field === 'expiryDate' || field === 'manufactureDate') {
          newErrors[index].expiryDate = '';
        }
        setFieldErrors(newErrors);
      }
    }
  };

  const addItem = () => {
    setItems([...items, { product: '', quantity: '', price: '', mrp: '', batchNumber: '', manufactureDate: '', expiryDate: '' }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0) * (Number(item.price) || 0);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validate top-level form fields
    const todayStr = getLocalDateString();
    const fErrors = {
      supplier: validateRequired(formData.supplier, 'Please select the supplier')
    };

    if (!formData.purchaseDate) {
      fErrors.purchaseDate = 'Please select the purchase date';
    } else if (formData.purchaseDate < todayStr) {
      fErrors.purchaseDate = 'Purchase date cannot be in the past';
    }

    const hasFormErrors = Object.values(fErrors).some(err => err && err !== '');
    if (hasFormErrors) {
      setFormErrors(fErrors);
      showError('Validation Error', fErrors.supplier || fErrors.purchaseDate || 'Please select a Supplier before checking out.');
      return;
    }

    // 2. Validate grid rows
    let hasRowErrors = false;
    const errorsArray = items.map((item) => {
      const prodErr = validateRequired(item.product, 'Please select a product');
      const qtyErr = validatePositiveNumber(item.quantity, 'Please enter quantity');
      const priceErr = validatePositiveNumber(item.price, 'Please enter cost price');
      const mrpErr = validatePositiveNumber(item.mrp, 'Please enter MRP');
      const expiryDateErr = validateDateRange(item.manufactureDate, item.expiryDate, 'Expiry date must be after manufacture date');
      if (prodErr || qtyErr || priceErr || mrpErr || expiryDateErr) hasRowErrors = true;
      return { product: prodErr, quantity: qtyErr, price: priceErr, mrp: mrpErr, expiryDate: expiryDateErr };
    });

    if (hasRowErrors) {
      setFieldErrors(errorsArray);
      return;
    }

    setFormLoading(true);

    try {
      const purchaseData = {
        ...formData,
        items: items.map((item) => ({
          product: item.product,
          quantity: Number(item.quantity),
          price: Number(item.price),
          mrp: Number(item.mrp || 0),
          batchNumber: item.batchNumber || '',
          manufactureDate: item.manufactureDate || null,
          expiryDate: item.expiryDate || null
        })),
        totalAmount: calculateTotal()
      };

      if (isEditing) {
        await updatePurchase(editId, purchaseData);
        showSuccess('Success!', 'Purchase updated successfully!');
      } else {
        await createPurchase(purchaseData);
        showSuccess('Success!', 'Purchase added successfully!');
      }
      resetForm();
      fetchPurchases(pagination.page);
    } catch (error) {
      console.error('Error saving purchase:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save purchase. Please try again.';
      showError('Error', errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (purchase) => {
    setIsEditing(true);
    setEditId(purchase._id);
    
    const formattedDate = formatDateForInput(purchase.purchaseDate) || getLocalDateString();

    setFormData({
      supplier: purchase.supplier?._id || '',
      purchaseDate: formattedDate,
      paymentMethod: purchase.paymentMethod || 'Cash',
      paymentStatus: purchase.paymentStatus || 'Paid'
    });

    if (purchase.items && purchase.items.length > 0) {
      setItems(purchase.items.map(item => ({
        product: item.product?._id || item.product,
        quantity: item.quantity || '',
        price: item.price || '',
        mrp: item.mrp || '',
        batchNumber: item.batchNumber || '',
        manufactureDate: item.manufactureDate ? formatDateForInput(item.manufactureDate) : '',
        expiryDate: item.expiryDate ? formatDateForInput(item.expiryDate) : ''
      })));
    } else {
      setItems([{ product: '', quantity: '', price: '', mrp: '', batchNumber: '', manufactureDate: '', expiryDate: '' }]);
    }
    
    setFieldErrors([]);
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      supplier: '',
      purchaseDate: getLocalDateString(),
      paymentMethod: 'Cash',
      paymentStatus: 'Paid'
    });
    setItems([{ product: '', quantity: '', price: '', mrp: '', batchNumber: '', manufactureDate: '', expiryDate: '' }]);
    setFieldErrors([]);
    setFormErrors({});
  };

  const handleDelete = async (purchase) => {
    const isConfirmed = await showConfirm(
      'Delete Purchase?',
      `Are you sure you want to delete purchase ${purchase.purchaseNumber}? This will revert stock quantities.`
    );

    if (isConfirmed) {
      try {
        await deletePurchase(purchase._id);
        setPurchases(purchases.filter(p => p._id !== purchase._id));
        showSuccess('Deleted!', 'Purchase deleted and stock reverted successfully.');
        if (isEditing && editId === purchase._id) {
          resetForm();
        }
      } catch (error) {
        console.error('Error deleting purchase:', error);
        const errorMsg = error.response?.data?.message || 'Failed to delete purchase';
        showError('Delete Failed', errorMsg);
      }
    }
  };

  const columns = [
    { header: 'Purchase #', accessor: 'purchaseNumber' },
    {
      header: 'Date',
      accessor: 'purchaseDate',
      render: (row) => formatDate(row.purchaseDate)
    },
    {
      header: 'Supplier',
      accessor: 'supplier',
      render: (row) => row.supplier?.name
    },
    {
      header: 'Items',
      accessor: 'items',
      render: (row) => row.items?.length || 0
    },
    {
      header: 'Total Amount',
      accessor: 'totalAmount',
      render: (row) => formatCurrency(row.totalAmount)
    },
    {
      header: 'Status',
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
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Purchases Journal</h1>
        <p className="text-slate-500 text-xs md:text-sm">Log inventory restocks from suppliers and manage batch payments.</p>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 md:p-6 shadow-soft max-w-4xl">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
          {isEditing ? '⚡ Edit Purchase Record' : '🛒 Log New Purchase Batch'}
        </h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Supplier"
              name="supplier"
              value={formData.supplier}
              onChange={handleFormChange}
              options={suppliers.filter(s => s.isActive).map((sup) => ({
                value: sup._id,
                label: sup.name
              }))}
              required
              error={formErrors.supplier}
            />

            <Input
              label="Purchase Date"
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleFormChange}
              required
              min={getLocalDateString()}
              error={formErrors.purchaseDate}
            />
          </div>

          <div className="my-6 p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Purchase Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                + Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="relative p-4 bg-white border border-slate-200/60 rounded-xl space-y-4 hover:border-slate-300 transition-all shadow-sm">
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors z-10"
                    title="Remove Item"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-4">
                    <Select
                      label="Product"
                      name="product"
                      value={item.product}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                      options={products.filter(p => p.isActive).map((prod) => ({
                        value: prod._id,
                        label: `${prod.name} (Stock: ${prod.stock})`
                      }))}
                      required
                      error={fieldErrors[index]?.product}
                      className="mb-0"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-4 md:col-span-2">
                    <Input
                      label="Batch Number"
                      type="text"
                      name="batchNumber"
                      value={item.batchNumber}
                      onChange={(e) => handleItemChange(index, 'batchNumber', e.target.value)}
                      placeholder="Batch"
                      required
                      className="mb-0"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-4 md:col-span-3">
                    <Input
                      label="Mfg Date"
                      type="date"
                      name="manufactureDate"
                      value={item.manufactureDate}
                      onChange={(e) => handleItemChange(index, 'manufactureDate', e.target.value)}
                      error={fieldErrors[index]?.manufactureDate}
                      className="mb-0"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-4 md:col-span-3">
                    <Input
                      label="Expiry Date"
                      type="date"
                      name="expiryDate"
                      value={item.expiryDate}
                      onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                      required
                      error={fieldErrors[index]?.expiryDate}
                      className="mb-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-4">
                    <Input
                      label="Quantity"
                      type="number"
                      name="quantity"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      placeholder="0"
                      required
                      min="0"
                      error={fieldErrors[index]?.quantity}
                      className="mb-0"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-4">
                    <Input
                      label="Cost Price"
                      type="number"
                      name="price"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      placeholder="0.00"
                      required
                      min="0"
                      step="0.01"
                      error={fieldErrors[index]?.price}
                      className="mb-0"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-4">
                    <Input
                      label="MRP"
                      type="number"
                      name="mrp"
                      value={item.mrp}
                      onChange={(e) => handleItemChange(index, 'mrp', e.target.value)}
                      placeholder="0.00"
                      required
                      min="0"
                      step="0.01"
                      error={fieldErrors[index]?.mrp}
                      className="mb-0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4 mb-6 flex justify-between items-center">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Purchase Value</span>
            <div className="text-right">
              <span className="text-2xl font-black text-slate-800">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleFormChange}
              options={['Cash', 'Card', 'UPI', 'Bank Transfer']}
              required
            />

            <Select
              label="Payment Status"
              name="paymentStatus"
              value={formData.paymentStatus}
              onChange={handleFormChange}
              options={['Paid', 'Pending', 'Partial']}
              required
            />
          </div>

          <div className="flex gap-2.5 mt-6 border-t border-slate-100 pt-4">
            <Button type="submit" variant="primary" disabled={formLoading}>
              {formLoading ? 'Saving...' : isEditing ? 'Update Purchase Record' : 'Record Purchase Batch'}
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 md:p-6 shadow-soft space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Purchase Logs</h2>
        <Table 
          columns={columns} 
          data={purchases} 
          loading={loading}
          onEdit={handleEdit}
          onDelete={isAdmin ? handleDelete : undefined} 
          pagination={pagination} 
          onPageChange={handlePageChange} 
        />
      </div>
    </div>
  );
};

export default PurchaseList;
