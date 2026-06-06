import React, { useState, useEffect } from 'react';
import { getWasteAnalytics } from '../../services/inventoryService';
import { formatCurrency } from '../../utils/helpers';
import Loader from '../../components/common/Loader';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Sparkles, Brain, AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, Archive, DollarSign, Package, Hourglass } from 'lucide-react';

const WasteAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await getWasteAnalytics();
      if (response?.success) {
        setAnalyticsData(response.data);
      }
    } catch (error) {
      console.error('Error fetching waste analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!analyticsData) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="border-b border-slate-100 pb-4">
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Waste & Shelf-Life Analytics</h1>
          <p className="text-slate-500 text-xs md:text-sm">Visualize losses, identify waste-prone categories, and review smart alerts.</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl shadow-soft p-10 text-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader size="md" />
              <p className="text-xs font-semibold text-slate-500">Loading analytics data...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-700">No Analytics Data Available</h2>
              <p className="text-gray-500 mt-2">Please ensure you have products and transactions recorded in the system.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const { summary, categoryBreakdown, monthlyExpirations, smartAlerts } = analyticsData;

  // 1. Data for Stock Status Pie Chart
  const pieData = [
    { name: 'Fresh Stock', value: summary.fresh?.count || 0, color: '#10b981' },
    { name: 'Near Expiry', value: summary.nearExpiry?.count || 0, color: '#f59e0b' },
    { name: 'Expired', value: summary.expired?.count || 0, color: '#ef4444' },
    { name: 'Dead Stock', value: summary.deadStock?.count || 0, color: '#8b5cf6' }
  ].filter(item => item.value > 0);

  // 2. Data for Category Breakdown stacked bar chart (using categoryBreakdown directly)
  // 3. Data for Monthly Expirations (using monthlyExpirations directly)

  // Custom Pie Chart tooltip
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
          <p className="font-semibold text-sm text-gray-800">{data.name}</p>
          <p className="text-xs text-gray-600">Count: <span className="font-bold">{data.value} items</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Waste & Shelf-Life Analytics</h1>
        <p className="text-slate-500 text-xs md:text-sm">Visualize losses, identify waste-prone categories, and review smart alerts.</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Capital Active</span>
            <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(summary.totalInventoryValue || 0)}</div>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-150">
            <Package size={18} className="stroke-[2.5]" />
          </div>
        </div>

        {/* Near Expiry Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-amber-500 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">Near Expiry Risk</span>
            <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(summary.nearExpiry?.value || 0)}</div>
            <span className="text-[10px] text-slate-400 font-semibold">{summary.nearExpiry?.count || 0} products at risk</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Hourglass size={18} className="stroke-[2.5]" />
          </div>
        </div>

        {/* Expired Loss */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-rose-500 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-rose-600 text-[10px] font-bold uppercase tracking-wider">Expired Losses</span>
            <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(summary.expired?.value || 0)}</div>
            <span className="text-[10px] text-slate-400 font-semibold">{summary.expired?.count || 0} items written off</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
            <ShieldAlert size={18} className="stroke-[2.5]" />
          </div>
        </div>

        {/* Dead Stock Capital */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft border-l-4 border-l-violet-500 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-violet-600 text-[10px] font-bold uppercase tracking-wider">Dead Stock Value</span>
            <div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(summary.deadStock?.value || 0)}</div>
            <span className="text-[10px] text-slate-400 font-semibold">{summary.deadStock?.count || 0} slow-moving products</span>
          </div>
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl border border-violet-100">
            <Archive size={18} className="stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Main Charts Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie: Stock Status Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Inventory Health Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Proportional classification of stock status counts.</p>
          </div>
          <div className="h-64 flex items-center justify-center relative">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-405 text-xs font-semibold">No products found</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold border-t border-slate-50 pt-3 text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span>Fresh Stock ({summary.fresh?.count || 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span>Near Expiry ({summary.nearExpiry?.count || 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
              <span>Expired ({summary.expired?.count || 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500"></span>
              <span>Dead Stock ({summary.deadStock?.count || 0})</span>
            </div>
          </div>
        </div>

        {/* Area/Line: Monthly Expirations Value Trend */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Upcoming Expiration Timeline</h3>
            <p className="text-xs text-slate-400 mt-0.5">Estimated value (₹) of active stock expiring in upcoming months.</p>
          </div>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyExpirations}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-[10px] font-bold text-slate-400" />
                <YAxis tickLine={false} axisLine={false} className="text-[10px] font-bold text-slate-400" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                  formatter={(value) => [`₹${value}`, 'Expiring Value']} 
                />
                <Area type="monotone" dataKey="value" stroke="#f59e0b" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stacked Bar: Category Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft lg:col-span-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Inventory Status by Category</h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribution of stock health across categories.</p>
          </div>
          <div className="h-80 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="categoryName" tickLine={false} axisLine={false} className="text-[10px] font-bold text-slate-400" />
                <YAxis tickLine={false} axisLine={false} className="text-[10px] font-bold text-slate-400" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px', fontWeight: '600', color: '#475569' }} />
                <Bar dataKey="fresh" name="Fresh" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="nearExpiry" name="Near Expiry" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="expired" name="Expired" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="deadStock" name="Dead Stock" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI & Smart Recommendation Logs */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Brain size={16} className="text-primary-600" />
              Smart Waste Reduction Actions
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Automated strategies generated based on inventory analysis.</p>
          </div>
          <Link
            to="/dashboard/expiry-management"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Go to Management Page &rarr;
          </Link>
        </div>

        <div className="space-y-3">
          {smartAlerts && smartAlerts.length > 0 ? (
            smartAlerts.map((alert, index) => {
              let Icon = Sparkles;
              let alertClass = 'bg-blue-50/50 border-blue-150 text-blue-800 shadow-sm shadow-blue-50';
              if (alert.type === 'warning') {
                Icon = AlertTriangle;
                alertClass = 'bg-amber-50/50 border-amber-150 text-amber-800 shadow-sm shadow-amber-50';
              } else if (alert.type === 'danger') {
                Icon = ShieldAlert;
                alertClass = 'bg-rose-50/50 border-rose-150 text-rose-800 shadow-sm shadow-rose-50';
              } else if (alert.type === 'info') {
                Icon = Brain;
                alertClass = 'bg-violet-50/50 border-violet-150 text-violet-850 shadow-sm shadow-violet-50';
              }

              return (
                <div key={index} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-xl ${alertClass} transition-shadow duration-200 hover:shadow-md`}>
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-xs">
                      <Icon size={16} className="stroke-[2.5]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{alert.message}</p>
                      <p className="text-[10px] opacity-90 mt-0.5">Recommended Strategy: <span className="font-semibold underline">{alert.action}</span></p>
                    </div>
                  </div>
                  <div>
                    <Link
                      to="/dashboard/expiry-management"
                      className="inline-block text-[10px] font-bold text-center px-3.5 py-2 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all"
                      style={{ color: alert.type === 'danger' ? '#ef4444' : alert.type === 'warning' ? '#b45309' : alert.type === 'info' ? '#7c3aed' : '#2563eb' }}
                    >
                      Resolve Issue
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <CheckCircle2 size={20} />
              </div>
              <p className="text-xs font-bold text-slate-700 mt-2">Zero waste risks detected!</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                All products are fresh, moving, and safely within expiry periods.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WasteAnalytics;
