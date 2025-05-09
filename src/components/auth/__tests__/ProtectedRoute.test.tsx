import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import '@testing-library/jest-dom';

// Mock useAuth
jest.mock('../../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading indicator when loading is true', () => {
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: null,
      loading: true
    });
    
    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  test('redirects to login when user is not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: null,
      loading: false
    });
    
    const mockNavigate = jest.fn();
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByText(/login page/i)).toBeInTheDocument();
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  test('renders children when user is authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: { uid: '123', email: 'test@example.com' },
      loading: false
    });
    
    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );
    
    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
  });
}); 