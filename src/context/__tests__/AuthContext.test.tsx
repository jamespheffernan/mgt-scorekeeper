import React from 'react';
import { render, act, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock firebase auth functions
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockSignOut = jest.fn();
const mockOnAuthStateChanged = jest.fn();

// Mock the firebase module
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args)
}));

// Mock the firebase file
jest.mock('../../firebase', () => ({
  auth: { name: 'mockAuth' }
}));

// Import after mocking
import { AuthProvider, useAuth } from '../AuthContext';
import { User } from 'firebase/auth';

// Test component to access auth context values
const TestComponent: React.FC = () => {
  const { currentUser, loading, error, signUp, logIn, logOut } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'true' : 'false'}</div>
      <div data-testid="user">{currentUser ? currentUser.email : 'no user'}</div>
      <div data-testid="error">{error ? error.message : 'no error'}</div>
      <button onClick={() => signUp('test@example.com', 'password')}>Sign Up</button>
      <button onClick={() => logIn('test@example.com', 'password')}>Log In</button>
      <button onClick={() => logOut()}>Log Out</button>
    </div>
  );
};

describe('AuthContext', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('initializes with loading state', () => {
    // Don't call the callback to simulate loading state
    mockOnAuthStateChanged.mockImplementation(() => {
      return jest.fn(); // Return unsubscribe function
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });
  
  test('updates user state when auth state changes', () => {
    const mockUser = { email: 'test@example.com' } as User;
    
    // Immediately call the callback with a user
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return jest.fn(); // Return unsubscribe function
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });
  
  test('handles sign up', async () => {
    const mockUser = { email: 'test@example.com' } as User;
    
    // Mock auth state to start with no user
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return jest.fn();
    });
    
    // Mock successful sign up
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockUser
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Trigger sign up
    await act(async () => {
      screen.getByText('Sign Up').click();
    });
    
    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      { name: 'mockAuth' }, 'test@example.com', 'password'
    );
  });
  
  test('handles log in', async () => {
    const mockUser = { email: 'test@example.com' } as User;
    
    // Mock auth state to start with no user
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return jest.fn();
    });
    
    // Mock successful login
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: mockUser
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Trigger login
    await act(async () => {
      screen.getByText('Log In').click();
    });
    
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      { name: 'mockAuth' }, 'test@example.com', 'password'
    );
  });
  
  test('handles log out', async () => {
    const mockUser = { email: 'test@example.com' } as User;
    
    // Mock auth state to start with a logged in user
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return jest.fn();
    });
    
    // Mock successful logout
    mockSignOut.mockResolvedValue(undefined);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Trigger logout
    await act(async () => {
      screen.getByText('Log Out').click();
    });
    
    expect(mockSignOut).toHaveBeenCalledWith({ name: 'mockAuth' });
  });
  
  test('handles authentication errors', async () => {
    // Mock auth state to start with no user
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return jest.fn();
    });
    
    // Mock login error
    const mockError = new Error('Auth failed');
    mockSignInWithEmailAndPassword.mockRejectedValue(mockError);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Trigger login which will fail
    await act(async () => {
      screen.getByText('Log In').click();
    });
    
    // Should display the error
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Auth failed');
    });
  });
}); 