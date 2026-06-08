import React, { useState, useEffect } from 'react';
import { getAllUsers, deleteUser, updateUser, createUser } from '../../services/userService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePhone, validateRequired, validateUsername, validatePassword, validateEmail } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { USER_ROLES } from '../../utils/constants';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Edit3, 
  UserCheck, 
  UserX, 
  Key, 
  Phone,
  Mail,
  User
} from 'lucide-react';

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

    const errors = {
      name: validateRequired(formData.name, "Please enter the operator's full name"),
      username: validateUsername(formData.username, 'Please enter a console username'),
      email: validateEmail(formData.email, "Please enter the operator's email address", true),
      phone: formData.phone ? validatePhone(formData.phone, "Please enter the operator's mobile number") : '',
      role: validateRequired(formData.role, 'Please select an assigned role')
    };

    if (!isEditing || formData.password) {
      errors.password = validatePassword(formData.password, 'Please enter a secure password', isEditing);
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    const hasErrors = Object.values(errors).some(err => err && err !== '');
    if (hasErrors) {
      setFieldErrors(errors);
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
    { 
      header: 'Full Name', 
      accessor: 'name', 
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
            {row.name.substring(0, 2)}
          </div>
          <span className="font-bold text-slate-800">{row.name}</span>
        </div>
      ) 
    },
    { header: 'Username', accessor: 'username', render: (row) => <span className="font-semibold text-slate-600">{row.username}</span> },
    { 
      header: 'Contact Info', 
      accessor: 'email', 
      render: (row) => (
        <div className="space-y-0.5 text-[11px] font-semibold text-slate-500">
          <div className="flex items-center gap-1">
            <Mail size={10} className="text-slate-400" />
            <span>{row.email}</span>
          </div>
          {row.phone && (
            <div className="flex items-center gap-1">
              <Phone size={10} className="text-slate-400" />
              <span>{row.phone}</span>
            </div>
          )}
        </div>
      ) 
    },
    {
      header: 'System Role',
      accessor: 'role',
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
            row.role === 'admin'
              ? 'bg-purple-50 text-purple-700 border-purple-100'
              : 'bg-blue-50 text-blue-700 border-blue-105'
          }`}
        >
          {row.role.toUpperCase()}
        </span>
      )
    },
    {
      header: 'Account Status',
      accessor: 'isActive',
      render: (row) => (
        <button
          onClick={() => handleToggleStatus(row)}
          className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold cursor-pointer transition-colors border flex items-center gap-1 ${
            row.isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
              : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
          }`}
          title="Click to toggle account status"
        >
          {row.isActive ? (
            <>
              <UserCheck size={10} />
              Active
            </>
          ) : (
            <>
              <UserX size={10} />
              Inactive
            </>
          )}
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Users className="text-primary-600" size={24} />
          Staff & Operator Management
        </h1>
        <p className="text-slate-500 text-xs md:text-sm">Manage billing operators, inventory administrators, roles, and console access permissions.</p>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
          <UserPlus size={16} className="text-primary-600" />
          {isEditing ? 'Modify Operator Credentials' : 'Register New Operator'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Full Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="e.g. Aditya Patil"
              required
              error={fieldErrors.name}
            />

            <Input
              label="Phone Number"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              placeholder="e.g. 9876543210"
              required
              error={fieldErrors.phone}
            />

            <Input
              label="Console Username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleFormChange}
              placeholder="e.g. aditya_operator"
              required
              error={fieldErrors.username}
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              placeholder="e.g. aditya@gmail.com"
              required
              error={fieldErrors.email}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Select
                label="Assigned Role"
                name="role"
                value={formData.role}
                onChange={handleFormChange}
                options={[
                  { value: USER_ROLES.ADMIN, label: 'Admin (Full Access)' },
                  { value: USER_ROLES.STAFF, label: 'Staff (Billing & Stock)' }
                ]}
                required
                error={fieldErrors.role}
              />
            </div>

            <Input
              label={isEditing ? "Update Password (Optional)" : "Password"}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleFormChange}
              placeholder={isEditing ? "•••••• (leave blank to keep)" : "•••••• (min 6 chars)"}
              required={!isEditing}
              error={fieldErrors.password}
            />

            <Input
              label={isEditing ? "Confirm Password Update" : "Confirm Password"}
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleFormChange}
              placeholder="••••••"
              required={!isEditing && formData.password.length > 0}
              error={fieldErrors.confirmPassword}
            />
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-bold">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" variant="primary" disabled={formLoading} className="text-xs font-bold py-2 px-5">
              {formLoading ? 'Processing...' : isEditing ? 'Update Operator' : 'Register Operator'}
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                className="text-xs font-bold py-2 px-5"
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
          <Users size={16} className="text-slate-400" />
          Active System Operators
        </h2>
        <div className="overflow-hidden border border-slate-100 rounded-xl">
          <Table 
            columns={columns} 
            data={users} 
            loading={loading}
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            pagination={pagination} 
            onPageChange={handlePageChange} 
          />
        </div>
      </div>
    </div>
  );
};

export default UserList;
