// src/components/EmailInput.js
import React, { useState, useEffect } from 'react';

const EmailInput = ({ value, onChange, disabled }) => {
  const [error, setError] = useState('');
  const [isTouched, setIsTouched] = useState(false);

//   const validateEmail = (email) => {
//     const regex = /^(19[8-9]\d|20[0-3]\d|2040)\d{0,5}(@stu\.uob\.edu\.bh)?$/;
//     const finalRegex = /^(19[8-9]\d|20[0-3]\d|2040)\d{1,5}@stu\.uob\.edu\.bh$/;

//     if (email === '') {
//       setError('');
//     } else if (!regex.test(email)) {
//       setError('Invalid email format');
//     } else if (finalRegex.test(email)) {
//       setError('');
//     } else {
//       setError('');
//     }
//   };

//   useEffect(() => {
//     if (isTouched) {
//       validateEmail(value);
//     }
//   }, [value, isTouched]);

//   const handleBlur = () => {
//     setIsTouched(true);
//     validateEmail(value);
//   };

  return (
    <div>
      <label htmlFor="email" className="font-pmedium text-gray-100 block mb-2">
        Email
      </label>
      <input
        type="email"
        id="email"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e);
        //   if (isTouched) validateEmail(e.target.value);
        }}
        // onBlur={handleBlur}
        className={`w-full px-3 py-2 bg-black-200 text-white font-pregular rounded focus:outline-none focus:ring-2 ${
          error ? 'ring-2 ring-red-500' : 'focus:ring-secondary'
        }`}
        required
      />
      {/* {error && <p className="text-red-500 text-sm mt-1">{error}</p>} */}
    </div>
  );
};

export default EmailInput;