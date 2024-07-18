// src/hooks/useAuth.js

import { useState, useEffect, useCallback } from 'react';
import AuthService from '../services/AuthService';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuthState = useCallback(async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const currentSession = await AuthService.getSession();
        setSession(currentSession);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  async function signUp(email, password, phone_number) {
    const result = await AuthService.signUp(email, password, phone_number);
    if (result.isSignUpComplete) {
      await checkAuthState();
    }
    return result;
  }

  async function confirmSignUp(email, confirmationCode) {
    const result = await AuthService.confirmSignUp(email, confirmationCode);
    if (result.isSignUpComplete) {
      await checkAuthState();
    }
    return result;
  }

  async function signIn(email, password) {
    const result = await AuthService.signIn(email, password);
    if (result.isSignedIn) {
      await checkAuthState();
    }
    return result;
  }

  async function signOut() {
    await AuthService.signOut();
    setUser(null);
    setSession(null);
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
    session,
    signUp,
    confirmSignUp,
    signIn,
    signOut,
    resendConfirmationCode,
    resetPassword,
    confirmResetPassword,
    getSession: AuthService.getSession
  };
}