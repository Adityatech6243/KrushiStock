import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFarmerById } from '../../services/farmerService';
import { getFarmerRecommendations } from '../../services/recommendationService';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { 
  ArrowLeft, 
  Lightbulb, 
  User, 
  Phone, 
  Layers, 
  MapPin, 
  Globe, 
  Sprout, 
  CheckCircle2, 
  Sparkles, 
  Activity,
  DollarSign,
  Package,
  ShoppingCart
} from 'lucide-react';

const FarmerRecommendations = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const farmerRes = await getFarmerById(id);
      setFarmer(farmerRes.data);

      const recsRes = await getFarmerRecommendations(id);
      setRecommendations(recsRes.data);
    } catch (error) {
      console.error('Error fetching farmer recommendations data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !farmer) {
    return (
      <div className="space-y-6 animate-fadeIn pb-10">
        <div>
          <Link 
            to="/farmers" 
            className="text-xs font-semibold text-slate-500 hover:text-primary-600 flex items-center gap-1.5 w-fit transition-colors group"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            Back to Farmer Profiles
          </Link>
        </div>
        <div className="border-b border-slate-100 pb-4">
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Lightbulb className="text-amber-500 fill-amber-100 stroke-[2.5]" size={24} />
            Personalized Recommendations
          </h1>
          <p className="text-slate-500 text-xs md:text-sm">Loading farmer profile and recommendation data.</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl shadow-soft p-10 flex flex-col items-center gap-3">
          <Loader size="md" />
          <span className="text-xs font-semibold text-slate-500">Loading recommendations...</span>
        </div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="bg-rose-50 border border-rose-100 text-rose-800 p-6 rounded-xl text-center font-bold">
        Farmer profile not found. Please verify the URL parameter.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Back link */}
      <div>
        <Link 
          to="/farmers" 
          className="text-xs font-semibold text-slate-500 hover:text-primary-600 flex items-center gap-1.5 w-fit transition-colors group"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          Back to Farmer Profiles
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Lightbulb className="text-amber-500 fill-amber-100 stroke-[2.5]" size={24} />
          Personalized Recommendations
        </h1>
        <p className="text-slate-500 text-xs md:text-sm">Tailored agronomy inputs based on crop rotation, soil conditions, and village trends for {farmer.name}.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Farmer Profile Card */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5 h-fit space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <User size={15} className="text-slate-400" />
              Farmer Info
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${farmer.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
              {farmer.isActive ? 'Active Member' : 'Inactive'}
            </span>
          </div>

          <div className="space-y-3.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FullName</span>
              <p className="text-sm font-black text-slate-850">{farmer.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Phone</span>
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                  <Phone size={10} className="text-slate-400" />
                  {farmer.phone}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Land Size</span>
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                  <Layers size={10} className="text-slate-400" />
                  {farmer.landSize || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Village / Town</span>
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="text-slate-400" />
                  {farmer.village}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">District</span>
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                  <Globe size={10} className="text-slate-400" />
                  {farmer.district || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Soil Condition</span>
                <p className="text-[10px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100 mt-1 flex items-center gap-1 w-fit">
                  <Sprout size={10} />
                  {farmer.soilType || 'Loamy'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">State / Region</span>
                <p className="text-xs font-semibold text-slate-700 mt-1">{farmer.state || 'Maharashtra'}</p>
              </div>
            </div>

            <div className="border-t border-slate-50 pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Crops Cultivated</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {farmer.cropTypes && farmer.cropTypes.length > 0 ? (
                  farmer.cropTypes.map((crop, idx) => (
                    <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sprout size={10} className="text-blue-500" />
                      {crop}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 font-medium">No crops recorded</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between border-b border-slate-50 pb-3">
              <span className="flex items-center gap-2">
                <Sparkles size={15} className="text-amber-500" />
                Agronomy Suggestions
              </span>
              <span className="text-[10px] font-bold text-slate-400">{recommendations.length} Products Found</span>
            </h3>

            {recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:shadow-sm transition-all space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100/50 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-800">{item.product.name}</h4>
                          <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded-full">
                            {item.product.category?.name || 'Agri Input'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-sm sm:max-w-md">
                          {item.product.description || 'No description available'}
                        </p>
                      </div>

                      <div className="self-start sm:self-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block text-right">Confidence</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${item.confidenceScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-slate-800">{item.confidenceScore}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Reason list */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recommendation Triggers</span>
                        <ul className="mt-2 space-y-1.5">
                          {item.reasons.map((reason, rIdx) => (
                            <li key={rIdx} className="text-xs text-slate-650 flex items-start gap-1.5">
                              <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Confidence Score Breakdown */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-100 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Activity size={10} className="text-slate-400" />
                          Algorithm Weights
                        </span>
                        <div className="space-y-1 text-[10px] font-semibold text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Crop suitability (30%):</span>
                            <span className="font-bold text-slate-700">{item.breakdown.cropScore}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Season alignment (25%):</span>
                            <span className="font-bold text-slate-700">{item.breakdown.seasonScore}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Soil type match (20%):</span>
                            <span className="font-bold text-slate-700">{item.breakdown.soilScore}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Purchase logs (15%):</span>
                            <span className="font-bold text-slate-700">{item.breakdown.purchaseScore}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Village demand (10%):</span>
                            <span className="font-bold text-slate-700">{item.breakdown.collaborativeScore}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100/50 pt-3 text-xs">
                      <div className="flex gap-4 text-[11px] font-semibold text-slate-500">
                        <span className="flex items-center gap-1">
                          <DollarSign size={12} className="text-slate-450" />
                          Price: <strong className="text-slate-800">₹{item.product.price}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Package size={12} className="text-slate-450" />
                          Stock: <strong className={item.product.quantity > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            {item.product.quantity > 0 ? `${item.product.quantity} ${item.product.unit}` : 'Out of stock'}
                          </strong>
                        </span>
                      </div>
                      
                      {item.product.quantity > 0 ? (
                        <Link 
                          to={`/sales?customer=${farmer._id}&product=${item.product._id}`}
                          className="bg-primary-600 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm hover:shadow flex items-center justify-center gap-1.5"
                        >
                          <ShoppingCart size={13} className="stroke-[2.5]" />
                          Quick Sell
                        </Link>
                      ) : (
                        <button 
                          disabled 
                          className="bg-slate-200 text-slate-400 font-bold text-xs px-4 py-2 rounded-lg cursor-not-allowed"
                        >
                          Out of Stock
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/20">
                <p className="text-xs font-bold text-slate-700">No suggestions recorded</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Provide this farmer profile with crops cultivated, soil type details, or past transaction logs to automatically build suggestions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerRecommendations;
