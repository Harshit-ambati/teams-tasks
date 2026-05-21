import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../styles/Navbar.css';
import { notificationApi } from '../api/notificationApi';
import { userApi } from '../api/userApi';
import { AUTH_EVENTS, clearAuth, getCurrentUser, getToken, setAuth } from '../utils/authStorage';

export default function Navbar({ className = '' }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getCurrentUser());
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const dropdownRef = useRef(null);
  const profileRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.getAll();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    const syncAuthUser = () => {
      const nextUser = getCurrentUser();
      setUser(nextUser);
      if (!nextUser) {
        setNotifications([]);
      }
    };

    window.addEventListener(AUTH_EVENTS.changed, syncAuthUser);
    return () => window.removeEventListener(AUTH_EVENTS.changed, syncAuthUser);
  }, []);

  useEffect(() => {
    if (!user?._id) return;

    const initialFetchId = window.setTimeout(() => {
      fetchNotifications();
    }, 0);
    const intervalId = window.setInterval(fetchNotifications, 30000);
    return () => {
      window.clearTimeout(initialFetchId);
      window.clearInterval(intervalId);
    };
  }, [user?._id, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    if (isNotificationsOpen || isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen, isProfileOpen]);

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

  const fetchProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setProfileError('Token missing. Please login again.');
      setProfileData(null);
      return;
    }

    try {
      setProfileLoading(true);
      setProfileError('');
      const data = await userApi.getMe();
      setProfileData(data);
      const currentUser = getCurrentUser() || {};
      const nextUser = {
        ...currentUser,
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        profilePic: data.profilePic || '',
      };
      setAuth({ token, user: nextUser });
      setUser(nextUser);
    } catch (error) {
      setProfileError(error.message || 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const handleProfileToggle = () => {
    const next = !isProfileOpen;
    setIsProfileOpen(next);
    if (next) {
      setProfileMessage('');
      fetchProfile();
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setProfileError('');
    setProfileMessage('');

    const token = getToken();
    if (!token) {
      setProfileError('Token missing. Please login again.');
      return;
    }

    const { currentPassword, newPassword, confirmNewPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setProfileError('All password fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setProfileError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setProfileError('New password and confirm password do not match.');
      return;
    }

    try {
      setIsPasswordUpdating(true);
      const data = await userApi.changeMyPassword({ currentPassword, newPassword });
      setProfileMessage(data?.message || 'Password updated successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (error) {
      setProfileError(error.message || 'Failed to update password.');
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((item) => !item.isRead).map((item) => item._id);
    if (unreadIds.length === 0) return;

    try {
      await Promise.all(unreadIds.map((id) => notificationApi.markRead(id)));
      await fetchNotifications();
    } catch {
      // Keep existing list if refresh fails.
    }
  }, [notifications, fetchNotifications]);

  const handleMarkRead = useCallback(async (id) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
    } catch {
      // Ignore transient failures and preserve current state.
    }
  }, []);

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
              <Link to="/chat" className="nav-link">Chat</Link>
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
              <div className="user-profile" ref={profileRef}>
                <button type="button" className="profile-trigger" onClick={handleProfileToggle}>
                  <div className="user-avatar" aria-hidden>
                    {userInitials}
                  </div>
                  <div className="user-meta">
                    <p className="user-name">{user.name || 'User'}</p>
                    <p className="user-email">{user.email || ''}</p>
                  </div>
                </button>
                <button type="button" className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
                <div className={`profile-panel ${isProfileOpen ? 'open' : ''}`}>
                  <div className="profile-panel-header">
                    <p className="profile-title">My Profile</p>
                    <button type="button" className="profile-refresh-btn" onClick={fetchProfile}>
                      Refresh
                    </button>
                  </div>
                  {profileLoading ? (
                    <p className="profile-note">Loading profile...</p>
                  ) : (
                    <>
                      <div className="profile-details">
                        <div className="profile-detail-row">
                          <span>Name</span>
                          <strong>{profileData?.name || user?.name || 'N/A'}</strong>
                        </div>
                        <div className="profile-detail-row">
                          <span>Email</span>
                          <strong>{profileData?.email || user?.email || 'N/A'}</strong>
                        </div>
                        <div className="profile-detail-row">
                          <span>Role</span>
                          <strong>{profileData?.role || userRole}</strong>
                        </div>
                        <div className="profile-detail-row">
                          <span>Department</span>
                          <strong>{profileData?.department || 'Not assigned'}</strong>
                        </div>
                      </div>
                      <form className="profile-password-form" onSubmit={handlePasswordChange}>
                        <label htmlFor="profile-current-password">Current Password</label>
                        <input
                          id="profile-current-password"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(event) =>
                            setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                          }
                        />
                        <label htmlFor="profile-new-password">New Password</label>
                        <input
                          id="profile-new-password"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(event) =>
                            setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                          }
                        />
                        <label htmlFor="profile-confirm-new-password">Confirm New Password</label>
                        <input
                          id="profile-confirm-new-password"
                          type="password"
                          value={passwordForm.confirmNewPassword}
                          onChange={(event) =>
                            setPasswordForm((prev) => ({ ...prev, confirmNewPassword: event.target.value }))
                          }
                        />
                        {profileError && <p className="profile-note error">{profileError}</p>}
                        {profileMessage && <p className="profile-note success">{profileMessage}</p>}
                        <button type="submit" className="profile-password-btn" disabled={isPasswordUpdating}>
                          {isPasswordUpdating ? 'Updating...' : 'Change Password'}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
