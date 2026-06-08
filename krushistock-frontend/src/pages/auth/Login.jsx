  import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';
import { setToken, setUserInfo } from '../../utils/auth';
import { showError, showSuccess } from '../../utils/alert';
import ForgotPasswordModal from '../../components/auth/ForgotPasswordModal';
import { motion } from 'framer-motion';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Sprout, 
  Loader2, 
  ShieldAlert, 
  ArrowRight,
  FileSpreadsheet,
  Package,
  Brain,
  Users,
  ShieldCheck,
  Building,
  Phone,
  MapPin,
  LockKeyhole
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load username if it was previously saved with "remember me"
  useEffect(() => {
    const savedUsername = localStorage.getItem('krushistock_username');
    if (savedUsername) {
      setFormData(prev => ({ ...prev, username: savedUsername }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    if (fieldErrors[e.target.name]) {
      setFieldErrors({
        ...fieldErrors,
        [e.target.name]: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = {};
    let isValid = true;

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    const passwordRegex = /^.{6,}$/;

    if (!formData.username.trim()) {
      errors.username = 'Please enter your console username.';
      isValid = false;
    } else if (!usernameRegex.test(formData.username)) {
      errors.username = 'Please enter a valid console username (3-20 characters, alphanumeric or underscores).';
      isValid = false;
    }

    if (!formData.password) {
      errors.password = 'Please enter your password.';
      isValid = false;
    } else if (!passwordRegex.test(formData.password)) {
      errors.password = 'Please enter a valid password (at least 6 characters).';
      isValid = false;
    }

    if (!isValid) {
      setFieldErrors(errors);
      showError('Login Failed', 'Please correct the highlighted fields.');
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const response = await login(formData);
      setToken(response.token);
      setUserInfo(response.user);
      
      if (rememberMe) {
        localStorage.setItem('krushistock_username', formData.username);
      } else {
        localStorage.removeItem('krushistock_username');
      }

      showSuccess('Login Successful', 'Welcome to KrushiStock!');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      } else if (err.response?.status === 401) {
        setFieldErrors({
          username: 'Invalid username or password.',
          password: 'Invalid username or password.'
        });
        showError('Login Failed', err.response?.data?.message || 'Invalid username or password.');
      } else {
        const errorMsg = err.response?.data?.message || 'Login failed. Please try again.';
        showError('Login Failed', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Floating animations configurations
  const floatingAnim = (yOffset, duration) => ({
    animate: {
      y: [0, yOffset, 0],
    },
    transition: {
      duration: duration,
      repeat: Infinity,
      ease: "easeInOut"
    }
  });

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 font-sans selection:bg-primary-100 selection:text-primary-800 animate-fadeIn">
      
      {/* LEFT SIDE PANEL - Visually Rich AgriTech Presentation (Stacked on mobile, side-by-side on desktop) */}
      <div className="w-full lg:w-[55%] xl:w-[60%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 flex flex-col justify-between p-6 sm:p-8 lg:p-12 pb-10 lg:pb-12 text-white">
        
        {/* Animated Gradient Background Glow Blobs */}
        <motion.div 
          animate={{ scale: [1, 1.15, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none"
        ></motion.div>
        
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-15%] right-[-10%] w-[70%] h-[70%] rounded-full bg-lime-400/5 blur-[120px] pointer-events-none"
        ></motion.div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-primary-600 flex items-center justify-center shadow-lg shadow-emerald-950/30">
            <Sprout size={19} className="text-white animate-bounce-slow" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight leading-none text-white">KrushiStock</h1>
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">AgriTech Systems</span>
          </div>
        </div>

        {/* Center Content Section */}
        <div className="relative z-10 space-y-8 my-auto">
          
          {/* Main Title Headers */}
          <div className="space-y-4 max-w-lg">
            <motion.h2 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.15] text-slate-100"
            >
              Smart Inventory & Billing for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-lime-300">Modern Agriculture Retail</span>.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-slate-400 text-xs lg:text-sm leading-relaxed"
            >
              Manage seeds, fertilizers, pesticides, invoices, and farmer relationships in one powerful platform.
            </motion.p>
          </div>

          {/* Floating Glass Feature Cards (Grid 2x2 - Hidden on very small mobiles) */}
          <div className="hidden sm:grid grid-cols-2 gap-4 max-w-xl">
            
            {/* Card 1: Smart Billing */}
            <motion.div 
              {...floatingAnim(-6, 5.5)}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 space-y-2.5 transition-all shadow-md shadow-emerald-950/20 hover:border-emerald-500/30 hover:shadow-emerald-500/5 group"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <FileSpreadsheet size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-150">Smart Billing & Invoices</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Instant POS bill checkout, prints, and credit ledger logs.</p>
              </div>
            </motion.div>

            {/* Card 2: Inventory Intel */}
            <motion.div 
              {...floatingAnim(-8, 6.5)}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 space-y-2.5 transition-all shadow-md shadow-emerald-950/20 hover:border-emerald-500/30 hover:shadow-emerald-500/5 group"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Package size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-150">Inventory Intelligence</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Tracking expiries, batch details, and auto threshold alerts.</p>
              </div>
            </motion.div>

            {/* Card 3: AI-Powered Insights */}
            <motion.div 
              {...floatingAnim(-7, 6)}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 space-y-2.5 transition-all shadow-md shadow-emerald-950/20 hover:border-emerald-500/30 hover:shadow-emerald-500/5 group"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Brain size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-150">AI-Powered Insights</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Smart crop suitability mappings and seasonal trends predictions.</p>
              </div>
            </motion.div>

            {/* Card 4: Farmer CRM */}
            <motion.div 
              {...floatingAnim(-9, 7)}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 space-y-2.5 transition-all shadow-md shadow-emerald-950/20 hover:border-emerald-500/30 hover:shadow-emerald-500/5 group"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Users size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-150">Farmer Relationship CRM</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Soil type analytics, purchase logs, and village-wise demands.</p>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Store Information Card at Bottom */}
        <div className="relative z-10 bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-3.5 max-w-sm flex items-center gap-3.5 mt-6 lg:mt-0">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center flex-shrink-0">
            <Building size={16} />
          </div>
          <div className="space-y-0.5 text-[10px]">
            <p className="font-bold text-slate-200 uppercase tracking-wider">Mahalaxmi Sheti Seva Kendra</p>
            <p className="text-slate-400 flex items-center gap-1">
              <MapPin size={10} />
              Hasur Khurd, Tal. Kagal, Kolhapur
            </p>
            <p className="text-slate-400 flex items-center gap-1">
              <Phone size={10} />
              Support: 7820974939
            </p>
          </div>
        </div>

      </div>

        {/* RIGHT SIDE PANEL - Premium Auth Form Section */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 bg-white relative z-10 rounded-t-3xl -mt-6 lg:rounded-t-none lg:mt-0">

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-6 relative z-10"
        >
          {/* Logo / Heading */}
          <div className="hidden lg:flex flex-col items-center text-center lg:items-start lg:text-left space-y-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-primary-500 flex items-center justify-center shadow-md shadow-emerald-100">
              <Sprout size={22} className="text-white animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-slate-800">
                MAHALAXMI SHETI SEVA KENDRA
              </h1>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">
                  Hasur Khurd
                </span>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">
                  Staff Portal
                </span>
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Sign In</h2>
            <p className="text-slate-400 text-xs font-medium">Please enter your username and password to access the shop inventory.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {/* Username Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={15} />
                </div>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/50 text-xs font-semibold text-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-350 ${
                    fieldErrors.username ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  required
                />
              </div>
              {fieldErrors.username && (
                <p className="text-rose-600 text-[10px] font-bold mt-0.5 flex items-center gap-1">
                  <ShieldAlert size={10} className="flex-shrink-0" />
                  {fieldErrors.username}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={`w-full pl-10 pr-10 py-2.5 bg-slate-50/50 text-xs font-semibold text-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-350 ${
                    fieldErrors.password ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-rose-600 text-[10px] font-bold mt-0.5 flex items-center gap-1">
                  <ShieldAlert size={10} className="flex-shrink-0" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Reset */}
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="flex items-center gap-2 text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500/20 h-3.5 w-3.5 cursor-pointer accent-primary-600"
                />
                Remember me
              </label>
              
              <button 
                type="button" 
                onClick={() => setIsModalOpen(true)}
                className="text-primary-600 hover:text-primary-700 transition-colors hover:underline focus:outline-none"
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In button with Hover Lift & Glow shadow */}
            <motion.button
              whileHover={{ y: -1, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)" }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-primary-600 hover:from-emerald-700 hover:to-primary-700 text-white font-bold text-xs py-3 rounded-lg shadow-sm shadow-emerald-250 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={14} className="stroke-[2.5]" />
                </>
              )}
            </motion.button>
          </form>

          

          
         
          {/* Secure login indicator / footer notes */}
          <div className="border-t border-slate-100 pt-5 text-center space-y-3">
           
            
            <div className="space-y-1 text-[9px] text-slate-400 font-bold tracking-widest uppercase">
              <div className="flex items-center justify-center gap-1">
                <LockKeyhole size={11} />
                <span>Shop Staff Authorization Required</span>
              </div>
            </div>

            {/* Footer links */}
            <div className="flex items-center justify-center gap-4 text-[10px] font-semibold text-slate-400 mt-2.5">
              <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Privacy Policy terms."); }} className="hover:text-slate-650 transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#terms" onClick={(e) => { e.preventDefault(); alert("Terms of Service."); }} className="hover:text-slate-650 transition-colors">Terms of Service</a>
            </div>
          </div>

        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default Login;
