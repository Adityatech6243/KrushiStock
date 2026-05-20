import React, { useState, useEffect } from 'react';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Form state
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchCategories(pagination.page);
  }, [pagination.page]);

  const fetchCategories = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getAllCategories(page, 10);
      setCategories(response.data);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (isEditing) {
        await updateCategory(editId, formData);
        showSuccess('Success!', 'Category updated successfully!');
      } else {
        await createCategory(formData);
        showSuccess('Success!', 'Category added successfully!');
      }
      resetForm();
      fetchCategories(pagination.page);
    } catch (error) {
      console.error('Error saving category:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save category. Please try again.';
      showError('Error', errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (category) => {
    setIsEditing(true);
    setEditId(category._id);
    setFormData({
      name: category.name || '',
      description: category.description || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({ name: '', description: '' });
  };

  const handleDelete = async (category) => {
    const isConfirmed = await showConfirm(
      'Delete Category?',
      `Are you sure you want to delete ${category.name}?`
    );

    if (isConfirmed) {
      try {
        await deleteCategory(category._id);
        setCategories(categories.filter(c => c._id !== category._id));
        showSuccess('Deleted!', 'Category has been deleted successfully.');
        if (isEditing && editId === category._id) {
          resetForm();
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        const errorMsg = error.response?.data?.message || 'Failed to delete category';
        showError('Delete Failed', errorMsg);
      }
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Description', accessor: 'description' },
    {
      header: 'Products',
      accessor: 'productCount',
      render: (row) => row.productCount || 0
    }
  ];

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
        <p className="text-gray-600">Manage product categories</p>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Category' : 'Add New Category'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Category Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Enter category name"
              required
            />
            <div className="flex flex-col">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Enter category description"
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button type="submit" variant="primary" disabled={formLoading}>
              {formLoading ? 'Saving...' : isEditing ? 'Update Category' : 'Add Category'}
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
        <h2 className="text-lg font-semibold mb-4">Category List</h2>
        <Table 
          columns={columns} 
          data={categories} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
          pagination={pagination} 
          onPageChange={handlePageChange} 
        />
      </div>
    </div>
  );
};

export default CategoryList;
