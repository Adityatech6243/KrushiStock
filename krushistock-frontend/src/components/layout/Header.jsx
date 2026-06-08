import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getUserInfo } from '../../utils/auth';
import { showConfirm, showSuccess } from '../../utils/alert';
import { Menu, LogOut, User, Store, MoreVertical, Bell, Check } from 'lucide-react';
import Button from '../common/Button';
import { getStoreSettings } from '../../services/settingsService';
import { getNotifications, markAsRead, markAllAsRead } from '../../services/notificationService';

const Header = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const userInfo = getUserInfo();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotifications, setLatestNotifications] = useState([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const fetchHeaderNotifications = async () => {
    try {
      const res = await getNotifications({ page: 1, limit: 5 });
      if (res?.success) {
        setUnreadCount(res.unreadCount || 0);
        setLatestNotifications(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching notifications in header:', err);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const res = await getStoreSettings();
        if (active && res?.success && res?.data) {
          setStoreSettings(res.data);
        }
      } catch (err) {
        console.error('Error fetching settings for header:', err);
      }
    };
    fetchSettings();
    fetchHeaderNotifications();
    
    // Poll every 30 seconds
    const interval = setInterval(() => {
      if (active) fetchHeaderNotifications();
    }, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (notifDropdownOpen) {
      fetchHeaderNotifications();
    }
  }, [notifDropdownOpen]);

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
        {/* Left Side: Store Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 bg-primary-50 rounded-lg text-primary-600 hidden md:block">
              <Store size={18} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-800 tracking-tight leading-tight">
                {storeSettings?.organizationName || 'Mahalaxmi Sheti Seva Kendra'}
              </h2>
              <p className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                {storeSettings?.address ? storeSettings.address.split(',')[0].trim() : 'Hasur Khurd'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Profile Info, Logout & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-4 relative">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-slate-650 hover:text-slate-800 transition-all relative select-none cursor-pointer flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[9px] font-black border border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setNotifDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-150 rounded-xl shadow-soft-lg py-2.5 z-20 animate-fadeIn text-left">
                  <div className="px-4 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Bell size={12} className="text-primary-600" />
                      System Alerts
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          await markAllAsRead();
                          fetchHeaderNotifications();
                        }}
                        className="text-[10px] font-bold text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                    {latestNotifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-400 font-semibold">
                        No new notifications.
                      </div>
                    ) : (
                      latestNotifications.map(n => (
                        <div 
                          key={n._id} 
                          className={`p-3 text-xs transition-colors hover:bg-slate-50 flex items-start gap-2.5 ${!n.isRead ? 'bg-primary-50/20' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-755 font-semibold leading-relaxed break-words">{n.message}</p>
                            <span className="text-[9px] text-slate-400 font-semibold mt-1 block">
                              {new Date(n.timestamp).toLocaleDateString('en-IN')} {new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {!n.isRead && (
                            <button
                              onClick={async () => {
                                await markAsRead(n._id);
                                fetchHeaderNotifications();
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                              title="Mark read"
                            >
                              <Check size={10} className="stroke-[3]" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setNotifDropdownOpen(false);
                        navigate('/notifications');
                      }}
                      className="w-full text-center py-1 text-[11px] font-bold text-primary-600 hover:text-primary-700 block transition-colors cursor-pointer"
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

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

          {/* Mobile Sidebar Toggle (Three Dots Menu) */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label="Toggle Sidebar"
          >
            <MoreVertical size={20} />
          </button>

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
                {userInfo?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    <User size={14} /> Profile Settings
                  </button>
                )}
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
