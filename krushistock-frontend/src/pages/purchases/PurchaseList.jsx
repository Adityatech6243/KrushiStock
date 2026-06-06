import React, { useState, useEffect } from 'react';
import { getAllPurchases, deletePurchase, createPurchase, updatePurchase } from '../../services/purchaseService';
import { getAllProducts, getAllSuppliers } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePositiveNumber } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { formatDate, formatCurrency } from '../../utils/helpers';

const PurchaseList = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Form state
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    supplier: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    paymentStatus: 'Paid'
  });
  const [items, setItems] = useState([
    { product: '', quantity: '', price: '' }
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState([]);

  useEffect(() => {
    fetchPurchases(pagination.page);
    fetchSuppliers();
    fetchProducts();
  }, [pagination.page]);

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
      const response = await getAllSuppliers();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await getAllProducts();
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
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'product') {
      const product = products.find((p) => p._id === value);
      if (product) {
        newItems[index].price = product.price;
      }
    }

    setItems(newItems);
    
    if (fieldErrors.length > 0) {
      const newErrors = [...fieldErrors];
      if (newErrors[index]) {
        newErrors[index] = { ...newErrors[index], [field]: '' };
        setFieldErrors(newErrors);
      }
    }
  };

  const addItem = () => {
    setItems([...items, { product: '', quantity: '', price: '' }]);
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

    let hasErrors = false;
    const errorsArray = items.map((item) => {
      const qtyErr = validatePositiveNumber(item.quantity, 'Quantity');
      const priceErr = validatePositiveNumber(item.price, 'Price');
      if (qtyErr || priceErr) hasErrors = true;
      return { quantity: qtyErr, price: priceErr };
    });

    if (hasErrors) {
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
          price: Number(item.price)
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
    
    const formattedDate = purchase.date 
      ? new Date(purchase.date).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0];

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
        price: item.price || ''
      })));
    } else {
      setItems([{ product: '', quantity: '', price: '' }]);
    }
    
    setFieldErrors([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      supplier: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      paymentStatus: 'Paid'
    });
    setItems([{ product: '', quantity: '', price: '' }]);
    setFieldErrors([]);
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
      accessor: 'date',
      render: (row) => formatDate(row.date)
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
        <form onSubmit={handleSubmit}>
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
            />

            <Input
              label="Purchase Date"
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleFormChange}
              required
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
              <div key={index} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-12 md:col-span-5">
                  <Select
                    label={index === 0 ? 'Product' : ''}
                    name="product"
                    value={item.product}
                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                    options={products.filter(p => p.isActive).map((prod) => ({
                      value: prod._id,
                      label: `${prod.name} (Stock: ${prod.stock})`
                    }))}
                    required
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Input
                    label={index === 0 ? 'Quantity' : ''}
                    type="number"
                    name="quantity"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    placeholder="0"
                    required
                    min="0"
                    error={fieldErrors[index]?.quantity}
                  />
                </div>
                <div className="col-span-5 md:col-span-3">
                  <Input
                    label={index === 0 ? 'Cost Price' : ''}
                    type="number"
                    name="price"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    placeholder="0.00"
                    required
                    min="0"
                    step="0.01"
                    error={fieldErrors[index]?.price}
                  />
                </div>
                <div className="col-span-1 pb-4 flex justify-center">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="p-1 h-9 w-9 rounded-lg"
                    >
                      ×
                    </Button>
                  )}
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
          onDelete={handleDelete} 
          pagination={pagination} 
          onPageChange={handlePageChange} 
        />
      </div>
    </div>
  );
};

export default PurchaseList;
