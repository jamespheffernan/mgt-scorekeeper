import { Player } from '../db/API-GameState';
import { JunkFlags } from '../store/gameStore';

interface NarrativeContext {
  player: Player;
  grossScore: number;
  par: number;
  hole: number;
  junkFlags?: JunkFlags;
  yardage?: number;
}

/**
 * Generate a dynamic narrative for a ghost player's revealed score
 */
export function generateGhostNarrative(context: NarrativeContext): string {
  const { player, grossScore, par, hole, junkFlags, yardage } = context;
  
  // Extract the source player name from ghost name (e.g., "Ghost (Bob)" -> "Bob")
  const sourcePlayerName = player.name?.match(/\(([^)]+)\)/)?.[1] || 'Ghost';
  
  // Calculate score relative to par
  const scoreToPar = grossScore - par;
  
  // Base narrative templates based on score
  const getScoreNarrative = () => {
    if (grossScore === 1) {
      return `🎯 HOLE-IN-ONE! ${sourcePlayerName} achieves the ultimate shot on the ${yardage ? `${yardage}-yard` : ''} par ${par}!`;
    }
    
    if (scoreToPar <= -2) {
      return `🦅 Eagle! ${sourcePlayerName} soars ${Math.abs(scoreToPar)} under par with a brilliant ${grossScore}!`;
    }
    
    if (scoreToPar === -1) {
      const birdieNarratives = [
        `🐦 Birdie! ${sourcePlayerName} finds the bottom of the cup for a ${grossScore}!`,
        `🎯 ${sourcePlayerName} drains a clutch putt for birdie!`,
        `⛳ Sweet ${grossScore} from ${sourcePlayerName} - one under par!`
      ];
      return birdieNarratives[Math.floor(Math.random() * birdieNarratives.length)];
    }
    
    if (scoreToPar === 0) {
      const parNarratives = [
        `✅ Solid par from ${sourcePlayerName} with a steady ${grossScore}.`,
        `📏 ${sourcePlayerName} plays it by the book for par.`,
        `⚖️ Right on target - ${sourcePlayerName} cards par ${grossScore}.`
      ];
      return parNarratives[Math.floor(Math.random() * parNarratives.length)];
    }
    
    if (scoreToPar === 1) {
      const bogeyNarratives = [
        `😅 ${sourcePlayerName} battles for a bogey ${grossScore}.`,
        `🤔 Not quite there - ${sourcePlayerName} settles for bogey.`,
        `📊 ${sourcePlayerName} takes the extra stroke for a ${grossScore}.`
      ];
      return bogeyNarratives[Math.floor(Math.random() * bogeyNarratives.length)];
    }
    
    if (scoreToPar === 2) {
      return `😬 Double bogey troubles for ${sourcePlayerName} with a ${grossScore}.`;
    }
    
    // Triple or worse
    return `💥 Tough hole for ${sourcePlayerName} - carding a ${grossScore}.`;
  };
  
  // Add junk event narratives if available
  const getJunkNarrative = () => {
    if (!junkFlags) return '';
    
    const junkStories = [];
    
    if (junkFlags.hadBunkerShot) {
      junkStories.push('💪 Escapes the sand with style');
    }
    
    if (junkFlags.isOnGreenFromTee && par === 3) {
      junkStories.push('🎯 Finds the green from the tee');
    }
    
    if (junkFlags.isClosestOnGreen) {
      junkStories.push('🏆 Sticks it closest to the pin');
    }
    
    if (junkFlags.hadThreePutts) {
      junkStories.push('😅 Three-putt struggles on the green');
    }
    
    if (junkFlags.isLongDrive && hole === 17) {
      junkStories.push('💥 Crushes the long drive on 17');
    }
    
    return junkStories.length > 0 ? ` (${junkStories.join(', ')})` : '';
  };
  
  // Combine score narrative with junk narrative
  const mainStory = getScoreNarrative();
  const junkStory = getJunkNarrative();
  
  return `${mainStory}${junkStory}`;
}

/**
 * Get a brief summary line for the ghost reveal
 */
export function getGhostRevealSummary(grossScore: number, par: number, playerName: string): string {
  const sourceName = playerName?.match(/\(([^)]+)\)/)?.[1] || 'Ghost';
  const scoreToPar = grossScore - par;
  
  if (scoreToPar <= -2) return `${sourceName}: ${grossScore} (Eagle!)`;
  if (scoreToPar === -1) return `${sourceName}: ${grossScore} (Birdie)`;
  if (scoreToPar === 0) return `${sourceName}: ${grossScore} (Par)`;
  if (scoreToPar === 1) return `${sourceName}: ${grossScore} (Bogey)`;
  if (scoreToPar === 2) return `${sourceName}: ${grossScore} (Double)`;
  return `${sourceName}: ${grossScore} (+${scoreToPar})`;
} 