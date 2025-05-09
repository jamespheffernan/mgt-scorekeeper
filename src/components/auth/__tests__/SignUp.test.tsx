import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SignUp from '../SignUp';
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

describe('SignUp Component', () => {
  const mockSignUp = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementation
    (useAuth as jest.Mock).mockReturnValue({
      signUp: mockSignUp,
      error: null,
      loading: false
    });
  });
  
  const renderComponent = () => 
    render(
      <BrowserRouter>
        <SignUp />
      </BrowserRouter>
    );

  test('renders sign up form with email and password fields', () => {
    renderComponent();
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  test('displays validation errors for empty fields', async () => {
    renderComponent();
    
    const signUpButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(signUpButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  test('calls signUp when valid data is submitted', async () => {
    renderComponent();
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signUpButton = screen.getByRole('button', { name: /sign up/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signUpButton);
    
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('displays login link', () => {
    renderComponent();
    
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
  });
}); 