import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';
import { setToken, setUserInfo } from '../../utils/auth';
import { showError, showSuccess } from '../../utils/alert';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ForgotPasswordModal from '../../components/auth/ForgotPasswordModal';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

    // Regex for username: 3-20 characters, alphanumeric and underscores
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    // Regex for password: at least 6 characters
    const passwordRegex = /^.{6,}$/;

    if (!formData.username.trim()) {
      errors.username = 'Please enter your username.';
      isValid = false;
    } else if (!usernameRegex.test(formData.username)) {
      errors.username = 'Please enter valid username.';
      isValid = false;
    }

    if (!formData.password) {
      errors.password = 'Please enter your password.';
      isValid = false;
    } else if (!passwordRegex.test(formData.password)) {
      errors.password = 'Please enter valid password.';
      isValid = false;
    }

    if (!isValid) {
      setFieldErrors(errors);
      showError('Login Failed, Please try again with correct credentials');
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const response = await login(formData);
      setToken(response.token);
      setUserInfo(response.user);
      showSuccess('Login Successful', 'Welcome to KrushiStock!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      } else if (err.response?.status === 401) {
        // Highlight both fields in red if credentials don't match
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

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg-farm.png')" }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/60"></div>
      
      {/* Brand Heading Above Card */}
      <div className="relative z-10 text-center mb-12 px-4">
        <h1 
          className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-2xl tracking-tighter leading-none mb-1"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          MAHALAXMI
        </h1>
        <h2 
          className="text-3xl md:text-4xl font-bold text-white tracking-[0.2em] uppercase mb-4 drop-shadow-lg"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          SHETI SEVA KENDRA
        </h2>
        <div className="h-1.5 w-48 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto rounded-full mb-6 shadow-xl"></div>
        <p className="text-xl md:text-2xl text-green-400 font-bold tracking-[0.4em] uppercase italic drop-shadow-md">
          HASUR KHURD
        </p>
      </div>

      <div className="relative z-10 bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/50 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-600 mb-2">KrushiStock</h1>
          <p className="text-gray-600">Inventory Management System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter your username"
            error={fieldErrors.username}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            error={fieldErrors.password}
          />

          <div className="flex justify-end mb-4 -mt-2">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(true)}
              className="text-sm text-green-600 font-medium hover:underline focus:outline-none"
            >
              Forgot Password?
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>For Krushi Seva Kendra Staff Only</p>
        </div>
      </div>

      <ForgotPasswordModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default Login;
