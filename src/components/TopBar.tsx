import React from 'react';

export default function TopBar() {
  return (
    <div style={styles.container}>
      <span style={styles.title}>The Millbrook Game</span>
    </div>
  );
}

const styles = {
  container: {
    height: 56,
    backgroundColor: '#1a5e46',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontFamily: 'Pacifico, "Brush Script MT", cursive, sans-serif',
    letterSpacing: 3,
    fontWeight: 400,
    textShadow: '1px 2px 6px rgba(0,0,0,0.18)',
    padding: '0 16px',
    whiteSpace: 'nowrap',
  },
}; 