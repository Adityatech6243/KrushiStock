import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SalesChart = ({ data = [] }) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Sales Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
            labelStyle={{ fontWeight: 'bold', color: '#1e293b', fontSize: '12px' }}
            itemStyle={{ color: '#059669', fontSize: '12px' }}
          />
          <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} name="Sales (₹)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesChart;
