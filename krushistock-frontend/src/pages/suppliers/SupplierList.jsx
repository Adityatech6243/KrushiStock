import React, { useState, useEffect } from 'react';
import { getAllSuppliers, deleteSupplier, updateSupplier, createSupplier } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePhone, validateRequired, validateEmail, validateGst } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { getUserInfo } from '../../utils/auth';

const SupplierList = () => {
  const isAdmin = getUserInfo()?.role === 'admin';
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
    
    const errors = {
      name: validateRequired(formData.name, 'Please enter the supplier name'),
      contact: validateRequired(formData.contact, "Please enter the contact person's name"),
      phone: validatePhone(formData.phone, 'Please enter the supplier phone number'),
      email: validateEmail(formData.email, "Please enter the supplier's email address", true),
      address: validateRequired(formData.address, 'Please enter the complete supplier address'),
      gst: validateGst(formData.gst, 'Please enter a valid 15-character GSTIN format')
    };

    const hasErrors = Object.values(errors).some(err => err && err !== '');
    if (hasErrors) {
      setFieldErrors(errors);
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

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Suppliers Base</h1>
        <p className="text-slate-500 text-xs md:text-sm">Manage inventory distributors, contract contacts, and tax IDs (GST).</p>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 md:p-6 shadow-soft">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
          {isEditing ? '⚡ Edit Supplier details' : '➕ Register New Supplier'}
        </h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Supplier Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="e.g. Mahadhan Ltd"
              required
              error={fieldErrors.name}
            />

            <Input
              label="Contact Person"
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleFormChange}
              placeholder="e.g. Anand Kulkarni"
              required
              error={fieldErrors.contact}
            />

            <Input
              label="Phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              placeholder="e.g. 9876543210"
              required
              error={fieldErrors.phone}
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              placeholder="supplier@domain.com"
              required
              error={fieldErrors.email}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input
              label="GST Number (Tax ID)"
              type="text"
              name="gst"
              value={formData.gst}
              onChange={handleFormChange}
              placeholder="e.g. 27AAAAA1111A1Z1"
              error={fieldErrors.gst}
            />
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-slate-700 text-xs font-semibold uppercase tracking-wider">
              Complete Address <span className="text-rose-500 ml-1">*</span>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleFormChange}
              placeholder="Enter building, street, city..."
              rows="2"
              required
              className={`w-full px-3.5 py-2.5 bg-white text-sm text-slate-800 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.address 
                  ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' 
                  : 'border-slate-200 hover:border-slate-300 focus:ring-primary-500/20 focus:border-primary-500'
              }`}
            />
            {fieldErrors.address && <p className="text-rose-600 text-xs font-medium mt-0.5">{fieldErrors.address}</p>}
          </div>

          <div className="flex gap-2.5 mt-6 border-t border-slate-100 pt-4">
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
      <div className="bg-white rounded-xl border border-slate-100 p-5 md:p-6 shadow-soft space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Supplier Directory</h2>
        <Table 
          columns={columns} 
          data={suppliers} 
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

export default SupplierList;
