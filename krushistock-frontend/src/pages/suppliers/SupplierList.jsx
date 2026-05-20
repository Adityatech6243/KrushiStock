import React, { useState, useEffect } from 'react';
import { getAllSuppliers, deleteSupplier, updateSupplier, createSupplier } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePhone } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';

const SupplierList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    gst: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    fetchSuppliers(pagination.page);
  }, [pagination.page]);

  const fetchSuppliers = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getAllSuppliers(page, 10);
      setSuppliers(response.data);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
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
    
    const phoneError = validatePhone(formData.phone);
    if (phoneError) {
      setFieldErrors({ phone: phoneError });
      return;
    }

    setFormLoading(true);

    try {
      if (isEditing) {
        await updateSupplier(editId, formData);
        showSuccess('Success!', 'Supplier updated successfully!');
      } else {
        await createSupplier(formData);
        showSuccess('Success!', 'Supplier added successfully!');
      }
      resetForm();
      fetchSuppliers(pagination.page);
    } catch (error) {
      console.error('Error saving supplier:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save supplier. Please try again.';
      showError('Error', errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (supplier) => {
    setIsEditing(true);
    setEditId(supplier._id);
    setFormData({
      name: supplier.name || '',
      contact: supplier.contact || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gst: supplier.gst || ''
    });
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      name: '',
      contact: '',
      phone: '',
      email: '',
      address: '',
      gst: ''
    });
    setFieldErrors({});
  };

  const handleDelete = async (supplier) => {
    const isConfirmed = await showConfirm(
      'Delete Supplier?',
      `Are you sure you want to delete ${supplier.name}?`
    );
    
    if (isConfirmed) {
      try {
        await deleteSupplier(supplier._id);
        setSuppliers(suppliers.filter(s => s._id !== supplier._id));
        showSuccess('Deleted!', 'Supplier has been deleted successfully.');
        if (isEditing && editId === supplier._id) {
          resetForm();
        }
      } catch (error) {
        console.error('Error deleting supplier:', error);
        const errorMsg = error.response?.data?.message || 'Failed to delete supplier';
        showError('Delete Failed', errorMsg);
      }
    }
  };

  const handleToggleStatus = async (supplier) => {
    try {
      await updateSupplier(supplier._id, { isActive: !supplier.isActive });
      setSuppliers(suppliers.map(s => s._id === supplier._id ? { ...s, isActive: !s.isActive } : s));
      showSuccess('Status Updated', `Supplier is now ${!supplier.isActive ? 'Active' : 'Inactive'}`);
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update status';
      showError('Update Failed', errorMsg);
    }
  };

  const columns = [
    { header: 'Supplier Name', accessor: 'name' },
    { header: 'Contact Person', accessor: 'contact' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Email', accessor: 'email' },
    { header: 'Address', accessor: 'address' },
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

  if (loading && suppliers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
        <p className="text-gray-600">Manage your suppliers</p>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Supplier Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Enter supplier name"
              required
            />

            <Input
              label="Contact Person"
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleFormChange}
              placeholder="Enter contact person name"
              required
            />

            <Input
              label="Phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              placeholder="Enter phone number"
              required
              error={fieldErrors.phone}
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="mt-4">
            <Input
              label="GST Number"
              type="text"
              name="gst"
              value={formData.gst}
              onChange={handleFormChange}
              placeholder="Enter GST number"
            />
          </div>

          <div className="mt-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleFormChange}
              placeholder="Enter complete address"
              rows="2"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-3 mt-4">
            <Button type="submit" variant="primary" disabled={formLoading}>
              {formLoading ? 'Saving...' : isEditing ? 'Update Supplier' : 'Add Supplier'}
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
        <h2 className="text-lg font-semibold mb-4">Supplier List</h2>
        <Table 
          columns={columns} 
          data={suppliers} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
          pagination={pagination} 
          onPageChange={handlePageChange} 
        />
      </div>
    </div>
  );
};

export default SupplierList;
