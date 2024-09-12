import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Import axios for making API requests

const DepartmentCourseSelection = ({ onSelect }) => {
  const [department, setDepartment] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courseOptions, setCourseOptions] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/courses') 
      .then((response) => {
        setCourseOptions(response.data);
      })
      .catch((error) => {
        console.error("Error fetching courses:", error);
      });
  }, []);

  const handleSelect = () => {
    onSelect(department, courseId);
  };

  return (
    <div>
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
        onClick={handleSelect}
        className="w-full py-2 px-4 bg-gradient-to-r from-button-from to-button-to text-white font-psemibold rounded hover:opacity-90 transition duration-300 mt-4"
      >
        Select
      </button>
    </div>
  );
};

export default DepartmentCourseSelection;
