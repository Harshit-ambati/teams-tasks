import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TaskManager from './pages/TaskManager';
import Signup from './pages/Signup';
import ProjectsPage from './pages/ProjectsPage';
import TeamsPage from './pages/TeamsPage';
import AuditLogs from './pages/AuditLogs';
import { TaskProvider } from './context/TaskContext';
import { ProjectProvider } from './context/ProjectContext';
import Splash from './components/Splash';
import Navbar from './components/Navbar';
import { getCurrentUser, getToken } from './utils/authStorage';
import './App.css';

function ConditionalNavbar({ splashActive }) {
  return <Navbar className={splashActive ? 'splash-hidden' : ''} />;
}

function isAuthenticated() {
  return Boolean(getToken() && getCurrentUser());
}

function ProtectedRoute({ children, roles }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(roles) && roles.length > 0) {
    const role = getCurrentUser()?.role;
    if (!roles.includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const onUnauthorized = () => {
      window.location.assign('/login');
    };

    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

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
                  <ProtectedRoute roles={['admin', 'project_manager', 'department_leader']}>
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
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AuditLogs />
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
