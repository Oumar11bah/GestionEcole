import React from 'react';

const Label = ({ children, required, className = '' }) => (
  <label className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}>
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

export default Label;