import React from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TaskManager from "./pages/TaskManager";
import Signup from "./pages/Signup";
import { TaskProvider } from "./context/TaskContext";
import { ProjectProvider } from "./context/ProjectContext";
import Splash from "./components/Splash";
import Navbar from "./components/Navbar";
import './App.css';

function ConditionalNavbar() {
  const location = useLocation();
  const [showSplash, setShowSplash] = React.useState(true);

  // Navbar hidden on Tasks page
  const shouldShowNavbar = location.pathname !== '/tasks';

  return (
    <>
      {shouldShowNavbar && (
        <Navbar className="app-navbar" />
      )}
    </>
  );
}

function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3300);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <Splash onComplete={() => setShowSplash(false)} />;
  }

  return (
    <TaskProvider>
      <ProjectProvider>
        <BrowserRouter>
          <div className="app">
            <ConditionalNavbar />
            <Routes>
  <Route path="/" element={<Home />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/tasks" element={<TaskManager />} />
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
</Routes>

          </div>
        </BrowserRouter>
      </ProjectProvider>
    </TaskProvider>
  );
}

export default App;
