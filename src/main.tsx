import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/root.css'
import './index.css'
import { AuthProvider } from './context/AuthContext'

// Add viewport height fix for mobile browsers
function setVHVariable() {
  // Adjust for mobile browsers with variable height (url bar appears/disappears)
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  // Fix for scrolling issues on iOS
  document.documentElement.style.setProperty('overflow', 'auto');
  document.documentElement.style.setProperty('-webkit-overflow-scrolling', 'touch');
  
  // Fix for tab scrolling issue
  const firstTabButton = document.querySelector('.tab-button');
  if (firstTabButton) {
    (firstTabButton as HTMLElement).focus();
    (firstTabButton as HTMLElement).blur();
  }
}

// Set the --vh variable on initial load
setVHVariable();

// Update on resize and orientation change
window.addEventListener('resize', setVHVariable);
window.addEventListener('orientationchange', setVHVariable);

// Focus and blur a dummy element to force iOS to redraw properly
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    // iOS sometimes needs a small delay to fully render elements
    setVHVariable();
  }, 100);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)

// Register service worker for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(error => {
        console.log('SW registration failed: ', error);
      });
  });
}
