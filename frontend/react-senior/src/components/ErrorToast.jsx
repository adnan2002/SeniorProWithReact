import React from 'react';

const ErrorToast = ({ title, message }) => {
  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-pbold mb-2">{title || 'Error'}</h3>
      <p className="text-sm text-center">{message}</p>
    </div>
  );
};

export default ErrorToast;