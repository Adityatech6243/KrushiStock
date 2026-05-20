import React, { useState, useEffect } from 'react';
import { getAllSales, deleteSale, createSale, updateSale } from '../../services/salesService';
import { getAllFarmers } from '../../services/farmerService';
import { getAllProducts } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePositiveNumber } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Loader from '../../components/common/Loader';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { PAYMENT_METHODS } from '../../utils/constants';

const SalesList = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Form state
  const [farmers, setFarmers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customer: '',
    saleDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash'
  });
  const [items, setItems] = useState([
    { product: '', quantity: '', price: '', availableStock: 0 }
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState([]);

  useEffect(() => {
    fetchSales(pagination.page);
    fetchFarmers();
    fetchProducts();
  }, [pagination.page]);

  const fetchSales = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getAllSales(page, 10);
      setSales(response.data);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmers = async () => {
    try {
      const response = await getAllFarmers();
      setFarmers(response.data);
    } catch (error) {
      console.error('Error fetching farmers:', error);
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
        newItems[index].availableStock = product.stock;
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
    setItems([...items, { product: '', quantity: '', price: '', availableStock: 0 }]);
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

    for (const item of items) {
      // Only check stock if adding a new sale (editing is more complex since the stock was already deducted)
      if (!isEditing && Number(item.quantity) > item.availableStock) {
        showError('Insufficient Stock', `Not enough stock for ${products.find(p => p._id === item.product)?.name}`);
        return;
      }
    }

    setFormLoading(true);

    try {
      const saleData = {
        ...formData,
        items: items.map((item) => ({
          product: item.product,
          quantity: Number(item.quantity),
          price: Number(item.price)
        })),
        totalAmount: calculateTotal()
      };

      if (isEditing) {
        await updateSale(editId, saleData);
        showSuccess('Success!', 'Sale updated successfully!');
      } else {
        await createSale(saleData);
        showSuccess('Success!', 'Sale recorded successfully!');
      }
      resetForm();
      fetchSales(pagination.page);
      fetchProducts(); // Refresh products to get updated stock
    } catch (error) {
      console.error('Error recording sale:', error);
      const errorMessage = error.response?.data?.message || 'Failed to record sale. Please try again.';
      showError('Error', errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (sale) => {
    setIsEditing(true);
    setEditId(sale._id);
    
    const formattedDate = sale.date 
      ? new Date(sale.date).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0];

    setFormData({
      customer: sale.customer?._id || sale.customer || '',
      saleDate: formattedDate,
      paymentMethod: sale.paymentMethod || 'Cash'
    });

    if (sale.items && sale.items.length > 0) {
      setItems(sale.items.map(item => {
        const prodId = item.product?._id || item.product;
        const prod = products.find(p => p._id === prodId);
        return {
          product: prodId,
          quantity: item.quantity || '',
          price: item.price || '',
          availableStock: prod ? prod.stock : 0
        };
      }));
    } else {
      setItems([{ product: '', quantity: '', price: '', availableStock: 0 }]);
    }
    
    setFieldErrors([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      customer: '',
      saleDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash'
    });
    setItems([{ product: '', quantity: '', price: '', availableStock: 0 }]);
    setFieldErrors([]);
  };

  const handleDelete = async (sale) => {
    const isConfirmed = await showConfirm(
      'Delete Sale?',
      `Are you sure you want to delete sale ${sale.saleNumber}? This will revert stock quantities.`
    );

    if (isConfirmed) {
      try {
        await deleteSale(sale._id);
        setSales(sales.filter(s => s._id !== sale._id));
        showSuccess('Deleted!', 'Sale deleted and stock reverted successfully.');
        if (isEditing && editId === sale._id) {
          resetForm();
        }
        fetchProducts(); // refresh products for stock
      } catch (error) {
        console.error('Error deleting sale:', error);
        const errorMsg = error.response?.data?.message || 'Failed to delete sale';
        showError('Delete Failed', errorMsg);
      }
    }
  };

  const columns = [
    { header: 'Sale #', accessor: 'saleNumber' },
    {
      header: 'Date',
      accessor: 'date',
      render: (row) => formatDate(row.date)
    },
    {
      header: 'Customer',
      accessor: 'customer',
      render: (row) => row.customer?.name || 'Walk-in'
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
      header: 'Payment',
      accessor: 'paymentMethod'
    }
  ];

  if (loading && sales.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sales History</h1>
        <p className="text-gray-600">Record and view sales transactions</p>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8 max-w-4xl">
        <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Sale' : 'Add New Sale'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Customer"
              name="customer"
              value={formData.customer}
              onChange={handleFormChange}
              options={[
                { value: '', label: 'Walk-in Customer' },
                ...farmers.filter(f => f.isActive).map((farmer) => ({
                  value: farmer._id,
                  label: farmer.name
                }))
              ]}
            />

            <Input
              label="Sale Date"
              type="date"
              name="saleDate"
              value={formData.saleDate}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="my-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Sale Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                + Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 mb-4 items-end">
                <div className="col-span-5">
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
                <div className="col-span-3">
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
                  {item.availableStock > 0 && !isEditing && (
                    <p className="text-xs text-gray-500">Available: {item.availableStock}</p>
                  )}
                </div>
                <div className="col-span-3">
                  <Input
                    label={index === 0 ? 'Price' : ''}
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
                <div className="col-span-1">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 mb-6">
            <div className="flex justify-end">
              <div className="text-right">
                <span className="text-gray-600 mr-4">Total Amount:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>
          </div>

          <Select
            label="Payment Method"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleFormChange}
            options={PAYMENT_METHODS}
            required
          />

          <div className="flex gap-3 mt-6">
            <Button type="submit" variant="primary" disabled={formLoading}>
              {formLoading ? 'Recording...' : isEditing ? 'Update Sale' : 'Record Sale'}
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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Sales List</h2>
        <Table 
          columns={columns} 
          data={sales} 
          onEdit={handleEdit}
          onDelete={handleDelete} 
          pagination={pagination} 
          onPageChange={handlePageChange} 
        />
      </div>
    </div>
  );
};

export default SalesList;
