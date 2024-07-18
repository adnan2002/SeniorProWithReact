// src/App.jsx

import Home from "./pages/Home"
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Chat from "./pages/Chat";
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from "./contexts/AuthContext";
import { ToastContainer } from 'react-toastify';
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgottenPassword from "./pages/ForgottenPassword";
import 'react-toastify/dist/ReactToastify.css';


const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" />;
  }

  return children;
};


const App = ()=>{
  return (
    <AuthProvider>
    <div className="h-screen w-full ">
      <Router>
      <Routes>
          <Route path="/" element={<Home />} />
          <Route path='/signin' element={<SignIn/>}/>
          <Route path='/signup' element={<SignUp/>}/>
          <Route path='/forgot' element={<ForgottenPassword/>}/>

        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } 
        />
      </Routes>
      <ToastContainer/>
    </Router>
  </div>
  </AuthProvider>
  )
}

export default App