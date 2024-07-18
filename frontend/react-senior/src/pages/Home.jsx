// src/pages/Home.js

import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import DepartmentCourseSelection from '../components/DepartmentCourseSelection';

const Home = () => {
  const { user, signOut } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const handleSelect = (department, courseId) => {
    console.log(`Selected Department: ${department}, Course ID: ${courseId}`);
  };

  if (!user) {
    navigate('/signin');
  }

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setIsLoading(true);
  //   try {
  //       await axios.get(`http://localhost:5000/load_database?course=${courseId}`);
  //       navigate('/chat', { state: { courseId } });
  //     } catch (error) {
  //       console.error('Error loading database:', error);
  //       // Handle error (show message to user)
  //     } finally {
  //       setIsLoading(false);
  //     }
   
  // };

  return (
    <div className="min-h-screen w-full bg-primary flex items-center justify-center p-4">
      <div className="bg-black-100 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="font-pbold text-secondary text-3xl mb-6 text-center">
          Welcome to Study AI
        </h1>
        <DepartmentCourseSelection onSelect={handleSelect} />
        <button onClick={handleSignOut} className="w-full py-2 px-4 bg-gradient-to-r from-button-from to-button-to text-white font-psemibold rounded hover:opacity-90 transition duration-300 mt-4">
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Home;
