// src/hooks/useAuth.js

import { useState, useEffect } from 'react';
import AuthService from '../services/AuthService';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email, password, phone_number) {
    const result = await AuthService.signUp(email, password, phone_number);
    if (result.isSignUpComplete) {
      setUser(await AuthService.getCurrentUser());
    }
    return result;
  }

  async function confirmSignUp(email, confirmationCode) {
    const result = await AuthService.confirmSignUp(email, confirmationCode);
    if (result.isSignUpComplete) {
      setUser(await AuthService.getCurrentUser());
    }
    return result;
  }

  async function signIn(email, password) {
    const result = await AuthService.signIn(email, password);
    if (result.isSignedIn) {
      setUser(await AuthService.getCurrentUser());
    }
    return result;
  }

  async function signOut() {
    await AuthService.signOut();
    setUser(null);
  }

  async function resendConfirmationCode(email) {
    await AuthService.resendConfirmationCode(email);
  }

  async function resetPassword(email) {
    return await AuthService.resetPassword(email);
  }

  async function confirmResetPassword(email, confirmationCode, newPassword) {
    await AuthService.confirmResetPassword(email, confirmationCode, newPassword);
  }

  return {
    user,
    loading,
    signUp,
    confirmSignUp,
    signIn,
    signOut,
    resendConfirmationCode,
    resetPassword,
    confirmResetPassword
  };
}