import React, { useState } from 'react';
import { forgotPassword, verifyOTP, resetPassword } from '../../services/authService';
import { showSuccess, showError } from '../../utils/alert';
import Input from '../common/Input';
import Button from '../common/Button';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setEmailOrUsername('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
    setErrors({});
    onClose();
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) {
      setErrors({ emailOrUsername: 'Please enter your username or email' });
      return;
    }
    
    setLoading(true);
    setErrors({});
    try {
      const res = await forgotPassword(emailOrUsername);
      if (res.success) {
        showSuccess('OTP Sent', res.message);
        setStep(2);
      }
    } catch (err) {
      showError('Failed', err.response?.data?.message || 'Error sending OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setErrors({ otp: 'Please enter the 6-digit OTP' });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await verifyOTP(emailOrUsername, otp);
      if (res.success) {
        setResetToken(res.resetToken);
        showSuccess('Verified', 'OTP verified successfully');
        setStep(3);
      }
    } catch (err) {
      showError('Verification Failed', err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      setErrors({ newPassword: 'Password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await resetPassword(resetToken, newPassword);
      if (res.success) {
        showSuccess('Success', 'Password has been reset successfully. Please log in.');
        handleClose();
      }
    } catch (err) {
      showError('Reset Failed', err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="p-6">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {step === 1 && 'Reset Password'}
              {step === 2 && 'Enter OTP'}
              {step === 3 && 'New Password'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {step === 1 && "Enter your username or email and we'll send you an OTP."}
              {step === 2 && "Enter the 6-digit code sent to your email."}
              {step === 3 && "Create a new strong password."}
            </p>
          </div>

          {step === 1 && (
            <form onSubmit={handleRequestOTP}>
              <Input
                label="Username or Email"
                type="text"
                name="emailOrUsername"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Enter username or email"
                error={errors.emailOrUsername}
              />
              <Button type="submit" variant="primary" className="w-full mt-4" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP}>
              <Input
                label="6-Digit OTP"
                type="text"
                name="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                error={errors.otp}
              />
              <Button type="submit" variant="primary" className="w-full mt-4" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="w-full mt-3 text-sm text-green-600 font-medium hover:underline"
              >
                Back to previous step
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <Input
                label="New Password"
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                error={errors.newPassword}
              />
              <Input
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                error={errors.confirmPassword}
              />
              <Button type="submit" variant="primary" className="w-full mt-4" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
