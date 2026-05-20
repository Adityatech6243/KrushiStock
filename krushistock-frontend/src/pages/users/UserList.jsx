import React, { useState, useEffect } from 'react';
import { getAllUsers, deleteUser, updateUser, createUser } from '../../services/userService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePhone } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Loader from '../../components/common/Loader';
import { USER_ROLES } from '../../utils/constants';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
    phone: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    fetchUsers(pagination.page);
  }, [pagination.page]);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getAllUsers(page, 10);
      setUsers(response.data);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching users:', error);
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
    setError('');
    
    if (fieldErrors[e.target.name]) {
      setFieldErrors({
        ...fieldErrors,
        [e.target.name]: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password || !isEditing) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    const phoneError = validatePhone(formData.phone);
    if (phoneError) {
      setFieldErrors({ phone: phoneError });
      return;
    }

    setFormLoading(true);

    try {
      const { confirmPassword, ...userData } = formData;
      
      // If editing and no new password provided, don't send password field
      if (isEditing && !userData.password) {
        delete userData.password;
      }

      if (isEditing) {
        await updateUser(editId, userData);
        showSuccess('Success!', 'User updated successfully!');
      } else {
        await createUser(userData);
        showSuccess('Success!', 'User added successfully!');
      }
      resetForm();
      fetchUsers(pagination.page);
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save user. Username or email may already exist.';
      setError(errorMsg);
      showError('Error', errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (user) => {
    setIsEditing(true);
    setEditId(user._id);
    setFormData({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      role: user.role || 'staff',
      phone: user.phone || ''
    });
    setError('');
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'staff',
      phone: ''
    });
    setError('');
    setFieldErrors({});
  };

  const handleDelete = async (user) => {
    const isConfirmed = await showConfirm(
      'Delete User?',
      `Are you sure you want to delete user ${user.name}?`
    );
    
    if (isConfirmed) {
      try {
        await deleteUser(user._id);
        setUsers(users.filter(u => u._id !== user._id));
        showSuccess('Deleted!', 'User has been deleted successfully.');
        if (isEditing && editId === user._id) {
          resetForm();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        const errorMsg = error.response?.data?.message || 'Failed to delete user';
        showError('Delete Failed', errorMsg);
      }
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await updateUser(user._id, { isActive: !user.isActive });
      setUsers(users.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
      showSuccess('Status Updated', `User is now ${!user.isActive ? 'Active' : 'Inactive'}`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update status';
      showError('Update Failed', errorMsg);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Username', accessor: 'username' },
    { header: 'Email', accessor: 'email' },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            row.role === 'admin'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {row.role.toUpperCase()}
        </span>
      )
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

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Users</h1>
        <p className="text-gray-600">Manage system users and permissions</p>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit User' : 'Add New User'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Enter full name"
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
              label="Username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleFormChange}
              placeholder="Enter username"
              required
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
            <Select
              label="Role"
              name="role"
              value={formData.role}
              onChange={handleFormChange}
              options={[
                { value: USER_ROLES.ADMIN, label: 'Admin' },
                { value: USER_ROLES.STAFF, label: 'Staff' }
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input
              label={isEditing ? "New Password (Optional)" : "Password"}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleFormChange}
              placeholder={isEditing ? "Leave blank to keep current password" : "Enter password"}
              required={!isEditing}
            />

            <Input
              label={isEditing ? "Confirm New Password" : "Confirm Password"}
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleFormChange}
              placeholder="Confirm password"
              required={!isEditing && formData.password.length > 0}
            />
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button type="submit" variant="primary" disabled={formLoading}>
              {formLoading ? 'Saving...' : isEditing ? 'Update User' : 'Add User'}
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
        <h2 className="text-lg font-semibold mb-4">User List</h2>
        <Table 
          columns={columns} 
          data={users} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
          pagination={pagination} 
          onPageChange={handlePageChange} 
        />
      </div>
    </div>
  );
};

export default UserList;
