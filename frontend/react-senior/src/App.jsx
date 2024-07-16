import Home from "./pages/Home"
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Chat from "./pages/Chat";
import { useAuth } from './hooks/useAuth';



const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  return children;
};


const App = ()=>{
  return (
    <div className="h-screen w-full ">
      <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  </div>
  )
}

export default App