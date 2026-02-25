import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../styles/Navbar.css';
import { notificationApi } from '../api/notificationApi';
import { clearAuth, getCurrentUser } from '../utils/authStorage';

export default function Navbar({ className = '' }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const user = getCurrentUser();

  useEffect(() => {
    if (!user) return;

    notificationApi
      .getAll()
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]));
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  const userInitials = (() => {
    const name = (user?.name || '').trim();
    if (!name) return 'U';

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  })();

  const userRole = user?.role || 'team_member';
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const formatTimestamp = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleMarkAllRead = async () => {
    await Promise.all(
      notifications
        .filter((item) => !item.isRead)
        .map((item) => notificationApi.markRead(item._id))
    );
    const refreshed = await notificationApi.getAll();
    setNotifications(Array.isArray(refreshed) ? refreshed : []);
  };

  const handleMarkRead = async (id) => {
    await notificationApi.markRead(id);
    setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
  };

  return (
    <header className={`app-navbar ${className}`.trim()}>
      <div className="container navbar-inner">
        <div className="brand-wrap">
          <Link to="/" className="brand">
            <img src={logo} alt="Teams and Tasks" className="logo" data-splash-target="logo" />
          </Link>
        </div>

        <nav className="nav-links">
          {!user ? (
            <>
              <Link to="/signup" className="nav-link">Sign up</Link>
              <Link to="/login" className="nav-link nav-cta">Login</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/projects" className="nav-link">Projects</Link>
              <Link to="/teams" className="nav-link">Teams</Link>
              <Link to="/tasks" className="nav-link">Tasks</Link>
              {userRole === 'admin' && (
                <Link to="/audit-logs" className="nav-link">Audit Logs</Link>
              )}
              <div className="notification-wrap" ref={dropdownRef}>
                <button
                  type="button"
                  className="notification-btn"
                  onClick={() => setIsNotificationsOpen((prev) => !prev)}
                  aria-label="Notifications"
                >
                  <span className="notification-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                      <path d="M12 22a2.5 2.5 0 0 0 2.4-1.8h-4.8A2.5 2.5 0 0 0 12 22Zm7-6.4V11a7 7 0 1 0-14 0v4.6L3.6 18c-.5.7 0 1.7.9 1.7h15c.9 0 1.4-1 .9-1.7L19 15.6Z" />
                    </svg>
                  </span>
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </button>
                <div className={`notification-panel ${isNotificationsOpen ? 'open' : ''}`}>
                  <div className="notification-panel-header">
                    <div>
                      <p className="notification-title">Notifications</p>
                      <span className="notification-subtitle">{unreadCount} unread</span>
                    </div>
                    <button
                      type="button"
                      className="notification-action"
                      onClick={handleMarkAllRead}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <p className="notification-empty">No notifications yet.</p>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item._id}
                          className={`notification-item ${item.type} ${item.isRead ? 'read' : 'unread'}`}
                        >
                          <div className="notification-item-body">
                            <span className={`notification-type ${item.type}`}>{item.type}</span>
                            <p className="notification-message">{item.message}</p>
                            <span className="notification-time">{formatTimestamp(item.createdAt)}</span>
                          </div>
                          {!item.isRead && (
                            <button
                              type="button"
                              className="notification-read-btn"
                              onClick={() => handleMarkRead(item._id)}
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="user-profile">
                <div className="user-avatar" aria-hidden>
                  {userInitials}
                </div>
                <div className="user-meta">
                  <p className="user-name">{user.name || 'User'}</p>
                  <p className="user-email">{user.email || ''}</p>
                </div>
                <button type="button" className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
