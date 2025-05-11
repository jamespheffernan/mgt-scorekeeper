import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './auth.css';

const UserProfile: React.FC = () => {
  const { currentUser, logOut, loading } = useAuth();

  // Hide UI for anonymous or not-logged-in users
  if (!currentUser || currentUser.isAnonymous) {
    return null;
  }

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
    </div>
  );
};

export default UserProfile; 