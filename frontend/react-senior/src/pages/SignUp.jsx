import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';
import PhoneInput from '../components/PhoneInput';
import GradientButton from '../components/GradientButton';
import { toast } from 'react-toastify';
import ErrorToast from '../components/ErrorToast';


const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, confirmSignUp, resendConfirmationCode, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [isSignUpComplete, setIsSignUpComplete] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (user) {
      navigate('/');
    } else if (location.state?.needConfirmation) {
      setIsSignUpComplete(true);
      setEmail(location.state.email);
    }

    // Check if there's a stored timestamp in localStorage
    const storedTimestamp = localStorage.getItem('resendTimestamp');
    if (storedTimestamp) {
      const elapsedTime = Date.now() - parseInt(storedTimestamp);
      if (elapsedTime < 30000) {
        setResendDisabled(true);
        setResendTimer(Math.ceil((30000 - elapsedTime) / 1000));
      }
    }
  }, [user, location, navigate]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);


  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signUp(email, password, phone);
      if (result) {
        setIsSignUpComplete(true);
      }
    } catch (error) {
      console.error('Error signing up:', error);
      toast.error(<ErrorToast message={error.message} />);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await confirmSignUp(email, confirmationCode);
      navigate('/');
    } catch (error) {
      console.error('Error confirming sign up:', error);
      toast.error(<ErrorToast message={error.message} />);
    } finally {
      setIsLoading(false);
    }
  };
  const handleResendCode = async () => {
    setResendDisabled(true);
    setResendTimer(30);
    try {
      await resendConfirmationCode(email);
      toast.success('Confirmation code resent successfully');
      // Store the current timestamp in localStorage
      localStorage.setItem('resendTimestamp', Date.now().toString());
    } catch (error) {
      console.error('Error resending confirmation code:', error);
      toast.error('Failed to resend confirmation code');
    }
  };
  
  return (
    <div className="min-h-screen w-full bg-primary flex items-center justify-center p-4">
      <div className="bg-black-100 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="font-pbold text-secondary text-3xl mb-6 text-center">
          {isSignUpComplete ? 'Confirm Email' : 'Create Account'}
        </h1>
        <form onSubmit={isSignUpComplete ? handleConfirmSubmit : handleSignUpSubmit} className="space-y-4">
          {isSignUpComplete ? (
            <>
              <EmailInput 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                disabled={true} 
              />
              <div>
                <label htmlFor="confirmationCode" className="font-pmedium text-gray-100 block mb-2">
                  Confirmation Code
                </label>
                <input
                  id="confirmationCode"
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  className="w-full px-3 py-2 bg-black-200 text-white font-pregular rounded focus:outline-none focus:ring-2 focus:ring-secondary"
                  required
                />
              </div>
              <GradientButton
                title={isLoading ? 'Confirming...' : 'Confirm'}
                onClick={handleConfirmSubmit}
                isLoading={isLoading}
              />
              <div  className='mb-3 justify-center'> 
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendDisabled}
                className={`mt-2 text-secondary-100 hover:text-secondary-200 ${resendDisabled ? 'text-gray-500 opacity-60' : ''}`}
              >
                {resendDisabled ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </button>
              </div>
            </>
          ) : (
            <>
              <EmailInput 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
              <PasswordInput 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
              <PhoneInput 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
              />
              <GradientButton
                title={isLoading ? 'Signing Up...' : 'Sign Up'}
                onClick={handleSignUpSubmit}
                isLoading={isLoading}
              />
            </>
          )}
        </form>
        <div className='mt-3'>
          <p className='font-pmedium text-white'>
            Already have an account? <Link to='/signin' className='text-secondary-100 hover:underline-offset-2 cursor-pointer'>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
  
  
};

export default SignUp;