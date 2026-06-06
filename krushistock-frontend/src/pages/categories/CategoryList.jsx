import React, { useState, useEffect } from 'react';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

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

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Product Categories</h1>
        <p className="text-slate-500 text-xs md:text-sm">Classify and organize agricultural inventory listings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form Section */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-soft lg:col-span-1">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            {isEditing ? '⚡ Edit Category' : '➕ Add New Category'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Category Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="e.g. Fertilizers"
              required
            />
            
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-700 text-xs font-semibold uppercase tracking-wider">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Enter description..."
                rows="3"
                className="w-full px-3.5 py-2.5 bg-white text-sm text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all hover:border-slate-300"
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button type="submit" variant="primary" className="flex-1" disabled={formLoading}>
                {formLoading ? 'Saving...' : isEditing ? 'Update' : 'Add Category'}
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Table Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-soft space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Category Catalog</h2>
            <Table 
              columns={columns} 
              data={categories} 
              loading={loading}
              onEdit={handleEdit} 
              onDelete={handleDelete} 
              pagination={pagination} 
              onPageChange={handlePageChange} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryList;
