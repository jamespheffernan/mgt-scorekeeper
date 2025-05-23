// Simple script to debug ghost scoring issue
console.log('=== Ghost Score Debug Tool ===');

// This would need to be run in the browser console where the game state is available
// For now, let's provide the user with instructions on how to check

console.log('To debug the ghost scoring issue:');
console.log('1. Open browser developer tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Run this command:');
console.log('');
console.log('const state = useGameStore.getState();');
console.log('console.log("Players:", state.players.map(p => ({ name: p.name, isGhost: p.isGhost, index: p.index })));');
console.log('console.log("Current hole:", state.match.currentHole);');
console.log('if (state.holeScores.length > 0) {');
console.log('  console.log("Ghost scores by hole:");');
console.log('  state.holeScores.forEach((hole, idx) => {');
console.log('    console.log(`Hole ${hole.hole}:`, hole.gross);');
console.log('  });');
console.log('  console.log("Total scores by player:");');
console.log('  state.players.forEach((player, idx) => {');
console.log('    const total = state.holeScores.reduce((sum, hole) => sum + hole.gross[idx], 0);');
console.log('    console.log(`${player.name}: ${total} (${player.isGhost ? "Ghost" : "Real"})`);');
console.log('  });');
console.log('}');
console.log('');
console.log('This will show you exactly what scores are stored for each player and help identify the issue.'); 