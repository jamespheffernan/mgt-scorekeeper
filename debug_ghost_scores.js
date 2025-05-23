// Debug script to investigate ghost scoring issue
console.log('=== Ghost Scoring Issue Investigation ===');

// ISSUE: Ghost player shows 71 total after shooting 41-43 on front 9
// This means back 9 would be 28-30, which is impossible
// Expected: 9 handicap shooting 41-43 front should have similar back 9 (total ~84-86)

console.log('\nTo debug this issue, run these commands in browser console:');
console.log('\n1. First, check current game state:');
console.log('   const state = window.useGameStore?.getState?.() || useGameStore.getState();');
console.log('   console.log("Players:", state.players.map(p => ({ name: p.name, index: p.index, isGhost: p.isGhost })));');

console.log('\n2. Check hole scores array:');
console.log('   console.log("HoleScores length:", state.holeScores.length);');
console.log('   console.log("Current hole:", state.match.currentHole);');

console.log('\n3. Check ghost player total and individual hole scores:');
console.log('   const ghostPlayerIndex = state.players.findIndex(p => p.isGhost);');
console.log('   if (ghostPlayerIndex >= 0) {');
console.log('     console.log("Ghost player index:", ghostPlayerIndex);');
console.log('     let total = 0;');
console.log('     let front9 = 0, back9 = 0;');
console.log('     state.holeScores.forEach((hole, idx) => {');
console.log('       const score = hole.gross[ghostPlayerIndex];');
console.log('       total += score;');
console.log('       if (idx < 9) front9 += score;');
console.log('       else back9 += score;');
console.log('       console.log(`Hole ${hole.hole}: ${score} (running total: ${total})`);');
console.log('     });');
console.log('     console.log(`\\nFRONT 9: ${front9}`);');
console.log('     console.log(`BACK 9: ${back9}`);');
console.log('     console.log(`TOTAL: ${total}`);');
console.log('   }');

console.log('\n4. If total is indeed 71 but front 9 was 41-43, check for:');
console.log('   - Score generation consistency (same seed used?)');
console.log('   - Score replacement vs append in enterHoleScores');
console.log('   - Ghost score preservation during score entry');

console.log('\n5. To see original generated scores (if still available):');
console.log('   const ghostScoreMap = state.ghostScoreMap; // May not be persisted');
console.log('   if (ghostScoreMap) console.log("Original ghost scores:", ghostScoreMap);');

console.log('\nExpected outcome for 9 handicap:');
console.log('- Total score should be ~72 + 9 = 81 ± 5 strokes');
console.log('- Front/back 9 should be reasonably similar');
console.log('- Back 9 of 28-30 is physically impossible and indicates a bug'); 