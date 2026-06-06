import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getUserInfo } from '../../utils/auth';
import { showConfirm, showSuccess } from '../../utils/alert';
import { Menu, LogOut, User, Store } from 'lucide-react';
import Button from '../common/Button';

const Header = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const userInfo = getUserInfo();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

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
    <header className="bg-white/95 border-b border-slate-200/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-6 py-3.5 print:hidden">
      <div className="flex justify-between items-center">
        {/* Left Side: Mobile Toggle & Store Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 bg-primary-50 rounded-lg text-primary-600 hidden md:block">
              <Store size={18} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-800 tracking-tight leading-tight">
                Mahalaxmi Sheti Seva Kendra
              </h2>
              <p className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                Hasur Khurd 
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Profile Info & Logout */}
        <div className="flex items-center gap-4 relative">
          <div 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 hover:bg-slate-50 border border-transparent hover:border-slate-150 rounded-xl cursor-pointer transition-all select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
              {userInfo?.name ? userInfo.name.charAt(0).toUpperCase() : <User size={16} />}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-700 leading-tight">{userInfo?.name || 'Staff'}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{userInfo?.role || 'Operator'}</p>
            </div>
          </div>

          {profileDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-150 rounded-xl shadow-soft-lg py-1.5 z-20 animate-fadeIn">
                <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                  <p className="text-xs font-bold text-slate-700 leading-tight">{userInfo?.name || 'Staff'}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{userInfo?.role || 'Operator'}</p>
                </div>
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  <User size={14} /> Profile Settings
                </button>
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border-t border-slate-100 flex items-center gap-2 transition-colors"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
