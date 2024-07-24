// src/pages/Home.jsx

import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import DepartmentCourseSelection from '../components/DepartmentCourseSelection';
import createAuthenticatedApi from '../utils/api';
import { toast } from 'react-toastify';
import ErrorToast from '../components/ErrorToast';
import GradientButton from '../components/GradientButton';

const Home = () => {
  const { user, signOut, getSession } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [api, setApi] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    } else {
      const authenticatedApi = createAuthenticatedApi(getSession);
      setApi(authenticatedApi);
    }
  }, [user, navigate, getSession]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const handleSelect = (department, courseId) => {
    console.log(`Selected Department: ${department}, Course ID: ${courseId}`);
    setSelectedCourse(courseId);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourse) {
      toast.error(<ErrorToast message='Please select a course.'/>);
      return;
    }
    setIsLoading(true);
    try {
      await api.get(`/load_database?course=${selectedCourse}`);
      navigate('/chat', { state: { courseId: selectedCourse } });
    } catch (error) {
      console.error('Error:', error);
      toast.error(<ErrorToast message="Error loading database. Please try again." />);
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
        <DepartmentCourseSelection onSelect={handleSelect} />
        <GradientButton 
        title={"Load Chat"}
        onClick={handleSubmit}
        isLoading={isLoading}
        
        />
        <button
          onClick={handleSignOut}
          className="w-full py-2 px-4 bg-gradient-to-r from-button-from to-button-to text-white font-psemibold rounded hover:opacity-90 transition duration-300 mt-4"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Home;
