// src/components/PasswordInput.js
import React, { useState, useEffect } from 'react';

const PasswordInput = ({ value, onChange }) => {
  const [errors, setErrors] = useState([]);

  const validatePassword = (password) => {
    const newErrors = [];

    if (password.length < 8) {
      newErrors.push('Password must be at least 8 characters long');
    }
    if (!/\d/.test(password)) {
      newErrors.push('Password must contain at least 1 number');
    }
    if (!/[!@#\$%\^\&*\)\(+=._-]/.test(password)) {
        newErrors.push('Password must contain at least 1 special character');
      }
      
    if (!/[A-Z]/.test(password)) {
      newErrors.push('Password must contain at least 1 uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      newErrors.push('Password must contain at least 1 lowercase letter');
    }

    setErrors(newErrors);
  };

  useEffect(() => {
    if (value) validatePassword(value);
  }, [value]);

  return (
    <div>
      <label htmlFor="password" className="font-pmedium text-gray-100 block mb-2">
        Password
      </label>
      <input
        type="password"
        id="password"
        value={value}
        onChange={(e) => {
          onChange(e);
          validatePassword(e.target.value);
        }}
        className={`w-full px-3 py-2 bg-black-200 text-white font-pregular rounded focus:outline-none focus:ring-2 ${
          errors.length > 0 ? 'ring-2 ring-red-500' : 'focus:ring-secondary'
        }`}
        required
      />
      {errors.length > 0 && (
        <ul className="text-red-500 text-sm mt-1 list-disc list-inside">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordInput;