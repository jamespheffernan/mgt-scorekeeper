import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './auth.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading, authInitialized } = useAuth();
  
  // Only show loading while auth is initializing
  if (loading || !authInitialized) {
    return <div className="loading">Loading...</div>;
  }
  
  // Always render children, assuming anonymous auth will work
  return <>{children}</>;
};

export default ProtectedRoute; 