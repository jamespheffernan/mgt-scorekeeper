import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LogIn from '../LogIn';
import { useAuth } from '../../../context/AuthContext';
import '@testing-library/jest-dom';

// Mock useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock useAuth
jest.mock('../../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('LogIn Component', () => {
  const mockLogIn = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementation
    (useAuth as jest.Mock).mockReturnValue({
      logIn: mockLogIn,
      error: null,
      loading: false
    });
  });
  
  const renderComponent = () => 
    render(
      <BrowserRouter>
        <LogIn />
      </BrowserRouter>
    );

  test('renders login form with email and password fields', () => {
    renderComponent();
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  test('displays validation errors for empty fields', async () => {
    renderComponent();
    
    const loginButton = screen.getByRole('button', { name: /log in/i });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  test('calls logIn when valid data is submitted', async () => {
    renderComponent();
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /log in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(mockLogIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('displays sign up link', () => {
    renderComponent();
    
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
  });
}); 