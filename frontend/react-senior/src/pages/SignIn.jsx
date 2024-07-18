import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import ErrorToast from '../components/ErrorToast';
import { toast } from 'react-toastify';
import GradientButton from '../components/GradientButton';
import EmailInput from '../components/EmailInput';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.nextStep.signInStep === "CONFIRM_SIGN_UP") {
        navigate('/signup', { state: { email, needConfirmation: true } });
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      toast.error(<ErrorToast message={error.message} />);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen w-full bg-primary flex items-center justify-center p-4">
      <div className="bg-black-100 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="font-pbold text-secondary text-3xl mb-6 text-center">
          Welcome to Study AI
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <EmailInput value={email} onChange={(e) => setEmail(e.target.value)} />
          <div>
      <label htmlFor="password" className="font-pmedium text-gray-100 block mb-2">
        Password
      </label>
      <input
        type="password"
        id="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
        }}
        className={"w-full px-3 py-2 bg-black-200 text-white font-pregular rounded focus:outline-none focus:ring-2 focus:ring-secondary"}
        required
      />
      <div className='mt-3'>
      <Link to="/forgot" className='text-white hover:underline-offset-2 font-pextralight '>Forgotten your password?</Link>
      </div>


    </div>          <GradientButton
            title="Continue"
            onClick={handleSubmit}
            isLoading={isLoading}
          />
        </form>
        <div className='mt-3'>
          <p className='font-pmedium text-white'>
            Don't have an account? <Link to='/signup' className='text-secondary-100 hover:underline-offset-2 cursor-pointer'>Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;