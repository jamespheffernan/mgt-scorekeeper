import React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './styles/base.css';
import './styles/utilities.css';
import './styles/ledger.css';
import './styles/settlement.css';
import './styles/course-management.css';
import './styles/app-layout.css';
import './styles/components.css';
import './styles/modals.css';
import { useGameStore } from './store/gameStore';
// import MatchSetup from './components/setup/MatchSetup';
import SettlementView from './components/ledger/SettlementView';
import { LedgerView } from './components/ledger/LedgerView';
import { ErrorBoundary } from './components/ErrorBoundary';
// import { GameStoreTest } from './components/GameStoreTest';  // Comment out since we're using the real HoleView now
import { ResponsiveHoleView } from './components/hole/ResponsiveHoleView';  // Import the responsive component
import { CoursePreview } from './components/setup/CoursePreview';
import GameHistoryView from './components/GameHistory';
// import { TestFixes } from './TestFixes'; // Comment out or remove if TestFixes.tsx will be deleted
import SignUp from './components/auth/SignUp';
import LogIn from './components/auth/LogIn';
import UserProfile from './components/auth/UserProfile';
import ProtectedRoute from './components/auth/ProtectedRoute';
import TopBar from './components/TopBar';
import { useAuth } from './context/AuthContext';
import { PlayersScreen } from './components/setup/PlayersScreen';
import TeeSelectionScreen from './components/setup/TeeSelectionScreen';
import { runAllMigrations } from './utils/migrateFirestorePlayers';
import AdminDebugPage from './components/admin/AdminDebugPage';
import LedgerView2 from './components/ledger/LedgerView2';

// Uncomment these for testing/development
/*
import { DatabaseTest } from './components/DatabaseTest';
import { StrokeAllocatorTest } from './components/StrokeAllocatorTest';
import { BaseCalculatorTest } from './components/BaseCalculatorTest';
import { PayoutCalculatorTest } from './components/PayoutCalculatorTest';
import { JunkCalculatorTest } from './components/JunkCalculatorTest';
import { BigGameCalculatorTest } from './components/BigGameCalculatorTest';
*/

function App() {
  // Access store state
  const match = useGameStore(state => state.match);
  const { currentUser, loading, authInitialized } = useAuth();
  
  // Migration state
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'success' | 'failed' | 'unnecessary'>('pending');
  
  // Run migrations on startup
  useEffect(() => {
    // Only run migrations if auth is initialized and we have a user
    if (authInitialized && currentUser) {
      const performMigrations = async () => {
        try {
          // Check localStorage to see if we've already run this migration for this version
          const migrationVersion = localStorage.getItem('nameFieldsMigrationVersion');
          const currentVersion = '0.2.0'; // Update this when migration changes
          
          if (migrationVersion === currentVersion) {
            console.log('Names migration already completed for this version.');
            setMigrationStatus('unnecessary');
            return;
          }
          
          console.log('Starting names migration...');
          const success = await runAllMigrations();
          
          if (success) {
            // Store migration version in localStorage
            localStorage.setItem('nameFieldsMigrationVersion', currentVersion);
            setMigrationStatus('success');
            console.log('Names migration completed successfully.');
          } else {
            setMigrationStatus('failed');
            console.error('Names migration failed.');
          }
        } catch (error) {
          console.error('Error during names migration:', error);
          setMigrationStatus('failed');
        }
      };
      
      performMigrations();
    }
  }, [authInitialized, currentUser]);
  
  // Component state
  // const [showCourseManager, setShowCourseManager] = useState(false);
  // const toggleCourseManager = () => {
  //   setShowCourseManager(!showCourseManager);
  // };
  
  // Check if there's an active match
  const hasActiveMatch = match && match.id && match.state === 'active';
  // const isGameActive = match.id !== '' && match.state === 'active'; // No longer directly used here for links

  // If loading or auth not initialized, show a simple loading screen to prevent any redirects
  if (loading || !authInitialized) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  return (
    <ErrorBoundary>
      <Router>
        <div className="millbrook-app">
          <header className="app-header">
            <TopBar />
            {/* The header-actions div has been removed to prevent overlay issues */}
            {/* UserProfile, Course Manager, and other global links need a new home, e.g., inside TopBar or a sidebar */}
          </header>
          
          {migrationStatus === 'failed' && (
            <div className="migration-error-banner">
              There was an issue upgrading your data. Some features may not work correctly.
            </div>
          )}
          
          <main>
            <Routes>
              <Route path="/" element={
                hasActiveMatch ? <Navigate to={`/hole/${match.currentHole}`} /> : <Navigate to="/roster" />
              } />
              <Route path="/login" element={<LogIn />} />
              <Route path="/signup" element={<SignUp />} />
              {/* 
              <Route 
                path="/setup" 
                element={<MatchSetup />} 
              /> 
              */}
              <Route 
                path="/roster" 
                element={
                  <ProtectedRoute>
                    <PlayersScreen />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tee-selection" 
                element={
                  <ProtectedRoute>
                    <TeeSelectionScreen />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/hole/:holeNumber" 
                element={
                  <ProtectedRoute>
                    <ResponsiveHoleView />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/ledger" 
                element={
                  <ProtectedRoute>
                    <LedgerView2 />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/ledger2" 
                element={
                  <ProtectedRoute>
                    <LedgerView2 />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settlement" 
                element={
                  <ProtectedRoute>
                    <SettlementView matchId={match.id} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/history" 
                element={
                  <ProtectedRoute>
                    <GameHistoryView />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/course-preview" 
                element={
                  <ProtectedRoute>
                    <CoursePreview />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin-debug" 
                element={<AdminDebugPage />} 
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          
          <footer className="app-footer">
            <div className="app-version">v0.2.0</div>
          </footer>
          
          {/* Uncomment for testing/development
          <div className="test-section">
            <h2>Component Tests</h2>
            <GameStoreTest />
            <BigGameCalculatorTest />
            <JunkCalculatorTest />
            <PayoutCalculatorTest />
            <BaseCalculatorTest />
            <StrokeAllocatorTest />
            <DatabaseTest />
          </div>
          */}
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
