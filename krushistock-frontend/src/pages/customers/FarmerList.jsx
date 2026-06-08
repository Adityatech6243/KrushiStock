import React, { useState, useEffect } from 'react';
import { getAllFarmers, deleteFarmer, updateFarmer, createFarmer } from '../../services/farmerService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePhone, validateRequired, validateEmail } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { Link } from 'react-router-dom';
import { getUserInfo } from '../../utils/auth';

const FarmerList = () => {
  const isAdmin = getUserInfo()?.role === 'admin';
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [villageFilter, setVillageFilter] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    village: '',
    district: '',
    state: 'Maharashtra',
    soilType: 'Loamy',
    landSize: '',
    crops: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    fetchFarmers(pagination.page);
  }, [pagination.page, villageFilter]);

  const fetchFarmers = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getAllFarmers(page, 10, { village: villageFilter.trim() });
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

  const handleVillageFilterChange = (e) => {
    setVillageFilter(e.target.value);
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
      name: validateRequired(formData.name, "Please enter the farmer's full name"),
      phone: validatePhone(formData.phone, "Please enter the farmer's mobile number"),
      village: validateRequired(formData.village, 'Please enter the village name'),
      district: validateRequired(formData.district, 'Please enter the district name'),
      email: validateEmail(formData.email, 'Please enter a valid email address', false)
    };

    const hasErrors = Object.values(errors).some(err => err && err !== '');
    if (hasErrors) {
      setFieldErrors(errors);
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
      state: farmer.state || 'Maharashtra',
      soilType: farmer.soilType || 'Loamy',
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
      state: 'Maharashtra',
      soilType: 'Loamy',
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
    { header: 'Soil Type', accessor: 'soilType' },
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
    },
    {
      header: 'Recommendations',
      accessor: '_id',
      render: (row) => (
        <Link
          to={`/dashboard/farmers/${row._id}/recommendations`}
          className="bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-fit border border-green-200 transition-all hover:shadow-sm"
        >
          💡 Recommend
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Farmers Base</h1>
        <p className="text-slate-500 text-xs md:text-sm">Manage customer profiles, soil conditions, land details, and purchase values.</p>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 md:p-6 shadow-soft">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
          {isEditing ? '⚡ Edit Farmer Profile' : '➕ Register New Farmer'}
        </h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Farmer Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="e.g. Ramesh Patil"
              required
              error={fieldErrors.name}
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
              placeholder="name@email.com"
              error={fieldErrors.email}
            />

            <Input
              label="Village"
              type="text"
              name="village"
              value={formData.village}
              onChange={handleFormChange}
              placeholder="e.g. Hasur"
              required
              error={fieldErrors.village}
            />

            <Input
              label="District"
              type="text"
              name="district"
              value={formData.district}
              onChange={handleFormChange}
              placeholder="e.g. Kolhapur"
              required
              error={fieldErrors.district}
            />

            <Input
              label="State"
              type="text"
              name="state"
              value={formData.state}
              onChange={handleFormChange}
              placeholder="Maharashtra"
            />

            <Select
              label="Soil Type"
              name="soilType"
              value={formData.soilType}
              onChange={handleFormChange}
              options={['Black', 'Red', 'Alluvial', 'Sandy', 'Loamy', 'Clayey', 'Laterite', 'Other']}
              required
            />

            <Input
              label="Land Size"
              type="text"
              name="landSize"
              value={formData.landSize}
              onChange={handleFormChange}
              placeholder="e.g. 5 acres"
            />
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-slate-700 text-xs font-semibold uppercase tracking-wider">
              Crops Grown
            </label>
            <textarea
              name="crops"
              value={formData.crops}
              onChange={handleFormChange}
              placeholder="e.g. Sugarcane, Cotton, Soyabean"
              rows="2"
              className="w-full px-3.5 py-2.5 bg-white text-sm text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all hover:border-slate-300"
            />
          </div>

          <div className="flex gap-2.5 mt-6 border-t border-slate-100 pt-4">
            <Button type="submit" variant="primary" disabled={formLoading}>
              {formLoading ? 'Saving...' : isEditing ? 'Update Profile' : 'Add Farmer'}
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
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Farmer database</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {villageFilter ? `Showing farmers matching "${villageFilter}".` : 'Showing farmers from all villages.'}
            </p>
          </div>
          <Input
            label="Filter by Village"
            type="text"
            name="villageFilter"
            value={villageFilter}
            onChange={handleVillageFilterChange}
            placeholder="Type village name..."
            className="mb-0 md:w-64"
          />
        </div>
        <Table 
          columns={columns} 
          data={farmers} 
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

export default FarmerList;
