import React, { useState, useEffect } from 'react';
import { getAllFarmers, deleteFarmer, updateFarmer, createFarmer } from '../../services/farmerService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePhone } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';

const FarmerList = () => {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    village: '',
    district: '',
    landSize: '',
    crops: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    fetchFarmers(pagination.page);
  }, [pagination.page]);

  const fetchFarmers = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getAllFarmers(page, 10);
      setFarmers(response.data);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching farmers:', error);
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
        await updateFarmer(editId, formData);
        showSuccess('Success!', 'Farmer updated successfully!');
      } else {
        await createFarmer(formData);
        showSuccess('Success!', 'Farmer added successfully!');
      }
      resetForm();
      fetchFarmers(pagination.page);
    } catch (error) {
      console.error('Error saving farmer:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save farmer. Please try again.';
      showError('Error', errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (farmer) => {
    setIsEditing(true);
    setEditId(farmer._id);
    setFormData({
      name: farmer.name || '',
      phone: farmer.phone || '',
      email: farmer.email || '',
      village: farmer.village || '',
      district: farmer.district || '',
      landSize: farmer.landSize || '',
      crops: farmer.crops || ''
    });
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      village: '',
      district: '',
      landSize: '',
      crops: ''
    });
    setFieldErrors({});
  };

  const handleDelete = async (farmer) => {
    const isConfirmed = await showConfirm(
      'Delete Farmer?',
      `Are you sure you want to delete ${farmer.name}?`
    );
    
    if (isConfirmed) {
      try {
        await deleteFarmer(farmer._id);
        setFarmers(farmers.filter(f => f._id !== farmer._id));
        showSuccess('Deleted!', 'Farmer has been deleted successfully.');
        if (isEditing && editId === farmer._id) {
          resetForm();
        }
      } catch (error) {
        console.error('Error deleting farmer:', error);
        const errorMsg = error.response?.data?.message || 'Failed to delete farmer';
        showError('Delete Failed', errorMsg);
      }
    }
  };

  const handleToggleStatus = async (farmer) => {
    try {
      await updateFarmer(farmer._id, { isActive: !farmer.isActive });
      setFarmers(farmers.map(f => f._id === farmer._id ? { ...f, isActive: !f.isActive } : f));
      showSuccess('Status Updated', `Farmer is now ${!farmer.isActive ? 'Active' : 'Inactive'}`);
    } catch (error) {
      console.error('Error toggling farmer status:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update status';
      showError('Update Failed', errorMsg);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Village', accessor: 'village' },
    { header: 'Land Size', accessor: 'landSize' },
    {
      header: 'Total Purchases',
      accessor: 'totalPurchases',
      render: (row) => `₹${row.totalPurchases || 0}`
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

  if (loading && farmers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Farmers</h1>
        <p className="text-gray-600">Manage farmer/customer database</p>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Farmer' : 'Add New Farmer'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Farmer Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Enter farmer name"
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
            />

            <Input
              label="Village"
              type="text"
              name="village"
              value={formData.village}
              onChange={handleFormChange}
              placeholder="Enter village name"
              required
            />

            <Input
              label="District"
              type="text"
              name="district"
              value={formData.district}
              onChange={handleFormChange}
              placeholder="Enter district"
              required
            />

            <Input
              label="Land Size"
              type="text"
              name="landSize"
              value={formData.landSize}
              onChange={handleFormChange}
              placeholder="e.g., 5 acres"
            />
          </div>

          <div className="mt-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Crops Grown
            </label>
            <textarea
              name="crops"
              value={formData.crops}
              onChange={handleFormChange}
              placeholder="e.g., Wheat, Rice, Cotton"
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-3 mt-4">
            <Button type="submit" variant="primary" disabled={formLoading}>
              {formLoading ? 'Saving...' : isEditing ? 'Update Farmer' : 'Add Farmer'}
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
        <h2 className="text-lg font-semibold mb-4">Farmer List</h2>
        <Table 
          columns={columns} 
          data={farmers} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
          pagination={pagination} 
          onPageChange={handlePageChange} 
        />
      </div>
    </div>
  );
};

export default FarmerList;
