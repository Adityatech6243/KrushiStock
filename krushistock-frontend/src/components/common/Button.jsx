import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = ''
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-200 focus:ring-primary-500',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-400',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-100 focus:ring-rose-500',
    outline: 'border border-primary-600 text-primary-700 bg-transparent hover:bg-primary-50 focus:ring-primary-500'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5'
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
