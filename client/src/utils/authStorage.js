const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const AUTH_CHANGED_EVENT = 'auth:changed';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';

export const setAuth = ({ token, user }) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
};

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AUTH_EVENTS = {
  changed: AUTH_CHANGED_EVENT,
};
