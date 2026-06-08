import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  className = '',
  ...rest
}) => {
  const isPassword = type === 'password';
  const isNumber = type === 'number';
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    if (isNumber) {
      let val = e.target.value;
      // Allow only positive digits and a single decimal point (blocking negative signs, letters, etc.)
      let cleaned = val.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }
      e.target.value = cleaned;
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 mb-4 ${className}`}>
      {label && (
        <label className="text-slate-700 text-xs font-semibold uppercase tracking-wider" htmlFor={name}>
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <div className={isPassword ? 'relative' : ''}>
        <input
          type={isPassword ? (showPassword ? 'text' : 'password') : isNumber ? 'text' : type}
          id={name}
          name={name}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          inputMode={isNumber ? 'decimal' : undefined}
          className={`w-full px-3.5 py-2.5 bg-white text-sm text-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${
            error ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : 'border-slate-200 hover:border-slate-300'
          } ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''} ${
            isPassword ? 'pr-10' : ''
          }`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650 transition-colors"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <p className="text-rose-600 text-xs font-medium mt-0.5">{error}</p>}
    </div>
  );
};

export default Input;
