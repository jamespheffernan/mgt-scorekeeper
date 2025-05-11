import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Auth, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase'; // Assuming auth is exported from src/firebase.ts

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: Error | null;
  signUp: (email: string, password: string) => Promise<User | null>;
  logIn: (email: string, password: string) => Promise<User | null>;
  logOut: () => Promise<void>;
  authInitialized: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  error: null,
  signUp: async () => null,
  logIn: async () => null,
  logOut: async () => {},
  authInitialized: false,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [anonymousAuthAttempted, setAnonymousAuthAttempted] = useState(false);

  // Handle authentication state changes
  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (isMounted) {
        console.log("Auth state changed, user:", user?.uid || "none");
        setCurrentUser(user);
        setLoading(false);
        setAuthInitialized(true);
      }
    }, (error) => {
      console.error("Auth state error:", error);
      if (isMounted) {
        setError(error as Error);
        setLoading(false);
        setAuthInitialized(true);
      }
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Handle anonymous sign-in separately with a longer delay
  useEffect(() => {
    let isMounted = true;
    
    // Only attempt anonymous sign-in if:
    // 1. Auth is initialized
    // 2. There's no current user
    // 3. We haven't already tried
    if (authInitialized && !currentUser && !anonymousAuthAttempted) {
      const authTimeout = setTimeout(async () => {
        if (isMounted && !auth.currentUser) {
          console.log("Attempting anonymous sign-in");
          setAnonymousAuthAttempted(true);
          try {
            await signInAnonymously(auth);
            console.log("Anonymous sign-in successful");
          } catch (err) {
            console.error("Anonymous sign-in failed:", err);
            setError(err as Error);
          }
        }
      }, 1500); // Much longer delay to prevent loops
      
      return () => {
        clearTimeout(authTimeout);
        isMounted = false;
      };
    }
  }, [authInitialized, currentUser, anonymousAuthAttempted]);

  const signUp = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logIn = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logOut = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    signUp,
    logIn,
    logOut,
    authInitialized,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 