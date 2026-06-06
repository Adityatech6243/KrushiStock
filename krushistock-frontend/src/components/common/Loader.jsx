import React from 'react';

const Loader = ({ size = 'md', fullScreen = false }) => {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-[3px]',
    lg: 'w-16 h-16 border-4'
  };

  const loader = (
    <div className={`${sizes[size]} border-primary-600 border-t-transparent rounded-full animate-spin`}></div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900/10 backdrop-blur-sm z-50">
        <div className="bg-white p-4 rounded-2xl shadow-soft-lg border border-slate-100 flex items-center justify-center">
          {loader}
        </div>
      </div>
    );
  }

  return <div className="flex justify-center items-center py-6">{loader}</div>;
};

export default Loader;
