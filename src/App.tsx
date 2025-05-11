import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';
import { useGameStore } from './store/gameStore';
import { MatchSetup } from './components/setup/MatchSetup';
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
  
  // Component state
  const [showCourseManager, setShowCourseManager] = useState(false);
  
  // Toggle course manager
  const toggleCourseManager = () => {
    setShowCourseManager(!showCourseManager);
  };
  
  // Check if there's an active match
  const hasActiveMatch = match && match.id && match.state === 'active';
  const isGameActive = match.id !== '' && match.state === 'active';
  
  return (
    <ErrorBoundary>
      <Router>
        <div className="millbrook-app">
          <header className="app-header">
            <h1>Millbrook Scorekeeper</h1>
            <div className="header-actions">
              <UserProfile />
              <button 
                className="course-manager-button"
                onClick={toggleCourseManager}
              >
                {showCourseManager ? 'Back to Game' : 'Course Manager'}
              </button>
              {isGameActive && !showCourseManager && (
                <Link 
                  to="/ledger" 
                  className="nav-button"
                  style={{ marginLeft: '10px' }}
                >
                  View Ledger
                </Link>
              )}
              {!isGameActive && !showCourseManager && (
                <Link 
                  to="/history" 
                  className="nav-button"
                  style={{ marginLeft: '10px' }}
                >
                  Game History
                </Link>
              )}
            </div>
          </header>
          
          <main>
            <Routes>
              <Route path="/" element={hasActiveMatch ? <Navigate to={`/hole/${match.currentHole}`} /> : <Navigate to="/setup" />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/login" element={<LogIn />} />
              <Route 
                path="/setup" 
                element={
                  <ProtectedRoute>
                    <MatchSetup />
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
                    <LedgerView />
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
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          
          <footer className="app-footer">
            <div className="app-version">v0.1.0</div>
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
