import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/teams" element={<TeamsPage />} />
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
