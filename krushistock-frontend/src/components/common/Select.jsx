import React from 'react';

const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  error,
  placeholder = 'Select...',
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-1.5 mb-4 ${className}`}>
      {label && (
        <label className="text-slate-700 text-xs font-semibold uppercase tracking-wider" htmlFor={name}>
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full px-3.5 py-2.5 bg-white text-sm text-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${
          error ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option, index) => (
          <option key={index} value={option.value !== undefined ? option.value : option}>
            {option.label || option}
          </option>
        ))}
      </select>
      {error && <p className="text-rose-600 text-xs font-medium mt-0.5">{error}</p>}
    </div>
  );
};

export default Select;
