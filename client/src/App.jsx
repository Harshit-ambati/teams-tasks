import React from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TaskManager from "./pages/TaskManager";
import Signup from "./pages/Signup";
import ProjectsPage from "./pages/ProjectsPage";
import TeamsPage from "./pages/TeamsPage";
import { TaskProvider } from "./context/TaskContext";
import { ProjectProvider } from "./context/ProjectContext";
import Splash from "./components/Splash";
import Navbar from "./components/Navbar";
import './App.css';

function ConditionalNavbar({ splashActive }) {
  return <Navbar className={splashActive ? "splash-hidden" : ""} />;
}

function isAuthenticated() {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  return Boolean(token && user);
}

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  return (
    <TaskProvider>
      <ProjectProvider>
        <BrowserRouter>
          <div className="app">
            <ConditionalNavbar splashActive={showSplash} />
            {showSplash && <Splash onComplete={() => setShowSplash(false)} />}
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute>
                      <ProjectsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teams"
                  element={
                    <ProtectedRoute>
                      <TeamsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tasks"
                  element={
                    <ProtectedRoute>
                      <TaskManager />
                    </ProtectedRoute>
                  }
                />
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
