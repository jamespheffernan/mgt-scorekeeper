import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './auth.css';

const UserProfile: React.FC = () => {
  const { currentUser, logOut, loading } = useAuth();

  const handleLogOut = async () => {
    try {
      await logOut();
      // No need to navigate, AuthContext will trigger a re-render
      // and update the UI accordingly
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="user-profile">
      {currentUser ? (
        <div className="user-info">
          <span className="user-email">{currentUser.email}</span>
          <button 
            className="logout-button"
            onClick={handleLogOut}
            disabled={loading}
          >
            {loading ? 'Logging Out...' : 'Log Out'}
          </button>
        </div>
      ) : (
        <div className="auth-links">
          <Link to="/login" className="auth-link">Log In</Link>
          <span className="auth-divider">|</span>
          <Link to="/signup" className="auth-link">Sign Up</Link>
        </div>
      )}
    </div>
  );
};

export default UserProfile; 