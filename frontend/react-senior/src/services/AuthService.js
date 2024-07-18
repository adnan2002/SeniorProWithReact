// src/services/AuthService.js

import { signUp, confirmSignUp, signIn, signOut, getCurrentUser, resendSignUpCode, resetPassword, confirmResetPassword, fetchAuthSession} from 'aws-amplify/auth';

class AuthService {
  async signUp(email, password, phone_number) {
    try {
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            phone_number: phone_number
          },
          autoSignIn: true
        }
      });
      return { isSignUpComplete, userId, nextStep };
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  async confirmSignUp(email, confirmationCode) {
    try {
      const { isSignUpComplete, nextStep } = await confirmSignUp({
        username: email,
        confirmationCode
      });
      return { isSignUpComplete, nextStep };
    } catch (error) {
      console.error('Error confirming sign up:', error);
      throw error;
    }
  }

  async signIn(email, password) {
    try {
      const { isSignedIn, nextStep } = await signIn({ username: email, password });
      if (isSignedIn) {
        const session = await this.getSession();
        return { isSignedIn, nextStep, session };
      }
      return { isSignedIn, nextStep };
    } catch (error) {
      console.error('Error signing in:', error.message);  
      throw new Error(error.message);
    }
  }

  async getSession() {
    try {
      const session = await fetchAuthSession();
      return session;
    } catch (error) {
      console.error('Error fetching auth session:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const user = await getCurrentUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async resendConfirmationCode(email) {
    try {
      await resendSignUpCode({ username: email });
    } catch (error) {
      console.error('Error resending confirmation code:', error);
      throw error;
    }
  }

  async resetPassword(email) {
    try {
      const output = await resetPassword({ username: email });
      return output;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  async confirmResetPassword(email, confirmationCode, newPassword) {
    try {
      await confirmResetPassword({ username: email, confirmationCode, newPassword });
    } catch (error) {
      console.error('Error confirming password reset:', error);
      throw error;
    }
  }

}




export default new AuthService();
