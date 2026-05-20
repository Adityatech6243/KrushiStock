import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getUserInfo } from '../../utils/auth';
import { showConfirm, showSuccess } from '../../utils/alert';
import Button from '../common/Button';

const Header = () => {
  const navigate = useNavigate();
  const userInfo = getUserInfo();

  const handleLogout = async () => {
    const isConfirmed = await showConfirm(
      'Logout?',
      'Are you sure you want to logout from the system?'
    );

    if (isConfirmed) {
      logout();
      showSuccess('Logged Out', 'You have been successfully logged out.');
      navigate('/login');
    }
  };

  return (
    <header className="bg-green-700 shadow-md border-b border-green-800 px-6 py-4 print:hidden">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Mahalaxmi Sheti Seva Kendra</h2>
          <p className="text-sm text-green-100 font-medium">Agriculture & Inventory Management</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{userInfo?.name || 'User'}</p>
            <p className="text-xs text-green-200">{userInfo?.role || 'Staff'}</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleLogout} className="shadow-sm border border-red-600">
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
