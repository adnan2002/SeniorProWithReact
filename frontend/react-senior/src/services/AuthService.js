import { signUp, confirmSignUp, signIn, signOut, getCurrentUser } from 'aws-amplify/auth';

class AuthService {
  async signUp(email, password) {
    try {
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
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
      return { isSignedIn, nextStep };
    } catch (error) {
      console.error('Error signing in:', error);
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
}

export default new AuthService();