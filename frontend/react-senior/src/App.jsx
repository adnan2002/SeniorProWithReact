import Home from "./pages/Home"
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Chat from "./pages/Chat";
const App = ()=>{
  return (
    <div className="h-screen w-full ">
      <Router>
        <Routes>
          <Route path="/" element={<Home/>}></Route>
          <Route path="/chat" element={<Chat/>}></Route>
        </Routes>
      </Router>
  </div>
  )
}

export default App