import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UserProfile from '../UserProfile';
import { AuthProvider } from '../../../context/AuthContext';
import '@testing-library/jest-dom';
import { useAuth } from '../../../context/AuthContext';

// Mock the useAuth hook
jest.mock('../../../context/AuthContext', () => ({
  ...jest.requireActual('../../../context/AuthContext'),
  useAuth: jest.fn(),
}));

describe('UserProfile Component', () => {
  const mockLogOut = jest.fn();
  
  beforeEach(() => {
    mockLogOut.mockClear();
  });

  const renderComponent = () => 
    render(
      <BrowserRouter>
        <UserProfile />
      </BrowserRouter>
    );

  test('renders login and signup links when user is not logged in', () => {
    // Mock the user as not logged in
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: null,
      loading: false,
      error: null,
      logOut: mockLogOut
    });
    
    renderComponent();
    
    expect(screen.getByText(/log in/i)).toBeInTheDocument();
    expect(screen.getByText(/sign up/i)).toBeInTheDocument();
    expect(screen.queryByText(/log out/i)).not.toBeInTheDocument();
  });

  test('renders user email and logout button when user is logged in', () => {
    // Mock the user as logged in
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: { email: 'test@example.com' },
      loading: false,
      error: null,
      logOut: mockLogOut
    });
    
    renderComponent();
    
    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
  });

  test('calls logOut function when logout button is clicked', () => {
    // Mock the user as logged in
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: { email: 'test@example.com' },
      loading: false,
      error: null,
      logOut: mockLogOut
    });
    
    renderComponent();
    
    const logoutButton = screen.getByRole('button', { name: /log out/i });
    fireEvent.click(logoutButton);
    
    expect(mockLogOut).toHaveBeenCalledTimes(1);
  });
}); 