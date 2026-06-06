import React, { useState, useEffect } from 'react';
import { getAllProducts, createProduct, updateProduct, deleteProduct, getAllCategories, getAllSuppliers } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePositiveNumber } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { formatCurrency } from '../../utils/helpers';
import { PRODUCT_UNITS } from '../../utils/constants';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [categoryFilter, setCategoryFilter] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    supplier: '',
    price: '',
    sellingPrice: '',
    purchasePrice: '',
    stock: '',
    unit: '',
    reorderLevel: '',
    description: '',
    batchNumber: '',
    manufactureDate: '',
    expiryDate: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchProducts(pagination.page);
  }, [pagination.page, categoryFilter]);

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getAllProducts(page, 10, { category: categoryFilter });
      setProducts(response.data);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getAllCategories(1, 100);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await getAllSuppliers(1, 100);
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleCategoryFilterChange = (e) => {
    setCategoryFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    if (fieldErrors[e.target.name]) {
      setFieldErrors({
        ...fieldErrors,
        [e.target.name]: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {
      sellingPrice: validatePositiveNumber(formData.sellingPrice, 'Selling Price'),
      purchasePrice: validatePositiveNumber(formData.purchasePrice, 'Purchase Price'),
      stock: validatePositiveNumber(formData.stock, 'Stock'),
      reorderLevel: validatePositiveNumber(formData.reorderLevel, 'Reorder Level')
    };

    if (formData.manufactureDate && formData.expiryDate) {
      const mDate = new Date(formData.manufactureDate);
      const eDate = new Date(formData.expiryDate);
      if (eDate <= mDate) {
        errors.expiryDate = 'Expiry date must be after manufacture date';
      }
    }

    const hasErrors = Object.values(errors).some(err => err && err !== '');
    if (hasErrors) {
      setFieldErrors(errors);
      return;
    }

    setFormLoading(true);

    try {
      const submissionData = {
        ...formData,
        price: formData.sellingPrice // ensure backend's required price field is populated
      };

      if (isEditing) {
        await updateProduct(editId, submissionData);
        showSuccess('Success!', 'Product updated successfully!');
      } else {
        await createProduct(submissionData);
        showSuccess('Success!', 'Product added successfully!');
      }
      resetForm();
      fetchProducts(pagination.page);
    } catch (error) {
      console.error('Error saving product:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save product. Please try again.';
      showError('Error', errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (product) => {
    setIsEditing(true);
    setEditId(product._id);
    setFormData({
      name: product.name || '',
      category: product.category?._id || '',
      supplier: product.supplier?._id || '',
      price: product.price || '',
      sellingPrice: product.sellingPrice || product.price || '',
      purchasePrice: product.purchasePrice || '',
      stock: product.stock !== undefined ? product.stock : (product.quantity || 0),
      unit: product.unit || '',
      reorderLevel: product.reorderLevel || '',
      description: product.description || '',
      batchNumber: product.batchNumber || '',
      manufactureDate: product.manufactureDate ? new Date(product.manufactureDate).toISOString().substring(0, 10) : '',
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().substring(0, 10) : ''
    });
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      name: '',
      category: '',
      supplier: '',
      price: '',
      sellingPrice: '',
      purchasePrice: '',
      stock: '',
      unit: '',
      reorderLevel: '',
      description: '',
      batchNumber: '',
      manufactureDate: '',
      expiryDate: ''
    });
    setFieldErrors({});
  };

  const handleDelete = async (product) => {
    const isConfirmed = await showConfirm(
      'Delete Product?',
      `Are you sure you want to delete ${product.name}?`
    );
    
    if (isConfirmed) {
      try {
        await deleteProduct(product._id);
        setProducts(products.filter(p => p._id !== product._id));
        showSuccess('Deleted!', 'Product has been deleted successfully.');
        if (isEditing && editId === product._id) {
          resetForm();
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        const errorMsg = error.response?.data?.message || 'Failed to delete product';
        showError('Delete Failed', errorMsg);
      }
    }
  };

  const handleToggleStatus = async (product) => {
    try {
      await updateProduct(product._id, { isActive: !product.isActive });
      setProducts(products.map(p => p._id === product._id ? { ...p, isActive: !p.isActive } : p));
      showSuccess('Status Updated', `Product is now ${!product.isActive ? 'Active' : 'Inactive'}`);
    } catch (error) {
      console.error('Error toggling product status:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update status';
      showError('Update Failed', errorMsg);
    }
  };

  const columns = [
    { header: 'Product Name', accessor: 'name' },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => row.category?.name || 'N/A'
    },
    {
      header: 'Purchase Price',
      accessor: 'purchasePrice',
      render: (row) => formatCurrency(row.purchasePrice || 0)
    },
    {
      header: 'Selling Price',
      accessor: 'sellingPrice',
      render: (row) => formatCurrency(row.sellingPrice || row.price || 0)
    },
    {
      header: 'Stock',
      accessor: 'stock',
      render: (row) => `${row.stock} ${row.unit || ''}`
    },
    {
      header: 'Expiry Date',
      accessor: 'expiryDate',
      render: (row) => row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : 'N/A'
    },
    {
      header: 'Stock Status',
      accessor: 'stockStatus',
      render: (row) => {
        const status = row.stockStatus || 'Fresh';
        let badgeClass = '';
        switch (status) {
          case 'Expired':
            badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
            break;
          case 'Near Expiry':
            badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
            break;
          case 'Dead Stock':
            badgeClass = 'bg-violet-100 text-violet-800 border-violet-200';
            break;
          default:
            badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        }
        return (
          <span className={`px-2 py-1 rounded text-xs font-semibold border ${badgeClass}`}>
            {status}
          </span>
        );
      }
    },
    {
      header: 'Supplier',
      accessor: 'supplier',
      render: (row) => row.supplier?.name || 'N/A'
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (row) => (
        <button
          onClick={() => handleToggleStatus(row)}
          className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
            row.isActive
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
          title="Click to toggle status"
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Products Catalog</h1>
        <p className="text-slate-500 text-xs md:text-sm">Manage and register agricultural products, pricing, and supplier info.</p>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 md:p-6 shadow-soft">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
          {isEditing ? '⚡ Edit Product details' : '➕ Add New Product'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="e.g. Urea 50kg"
              required
            />
            
            <Select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleFormChange}
              options={categories.map((cat) => ({
                value: cat._id,
                label: cat.name
              }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Supplier"
              name="supplier"
              value={formData.supplier}
              onChange={handleFormChange}
              options={suppliers.map((sup) => ({
                value: sup._id,
                label: sup.name
              }))}
              required
            />

            <Select
              label="Unit of Measurement"
              name="unit"
              value={formData.unit}
              onChange={handleFormChange}
              options={PRODUCT_UNITS}
              required
            />

            <Input
              label={isEditing ? "Current Stock" : "Initial Stock"}
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleFormChange}
              placeholder="0"
              required
              min="0"
              disabled={isEditing}
              error={fieldErrors.stock}
            />

            <Input
              label="Reorder Level"
              type="number"
              name="reorderLevel"
              value={formData.reorderLevel}
              onChange={handleFormChange}
              placeholder="10"
              required
              min="0"
              error={fieldErrors.reorderLevel}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Purchase Price (₹)"
              type="number"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleFormChange}
              placeholder="0.00"
              required
              min="0"
              step="0.01"
              error={fieldErrors.purchasePrice}
            />

            <Input
              label="Selling Price (₹)"
              type="number"
              name="sellingPrice"
              value={formData.sellingPrice}
              onChange={handleFormChange}
              placeholder="0.00"
              required
              min="0"
              step="0.01"
              error={fieldErrors.sellingPrice}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Batch Number"
              type="text"
              name="batchNumber"
              value={formData.batchNumber}
              onChange={handleFormChange}
              placeholder="e.g. BATCH-101"
            />

            <Input
              label="Manufacture Date"
              type="date"
              name="manufactureDate"
              value={formData.manufactureDate}
              onChange={handleFormChange}
              error={fieldErrors.manufactureDate}
            />

            <Input
              label="Expiry Date"
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleFormChange}
              error={fieldErrors.expiryDate}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-700 text-xs font-semibold uppercase tracking-wider">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Enter product details..."
              rows="2"
              className="w-full px-3.5 py-2.5 bg-white text-sm text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all hover:border-slate-300"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <Button type="submit" variant="primary" disabled={formLoading}>
              {formLoading ? 'Saving...' : isEditing ? 'Update Product' : 'Add Product'}
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
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Inventory Listings</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {categoryFilter ? 'Showing products from the selected category.' : 'Showing all product categories.'}
            </p>
          </div>
          <Select
            label="Filter by Category"
            name="categoryFilter"
            value={categoryFilter}
            onChange={handleCategoryFilterChange}
            options={categories.map((cat) => ({
              value: cat._id,
              label: cat.name
            }))}
            placeholder="All Categories"
            className="mb-0 md:w-64"
          />
        </div>
        <Table 
          columns={columns} 
          data={products} 
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

export default ProductList;
