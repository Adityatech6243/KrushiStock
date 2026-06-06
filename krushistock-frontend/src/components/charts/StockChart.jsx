import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StockChart = ({ data = [] }) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Stock Overview by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
            labelStyle={{ fontWeight: 'bold', color: '#1e293b', fontSize: '12px' }}
            itemStyle={{ color: '#059669', fontSize: '12px' }}
          />
          <Bar dataKey="stock" fill="#10b981" radius={[6, 6, 0, 0]} name="Stock Count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
