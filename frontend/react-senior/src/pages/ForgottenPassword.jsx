// src/pages/ForgottenPassword.js

import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import ErrorToast from '../components/ErrorToast';
import { toast } from 'react-toastify';
import GradientButton from '../components/GradientButton';
import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';

const ForgottenPassword = () => {
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState('request'); 
  const [confirmationCode, setConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword, confirmResetPassword } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await resetPassword(email);
      console.log('Password reset requested:', result);
      toast.success('Password reset code sent. Check your email.');
      setStage('confirm');
    } catch (error) {
      console.error('Error requesting password reset:', error);
      toast.error(<ErrorToast message={error.message} />);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await confirmResetPassword(email, confirmationCode, newPassword);
      toast.success('Password reset successful. You can now sign in with your new password.');
      navigate('/signin');
    } catch (error) {
      console.error('Error confirming password reset:', error);
      toast.error(<ErrorToast message={error.message} />);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-primary flex items-center justify-center p-4">
      <div className="bg-black-100 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="font-pbold text-secondary text-3xl mb-6 text-center">
          Reset Password
        </h1>
        {stage === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <EmailInput value={email} onChange={(e) => setEmail(e.target.value)} />
            <GradientButton
              title="Request Reset"
              onClick={handleRequestReset}
              isLoading={isLoading}
            />
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="space-y-4">
            <EmailInput value={email} onChange={(e) => setEmail(e.target.value)} disabled />
            <div>
              <label htmlFor="confirmationCode" className="font-pmedium text-gray-100 block mb-2">
                Confirmation Code
              </label>
              <input
                type="text"
                id="confirmationCode"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                className="w-full px-3 py-2 bg-black-200 text-white font-pregular rounded focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              />
            </div>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              label="New Password"
            />
            <GradientButton
              title="Confirm Reset"
              onClick={handleConfirmReset}
              isLoading={isLoading}
            />
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgottenPassword;