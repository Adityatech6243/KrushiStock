import React, { useState, useEffect } from 'react';
import { getAllProducts, createProduct, updateProduct, deleteProduct, getAllCategories, getAllSuppliers } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePositiveNumber } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Loader from '../../components/common/Loader';
import { formatCurrency } from '../../utils/helpers';
import { PRODUCT_UNITS } from '../../utils/constants';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    supplier: '',
    price: '',
    stock: '',
    unit: '',
    reorderLevel: '',
    description: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    fetchProducts(pagination.page);
    fetchCategories();
    fetchSuppliers();
  }, [pagination.page]);

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getAllProducts(page, 10);
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
      const response = await getAllCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
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

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
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
      price: validatePositiveNumber(formData.price, 'Price'),
      stock: validatePositiveNumber(formData.stock, 'Stock'),
      reorderLevel: validatePositiveNumber(formData.reorderLevel, 'Reorder Level')
    };

    const hasErrors = Object.values(errors).some(err => err !== '');
    if (hasErrors) {
      setFieldErrors(errors);
      return;
    }

    setFormLoading(true);

    try {
      if (isEditing) {
        await updateProduct(editId, formData);
        showSuccess('Success!', 'Product updated successfully!');
      } else {
        await createProduct(formData);
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
      stock: product.stock || '',
      unit: product.unit || '',
      reorderLevel: product.reorderLevel || '',
      description: product.description || ''
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
      stock: '',
      unit: '',
      reorderLevel: '',
      description: ''
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
      header: 'Price',
      accessor: 'price',
      render: (row) => formatCurrency(row.price)
    },
    {
      header: 'Stock',
      accessor: 'stock',
      render: (row) => `${row.stock} ${row.unit || ''}`
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

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <p className="text-gray-600">Manage your product inventory</p>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Enter product name"
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <Input
              label="Price (₹)"
              type="number"
              name="price"
              value={formData.price}
              onChange={handleFormChange}
              placeholder="0.00"
              required
              min="0"
              step="0.01"
              error={fieldErrors.price}
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
              disabled={isEditing} // usually stock is updated via purchases/sales after initial creation
              error={fieldErrors.stock}
            />

            <Select
              label="Unit of Measurement"
              name="unit"
              value={formData.unit}
              onChange={handleFormChange}
              options={PRODUCT_UNITS}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="flex flex-col">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Enter product details"
                rows="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Product List</h2>
        <Table 
          columns={columns} 
          data={products} 
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
