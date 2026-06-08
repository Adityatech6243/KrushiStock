import React, { useState, useEffect } from 'react';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../../services/notificationService';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { 
  Bell, 
  Trash2, 
  Check, 
  CheckCheck, 
  AlertTriangle, 
  DollarSign, 
  FileText,
  Clock,
  Filter,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/alert';

const NotificationInbox = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async (currentPage = 1, shouldFilterUnread = filterUnread) => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10
      };
      if (shouldFilterUnread) {
        params.isRead = 'false';
      }
      const res = await getNotifications(params);
      if (res?.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount || 0);
        setTotalPages(res.pagination?.pages || 1);
        setPage(currentPage);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1, filterUnread);
  }, [filterUnread]);

  const handleMarkRead = async (id) => {
    try {
      const res = await markAsRead(id);
      if (res?.success) {
        setNotifications(prev => 
          prev.map(n => n._id === id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await markAllAsRead();
      if (res?.success) {
        showSuccess('All Read', 'All notifications marked as read.');
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      showError('Action Failed', 'Could not mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteNotification(id);
      if (res?.success) {
        setNotifications(prev => prev.filter(n => n._id !== id));
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'low_stock':
        return (
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shadow-soft">
            <AlertTriangle size={18} className="stroke-[2.5]" />
          </div>
        );
      case 'payment_reminder':
        return (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 shadow-soft">
            <DollarSign size={18} className="stroke-[2.5]" />
          </div>
        );
      case 'invoice':
        return (
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-soft">
            <FileText size={18} className="stroke-[2.5]" />
          </div>
        );
      default:
        return (
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100 shadow-soft">
            <Bell size={18} className="stroke-[2.5]" />
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Bell className="text-primary-600" size={24} />
            Notification Center
          </h1>
          <p className="text-slate-500 text-xs md:text-sm">
            Read and manage system low-stock warnings, farmer payment notifications, and database event messages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              disabled={markingAll}
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs font-bold py-2"
            >
              <CheckCheck size={14} />
              {markingAll ? 'Marking...' : 'Mark All Read'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => fetchNotifications(1)}
            className="flex items-center gap-1 text-xs font-semibold py-2"
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Filters & Count */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-soft">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterUnread(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !filterUnread
                ? 'bg-slate-100 text-slate-800'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setFilterUnread(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterUnread
                ? 'bg-primary-50 text-primary-600'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Unread Only
            {unreadCount > 0 && (
              <span className="bg-primary-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {unreadCount} Unread Alerts Total
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader size="md" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-slate-50 text-slate-400 border border-slate-100 rounded-full">
            <Sparkles size={32} />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Inbox Cleared</h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            There are no notifications matching the filter criteria. Nice and clean!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className={`bg-white p-4 rounded-xl border transition-all flex items-start gap-4 hover:border-slate-200 hover:shadow-soft ${
                notif.isRead 
                  ? 'border-slate-100 opacity-80' 
                  : 'border-l-4 border-l-primary-500 border-slate-150 shadow-soft'
              }`}
            >
              {getIcon(notif.type)}

              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                    {notif.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 ml-auto">
                    <Clock size={10} />
                    {new Date(notif.timestamp).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed break-words pr-4">
                  {notif.message}
                </p>
                <div className="text-[9px] font-bold text-slate-400">
                  RECIPIENT: <span className="text-slate-650">{notif.recipient}</span>
                  {notif.status === 'failed' && (
                    <span className="text-rose-600 font-black ml-2 uppercase">
                      • Failed to send WhatsApp ({notif.error || 'API error'})
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 print:hidden self-center">
                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkRead(notif._id)}
                    title="Mark as Read"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <Check size={14} className="stroke-[3]" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(notif._id)}
                  title="Delete"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => fetchNotifications(page - 1)}
                className="text-xs py-1"
              >
                Previous
              </Button>
              <span className="text-xs font-bold text-slate-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => fetchNotifications(page + 1)}
                className="text-xs py-1"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationInbox;
