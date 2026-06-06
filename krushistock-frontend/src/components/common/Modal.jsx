import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        <div
          className="fixed inset-0 transition-opacity bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        ></div>

        <div className={`relative inline-block bg-white rounded-2xl text-left overflow-hidden shadow-soft-lg border border-slate-100 transform transition-all align-middle ${sizes[size]} w-full z-10 my-8`}>
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-800 tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-6 bg-white">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
