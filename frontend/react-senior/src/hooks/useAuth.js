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

  async function signUp(email, password) {
    const result = await AuthService.signUp(email, password);
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

  return {
    user,
    loading,
    signUp,
    confirmSignUp,
    signIn,
    signOut
  };
}