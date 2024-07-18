// src/components/PhoneInput.js
import React, { useState, useEffect } from 'react';

const PhoneInput = ({ value, onChange }) => {
  const [error, setError] = useState('');

  const validatePhone = (phone) => {
    const regex = /^(\+973|\+966)\d{8}$/;
    if (!regex.test(phone)) {
      setError('Invalid phone number. Use +973 or +966 followed by 8 digits.');
    } else {
      setError('');
    }
  };

  useEffect(() => {
    if (value) validatePhone(value);
  }, [value]);

  return (
    <div>
      <label htmlFor="phone" className="font-pmedium text-gray-100 block mb-2">
        Phone Number
      </label>
      <input
        type="tel"
        id="phone"
        value={value}
        onChange={(e) => {
          onChange(e);
          validatePhone(e.target.value);
        }}
        placeholder="+973xxxxxxxx or +966xxxxxxxx"
        className={`w-full px-3 py-2 bg-black-200 text-white font-pregular rounded focus:outline-none focus:ring-2 ${
          error ? 'ring-2 ring-red-500' : 'focus:ring-secondary'
        }`}
        required
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default PhoneInput;