import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../../store/gameStore';
import { PlayersFourBox } from './PlayersFourBox';
import { JunkFlags } from '../../../store/gameStore';
import { allocateStrokes, allocateStrokesMultiTee } from '../../../calcEngine/strokeAllocator';
import { Course, TeeOption } from '../../../db/courseModel';
import { millbrookDb } from '../../../db/millbrookDb';
import CancelGameDialog from '../../CancelGameDialog';
import EndGameDialog from '../../EndGameDialog';
import TopBar from '../../TopBar';
import { PageHeader } from '../../PageHeader';
import { SectionCard } from '../../SectionCard';
import { PotRow } from '../../PotRow';
import { BottomNav } from '../../BottomNav';
import { NavTabs } from '../../NavTabs';

export const HoleViewMobile: React.FC = () => {
  const navigate = useNavigate();
  
  // Access store state and actions
  const match = useGameStore(state => state.match);
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const isDoubleAvailable = useGameStore(state => state.isDoubleAvailable);
  const trailingTeam = useGameStore(state => state.trailingTeam);
  const enterHoleScores = useGameStore(state => state.enterHoleScores);
  const callDouble = useGameStore(state => state.callDouble);
  const cancelMatch = useGameStore(state => state.cancelMatch);
  const ledger = useGameStore(state => state.ledger);
  
  // Current hole
  const currentHole = match.currentHole;
  const defaultPar = match.holePar[currentHole - 1];
  
  // State for course data
  const [course, setCourse] = useState<Course | null>(null);
  const [teeOptions, setTeeOptions] = useState<Record<string, TeeOption>>({});
  const [playerPars, setPlayerPars] = useState<number[]>([defaultPar, defaultPar, defaultPar, defaultPar]);
  const [playerSIs, setPlayerSIs] = useState<number[]>([currentHole, currentHole, currentHole, currentHole]);
  const [playerYardages, setPlayerYardages] = useState<number[]>([0, 0, 0, 0]);
  const [playerStrokes, setPlayerStrokes] = useState<number[]>([0, 0, 0, 0]);
  
  // Local state for scores and junk
  const [grossScores, setGrossScores] = useState<[number, number, number, number]>([
    defaultPar, defaultPar, defaultPar, defaultPar
  ]);
  
  const [junkFlags, setJunkFlags] = useState<JunkFlags[]>([
    { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
    { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
    { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
    { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false }
  ]);
  
  // Error handling and submission state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showEndGameDialog, setShowEndGameDialog] = useState(false);

  // Define navigation items for NavTabs
  const navItems = [
    { id: 'viewLedger', label: 'View Ledger', href: '/ledger' },
    { id: 'cancelGame', label: 'Cancel Game', href: '#' } // href: '#' or handle click separately
  ];

  // Handle navigation for NavTabs, specifically for cancel game
  const handleNavTabClick = (itemId: string) => {
    if (itemId === 'cancelGame') {
      setShowCancelDialog(true);
    } else {
      const item = navItems.find(nav => nav.id === itemId);
      if(item && item.href !== '#') navigate(item.href);
    }
  };
  
  // Get the current standings
  const getCurrentStandings = () => {
    if (ledger.length === 0) return { redTotal: 0, blueTotal: 0 };
    
    const lastLedgerEntry = ledger[ledger.length - 1];
    const firstRedIndex = playerTeams.findIndex(team => team === 'Red');
    const firstBlueIndex = playerTeams.findIndex(team => team === 'Blue');
    const redTotal = lastLedgerEntry.runningTotals[firstRedIndex] ?? 0;
    const blueTotal = lastLedgerEntry.runningTotals[firstBlueIndex] ?? 0;
    return {
      redTotal,
      blueTotal,
    };
  };
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    const formattedAmount = Math.abs(amount).toString();
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${formattedAmount}`;
  };
  
  // Load course data when match details change
  useEffect(() => {
    const loadCourseData = async () => {
      if (!match.courseId || !match.playerTeeIds) {
        return;
      }
      
      try {
        const courseData = await millbrookDb.getCourse(match.courseId);
        
        if (courseData) {
          setCourse(courseData);
          console.log(`[COURSE-DEBUG] Loaded course: ${courseData.name}`);
          
          // Create a map of tee options by ID for easy access
          const teeMap: Record<string, TeeOption> = {};
          courseData.teeOptions.forEach(tee => {
            teeMap[tee.id] = tee;
            console.log(`[COURSE-DEBUG] Tee option: ${tee.name} (${tee.color}), id: ${tee.id}`);
          });
          setTeeOptions(teeMap);
          
          // Get player-specific pars, stroke indexes, and yardages
          if (match.playerTeeIds) {
            const newPlayerPars: number[] = [];
            const newPlayerSIs: number[] = [];
            const newPlayerYardages: number[] = [];
            
            match.playerTeeIds.forEach((teeId, index) => {
              const tee = teeMap[teeId];
              if (tee && tee.holes) {
                const holeInfo = tee.holes.find(h => h.number === currentHole);
                if (holeInfo) {
                  newPlayerPars[index] = holeInfo.par;
                  newPlayerSIs[index] = holeInfo.strokeIndex;
                  newPlayerYardages[index] = holeInfo.yardage;
                } else {
                  newPlayerPars[index] = defaultPar;
                  newPlayerSIs[index] = currentHole;
                  newPlayerYardages[index] = 0;
                }
              } else {
                newPlayerPars[index] = defaultPar;
                newPlayerSIs[index] = currentHole;
                newPlayerYardages[index] = 0;
              }
            });
            
            setPlayerPars(newPlayerPars);
            setPlayerSIs(newPlayerSIs);
            setPlayerYardages(newPlayerYardages);
            
            // Update the default gross scores based on pars
            setGrossScores(newPlayerPars as [number, number, number, number]);
            
            // Calculate player strokes
            calculatePlayerStrokes(courseData, teeMap);
          }
        }
      } catch (error) {
        console.error('Error loading course data:', error);
      }
    };
    
    loadCourseData();
  }, [match.courseId, match.playerTeeIds, currentHole, defaultPar]);
  
  // Calculate strokes for each player
  const calculatePlayerStrokes = (courseData: Course, teeMap: Record<string, TeeOption>) => {
    const playerIndexes = players.map(p => p.index);
    let strokes: number[] = [0, 0, 0, 0];
    
    try {
      if (match.courseId && match.playerTeeIds && players.length === 4) { // Ensure players array is populated
        const playerSpecificSIs: number[][] = players.map((_, pIdx) => {
          const pteeId = match.playerTeeIds![pIdx]; // Added non-null assertion as we check playerTeeIds above
          const ptee = courseData.teeOptions.find(t => t.id === pteeId);
          if (ptee && ptee.holes) {
            return Array.from({ length: 18 }, (__, i) => {
              const holeInfo = ptee.holes.find(h => h.number === i + 1);
              return holeInfo ? holeInfo.strokeIndex : i + 1;
            });
          }
          return Array.from({ length: 18 }, (__, i) => i + 1); // Fallback
        });
        
        const strokeMatrix = allocateStrokesMultiTee(playerIndexes, playerSpecificSIs);
        strokes = strokeMatrix.map(playerStrokesArray => playerStrokesArray[currentHole - 1]);
      } else if (players.length === 4) { // Fallback if no course/tee specifics but players exist
        const strokeMatrix = allocateStrokes(playerIndexes, match.holeSI);
        strokes = strokeMatrix.map(playerStrokesArray => playerStrokesArray[currentHole - 1]);
      }
    } catch (error) {
      console.error('Error calculating strokes:', error);
    }
    
    setPlayerStrokes(strokes);
  };
  
  // Handle score update from PlayersFourBox
  const updateScore = (playerIndex: number, score: number) => {
    const newScores = [...grossScores] as [number, number, number, number];
    newScores[playerIndex] = score;
    setGrossScores(newScores);
  };
  
  // Handle junk update from PlayersFourBox
  const updateJunk = (playerIndex: number, updatedJunk: JunkFlags) => {
    const newJunk = [...junkFlags];
    newJunk[playerIndex] = updatedJunk;
    setJunkFlags(newJunk);
  };
  
  // Handle double call
  const handleCallDouble = () => {
    callDouble();
  };
  
  // Handle score submission
  const submitScores = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await enterHoleScores(currentHole, grossScores, junkFlags);
      if (currentHole === 18) {
        setShowEndGameDialog(true);
      } else {
        navigate(`/hole/${currentHole + 1}`);
      }
    } catch (error) {
      console.error('Error submitting scores:', error);
      setErrorMessage('Failed to submit scores. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Cancel the game (used by NavTabs if that path is taken)
  const cancelGame = async () => {
    try {
      await cancelMatch();
      navigate('/'); // Navigate to home/main menu after cancellation
    } catch (error) {
      console.error('Error canceling game:', error);
      setErrorMessage('Failed to cancel game. Please try again.');
    }
  };
  
  // End the game after hole 18 (primarily for EndGameDialog to call if needed, though it handles its own)
  // This function might become redundant if EndGameDialog always handles its own logic.
  const endGame = async () => {
    try {
      await useGameStore.getState().finishRound();
      navigate('/settlement');
    } catch (error) {
      console.error('Error ending game:', error);
      setErrorMessage('Failed to end game. Please try again.');
    }
  };
  
  // Render method
  return (
    <div className="hole-view mobile-hole-view pb-20">
      <TopBar title="The Millbrook Game" />
      
      <div className="hole-content px-4 pt-16">
        <PageHeader 
          title="" 
          subtitle={`Hole ${currentHole}`} 
        />

        <NavTabs 
          items={navItems} 
          current={ '' }
        />

        <SectionCard>
          <div className="mobile-hole-info">
            <div className="flex justify-between text-sm">
              <span>Championship</span>
              <span>Par {defaultPar}</span>
              <span>{playerYardages[0] || 0} yds</span>
              <span>SI: {playerSIs[0] || currentHole}</span>
            </div>
          </div>
        </SectionCard>
        
        <SectionCard>
          <PotRow 
            red={formatCurrency(getCurrentStandings().redTotal)}
            holeValue={`Hole Value $${match.base}`}
            blue={formatCurrency(getCurrentStandings().blueTotal)}
            carryingAmount={match.carry}
          />
        </SectionCard>
        
        <SectionCard className="mb-4">
          <h3 className="text-lg font-semibold mb-3">Enter Scores</h3>
          <PlayersFourBox
            onScoreChange={updateScore}
            onJunkChange={updateJunk}
            playerPars={playerPars}
            playerYardages={playerYardages}
            playerStrokeIndexes={playerSIs}
            playerStrokes={playerStrokes}
          />
        </SectionCard>
        
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
        
        <BottomNav>
          {trailingTeam && isDoubleAvailable && (
            <button
              onClick={handleCallDouble}
              className={`btn ${trailingTeam === 'Red' ? 'btn-red' : 'btn-blue'} mr-2`}
              disabled={isSubmitting}
            >
              CALL DOUBLE
            </button>
          )}
          {!isDoubleAvailable && match.doubles > 0 && (
            <div className="double-used-indicator px-3 py-2 text-sm bg-grey30 text-grey60 rounded">
              Double already used
            </div>
          )}
          <button
            onClick={submitScores}
            className="btn btn-primary flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'SUBMITTING...' : 'SUBMIT SCORES'}
          </button>
        </BottomNav>
      </div>
      
      {showCancelDialog && (
        <CancelGameDialog
          onClose={() => setShowCancelDialog(false)}
        />
      )}
      
      {showEndGameDialog && (
        <EndGameDialog
          onClose={() => setShowEndGameDialog(false)}
        />
      )}
    </div>
  );
}; 