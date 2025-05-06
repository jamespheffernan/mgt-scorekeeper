import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';
import { useGameStore } from './store/gameStore';
import { MatchSetup } from './components/setup/MatchSetup';
import SettlementView from './components/ledger/SettlementView';
import { LedgerView } from './components/ledger/LedgerView';
import { ErrorBoundary } from './components/ErrorBoundary';
// import { GameStoreTest } from './components/GameStoreTest';  // Comment out since we're using the real HoleView now
import { HoleView } from './components/hole/HoleView';  // Import the actual HoleView component
import { CoursePreview } from './components/setup/CoursePreview';
import GameHistoryView from './components/GameHistory';
import { TestFixes } from './TestFixes'; // Import our test component

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
  const [showTestFixes, setShowTestFixes] = useState(false);
  
  // Toggle course manager
  const toggleCourseManager = () => {
    setShowCourseManager(!showCourseManager);
    setShowTestFixes(false);
  };
  
  // Toggle test fixes
  const toggleTestFixes = () => {
    setShowTestFixes(!showTestFixes);
    setShowCourseManager(false);
  };
  
  // Check if there's an active match
  const hasActiveMatch = match && match.id && match.state === 'active';
  const isGameActive = match.id !== '' && match.state === 'active';
  
  // Show the test fixes component when enabled
  if (showTestFixes) {
    return (
      <ErrorBoundary>
        <div className="millbrook-app">
          <header className="app-header">
            <h1>Millbrook Scorekeeper - Test Mode</h1>
            <div className="header-actions">
              <button 
                className="course-manager-button"
                onClick={toggleTestFixes}
              >
                Back to Game
              </button>
            </div>
          </header>
          
          <main>
            <TestFixes />
          </main>
          
          <footer className="app-footer">
            <div className="app-version">v0.1.0</div>
          </footer>
        </div>
      </ErrorBoundary>
    );
  }
  
  return (
    <ErrorBoundary>
      <Router>
        <div className="millbrook-app">
          <header className="app-header">
            <h1>Millbrook Scorekeeper</h1>
            <div className="header-actions">
              <button 
                className="course-manager-button"
                onClick={toggleCourseManager}
              >
                {showCourseManager ? 'Back to Game' : 'Course Manager'}
              </button>
              <button 
                className="test-fixes-button"
                onClick={toggleTestFixes}
                style={{ marginLeft: '10px' }}
              >
                Test Fixes
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
              <Route path="/setup" element={<MatchSetup />} />
              <Route path="/hole/:holeNumber" element={<HoleView />} />
              <Route path="/ledger" element={<LedgerView />} />
              <Route path="/settlement" element={<SettlementView matchId={match.id} />} />
              <Route path="/history" element={<GameHistoryView />} />
              <Route path="/course-preview" element={<CoursePreview />} />
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
