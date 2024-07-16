import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
const Home = () => {
  const [universityId, setUniversityId] = useState('');
  const [department, setDepartment] = useState('');
  const [courseId, setCourseId] = useState('');
  const [idError, setIdError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
 

  const courseOptions = ['ITCE314', 'ITCS325', 'ITCS222'];


  const validateUniversityId = (id) => {
    const regex = /^(19[8-9]\d|20\d{2})\d{1,5}$/;
    if (!regex.test(id)) {
      setIdError('Please enter a valid ID');
      return false;
    }
    setIdError('');
    return true;
  };

  const handleUniversityIdChange = (e) => {
    const id = e.target.value;
    setUniversityId(id);
    validateUniversityId(id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        await axios.get(`http://localhost:5000/load_database?course=${courseId}`);
        navigate('/chat', { state: { courseId } });
      } catch (error) {
        console.error('Error loading database:', error);
        // Handle error (show message to user)
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
          <div>
            <label htmlFor="universityId" className="font-pmedium text-gray-100 block mb-2">
              University ID
            </label>
            <input
              type="text"
              id="universityId"
              value={universityId}
              onChange={handleUniversityIdChange}
              className={`w-full px-3 py-2 bg-black-200 text-white font-pregular rounded focus:outline-none focus:ring-2 ${idError ? 'ring-2 ring-red-500' : 'focus:ring-secondary'}`}
              required
            />
            {idError && <p className="text-red-500 text-sm mt-1">{idError}</p>}
          </div>
          <div>
            <label htmlFor="department" className="font-pmedium text-gray-100 block mb-2">
              Department
            </label>
            <select
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 bg-black-200 text-white font-pregular rounded focus:outline-none focus:ring-2 focus:ring-secondary"
              required
            >
              <option value="">Select Department</option>
              <option value="Information Technology">Information Technology</option>
            </select>
          </div>
          {department && (
            <div>
              <label htmlFor="courseId" className="font-pmedium text-gray-100 block mb-2">
                Course ID
              </label>

              <select
                id="courseId"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 bg-black-200 text-white font-pregular rounded focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              >
                <option value="">Select Course ID</option>
                {courseOptions.map((course) => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>
          )}
<button
  type="submit"
  disabled={isLoading}
  className="w-full py-2 px-4 bg-gradient-to-r from-button-from to-button-to text-white font-psemibold rounded hover:opacity-90 transition duration-300 flex items-center justify-center"
>
  {isLoading ? (
    <>
      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Logging in...
    </>
  ) : (
    'Login'
  )}
</button>
        </form>
      </div>
    </div>
  );
};

export default Home;