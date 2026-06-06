import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  getTrendingRecommendations, 
  getSeasonalRecommendations, 
  getCropRecommendations 
} from '../../services/recommendationService';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  Lightbulb, 
  Sprout, 
  Calendar, 
  CloudRain, 
  Snowflake, 
  Sun, 
  MapPin, 
  Trophy, 
  Search, 
  ArrowRight, 
  Brain, 
  Sparkles, 
  Award,
  TrendingUp
} from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

const truncateChartLabel = (label = '') => {
  return label.length > 22 ? `${label.slice(0, 20)}...` : label;
};

const RecommendationsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [trendingData, setTrendingData] = useState({ topProducts: [], villageTrends: [] });
  
  // Seasonal State
  const [selectedSeason, setSelectedSeason] = useState('');
  const [seasonalProducts, setSeasonalProducts] = useState([]);
  const [seasonalLoading, setSeasonalLoading] = useState(false);

  // Crop Search State
  const [cropSearch, setCropSearch] = useState('Sugarcane');
  const [cropProducts, setCropProducts] = useState([]);
  const [cropLoading, setCropLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const trendingRes = await getTrendingRecommendations();
      setTrendingData(trendingRes.data);

      const seasonalRes = await getSeasonalRecommendations();
      setSeasonalProducts(seasonalRes.data);
      if (seasonalRes.data.length > 0 && seasonalRes.data[0].season) {
        setSelectedSeason(seasonalRes.data[0].season);
      }

      await handleCropSearch('Sugarcane');
    } catch (error) {
      console.error('Error fetching recommendations data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonChange = async (e) => {
    const season = e.target.value;
    setSelectedSeason(season);
    setSeasonalLoading(true);
    try {
      const res = await getSeasonalRecommendations(season);
      setSeasonalProducts(res.data);
    } catch (error) {
      console.error('Error fetching seasonal recommendations:', error);
    } finally {
      setSeasonalLoading(false);
    }
  };

  const handleCropSearch = async (crop) => {
    setCropLoading(true);
    try {
      const res = await getCropRecommendations(crop || cropSearch);
      setCropProducts(res.data);
    } catch (error) {
      console.error('Error fetching crop recommendations:', error);
    } finally {
      setCropLoading(false);
    }
  };

  // Prep chart data
  const chartData = trendingData.topProducts.map(item => ({
    name: item.product.name,
    sales: item.totalQuantity,
    revenue: item.totalSales
  }));

  const pieData = trendingData.villageTrends.reduce((acc, item) => {
    const existing = acc.find(x => x.name === item.village);
    if (existing) {
      existing.value += item.totalQuantity;
    } else {
      acc.push({ name: item.village, value: item.totalQuantity });
    }
    return acc;
  }, []).slice(0, 7);

  // Custom Chart Tooltips
  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white p-3 border border-slate-700 shadow-xl rounded-xl text-xs">
          <p className="font-bold mb-1 text-slate-200">{payload[0].payload.name}</p>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-400"></span>
            <span>Quantity Sold: <strong className="text-white">{payload[0].value}</strong></span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white text-slate-800 p-3 border border-slate-100 shadow-xl rounded-xl text-xs font-semibold">
          <p className="text-slate-800">{payload[0].name}</p>
          <div className="flex items-center gap-1.5 mt-1 text-slate-500 font-normal">
            <span>Demand: <strong>{payload[0].value} units</strong></span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Lightbulb className="text-amber-500 fill-amber-100 stroke-[2.5]" size={24} />
            Smart Farm Recommendations
          </h1>
          <p className="text-slate-500 text-xs md:text-sm">AI-driven crop diagnostics, village trending inputs, and seasonal demand predictions.</p>
        </div>
        <div>
          <Link to="/farmers">
            <Button variant="primary" className="flex items-center gap-2 text-xs font-bold py-2">
              <Sprout size={14} className="stroke-[2.5]" />
              Farmer Profiles
            </Button>
          </Link>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-soft px-4 py-3 flex items-center gap-3">
          <Loader size="sm" />
          <span className="text-xs font-semibold text-slate-500">Loading recommendation data...</span>
        </div>
      )}

      {/* KPI Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Season card */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 relative z-10">
            {selectedSeason === 'Monsoon' ? (
              <CloudRain size={20} className="stroke-[2.5]" />
            ) : selectedSeason === 'Winter' ? (
              <Snowflake size={20} className="stroke-[2.5]" />
            ) : (
              <Sun size={20} className="stroke-[2.5]" />
            )}
          </div>
          <div className="space-y-0.5 relative z-10">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Active Season Focus</span>
            <div className="text-lg font-black text-slate-800">{selectedSeason || 'Monsoon'} Period</div>
            <p className="text-[10px] text-slate-500 font-medium">Catalog customized for current crop weather patterns.</p>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 text-emerald-900 pointer-events-none">
            <Calendar size={100} />
          </div>
        </div>

        {/* Predictive Algorithm */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl border border-violet-100 relative z-10">
            <Brain size={20} className="stroke-[2.5]" />
          </div>
          <div className="space-y-0.5 relative z-10">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Predictive engine</span>
            <div className="text-lg font-black text-slate-800">Smart ML Recommendations</div>
            <p className="text-[10px] text-slate-500 font-medium">Correlating soil types, villages, and local orders.</p>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 text-violet-900 pointer-events-none">
            <Sparkles size={100} />
          </div>
        </div>

        {/* Local hotspot */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 relative z-10">
            <MapPin size={20} className="stroke-[2.5]" />
          </div>
          <div className="space-y-0.5 relative z-10">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Village Hotspots</span>
            <div className="text-lg font-black text-slate-800">{pieData.length} Active Centers</div>
            <p className="text-[10px] text-slate-500 font-medium">Analyzing micro-demand across village clusters.</p>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 text-blue-900 pointer-events-none">
            <Trophy size={100} />
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Trending Products by Volume</h3>
            <p className="text-xs text-slate-400 mt-0.5">Top stock items purchased by regional farmers.</p>
          </div>
          <div className="h-80 mt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                  barCategoryGap={8}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickLine={false} axisLine={false} className="text-[10px] font-bold text-slate-400" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={150}
                    tickFormatter={truncateChartLabel}
                    className="text-[10px] font-bold text-slate-500"
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="sales" fill="#10b981" radius={[0, 4, 4, 0]} name="Quantity Sold" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No popular sales statistics recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Village Demand Share */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Village Sales Distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Share of sales quantity across nearby villages.</p>
          </div>
          <div className="h-44 flex items-center justify-center relative mt-3">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs font-semibold">No regional data available.</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-semibold border-t border-slate-50 pt-3 text-slate-500 max-h-24 overflow-y-auto">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="truncate">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations Config Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonal Suggestions */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={15} className="text-primary-600" />
                Seasonal Stock Catalog
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Custom demand trends filtered by seasonal cycles.</p>
            </div>
            <div>
              <select
                value={selectedSeason}
                onChange={handleSeasonChange}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="Monsoon">☔ Monsoon</option>
                <option value="Winter">❄️ Winter</option>
                <option value="Summer">☀️ Summer</option>
              </select>
            </div>
          </div>

          <div className="flex-1 mt-4">
            {seasonalLoading ? (
              <div className="flex items-center justify-center py-16"><Loader size="md" /></div>
            ) : seasonalProducts.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {seasonalProducts.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-800">{item.product.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-full">
                          {item.product.category?.name || 'Agri Input'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]">{item.reasons[0]}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-800">₹{item.product.price}</div>
                      <span className="text-[9px] text-slate-400 font-bold">Qty: {item.product.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-16 text-xs font-semibold">No seasonal catalog items found.</p>
            )}
          </div>
        </div>

        {/* Crop Inputs Recommender */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft flex flex-col justify-between">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sprout size={15} className="text-primary-600" />
              Crop-wise Demand Queries
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Predict popular chemical inputs needed for specific crops.</p>
          </div>

          <div className="flex gap-2 my-4">
            <select
              value={cropSearch}
              onChange={(e) => {
                setCropSearch(e.target.value);
                handleCropSearch(e.target.value);
              }}
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="Sugarcane">Sugarcane</option>
              <option value="Cotton">Cotton</option>
              <option value="Rice">Rice</option>
              <option value="Wheat">Wheat</option>
              <option value="Soybean">Soybean</option>
              <option value="Maize">Maize</option>
              <option value="Tomato">Tomato</option>
              <option value="Chilli">Chilli</option>
            </select>
            <Button variant="primary" className="py-2 px-4 text-xs font-bold" onClick={() => handleCropSearch()} disabled={cropLoading}>
              <Search size={14} className="stroke-[2.5]" />
            </Button>
          </div>

          <div className="flex-1">
            {cropLoading ? (
              <div className="flex items-center justify-center py-16"><Loader size="md" /></div>
            ) : cropProducts.length > 0 ? (
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                {cropProducts.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-emerald-50/30 rounded-xl border border-emerald-100/50 hover:shadow-xs transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950">{item.product.name}</h4>
                        <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">{item.reasons[0]}</p>
                      </div>
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {item.confidenceScore}% Match
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-emerald-100/30 text-[9px] text-emerald-850 font-bold">
                      <span>Price: <strong>₹{item.product.price}</strong></span>
                      <span>Stock: <strong>{item.product.quantity} {item.product.unit}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-16 text-xs font-semibold">No crop matches found. Try matching other options.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Lists: Village trends and popular products details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Popular products */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Overall Popular Products</h3>
          </div>
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3 text-right">Sold Qty</th>
                  <th className="px-4 py-3 text-right">Txns</th>
                  <th className="px-4 py-3 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trendingData.topProducts.length > 0 ? (
                  trendingData.topProducts.slice(0, 5).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">{item.product.name}</td>
                      <td className="px-4 py-3 text-right font-medium">{item.totalQuantity} {item.product.unit}</td>
                      <td className="px-4 py-3 text-right font-semibold">{item.transactionCount}</td>
                      <td className="px-4 py-3 text-right font-black text-slate-800">₹{item.totalSales.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-slate-400 font-semibold">No popular sales statistics recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Village trends */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Award size={16} className="text-primary-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Village-wise Input Demand</h3>
          </div>
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Village Area</th>
                  <th className="px-4 py-3">Trending Input</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Demand Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trendingData.villageTrends.length > 0 ? (
                  trendingData.villageTrends.slice(0, 5).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-1">
                        <MapPin size={10} className="text-slate-400" />
                        {item.village}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">{item.product.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                          {item.product.category?.name || 'Input'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-800">{item.totalQuantity}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-slate-400 font-semibold">No village purchase data collected yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationsDashboard;
