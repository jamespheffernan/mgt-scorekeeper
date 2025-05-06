import { useState } from 'react';
import { 
  evaluateJunkEvents, 
  JunkFlags, 
  JunkEvent,
  JunkType
} from '../calcEngine/junkCalculator';

export function JunkCalculatorTest() {
  // Test inputs
  const [hole, setHole] = useState(3);
  const [playerId, setPlayerId] = useState('player-1');
  const [grossScore, setGrossScore] = useState(3);
  const [par, setPar] = useState(3);
  const [base, setBase] = useState(2);
  
  // Junk flags
  const [hadBunkerShot, setHadBunkerShot] = useState(false);
  const [isOnGreenFromTee, setIsOnGreenFromTee] = useState(false);
  const [isClosestOnGreen, setIsClosestOnGreen] = useState(false);
  const [hadThreePutts, setHadThreePutts] = useState(false);
  const [isLongDrive, setIsLongDrive] = useState(false);
  
  // Results
  const [junkEvents, setJunkEvents] = useState<JunkEvent[]>([]);
  
  // Test cases
  const testCases = [
    { 
      name: 'TC-05: Greenie Detection', 
      hole: 3, 
      playerId: 'player-1',
      grossScore: 3,
      par: 3,
      flags: { 
        hadBunkerShot: false,
        isOnGreenFromTee: true,
        isClosestOnGreen: true,
        hadThreePutts: false,
        isLongDrive: false
      },
      base: 2,
      expected: [{ hole: 3, playerId: 'player-1', type: 'Greenie' as JunkType, value: 2 }]
    },
    { 
      name: 'Birdie Detection', 
      hole: 4, 
      playerId: 'player-1',
      grossScore: 3,
      par: 4,
      flags: { 
        hadBunkerShot: false,
        isOnGreenFromTee: false,
        isClosestOnGreen: false,
        hadThreePutts: false,
        isLongDrive: false
      },
      base: 2,
      expected: [{ hole: 4, playerId: 'player-1', type: 'Birdie' as JunkType, value: 2 }]
    },
    { 
      name: 'Sandie Detection', 
      hole: 5, 
      playerId: 'player-1',
      grossScore: 4,
      par: 4,
      flags: { 
        hadBunkerShot: true,
        isOnGreenFromTee: false,
        isClosestOnGreen: false,
        hadThreePutts: false,
        isLongDrive: false
      },
      base: 2,
      expected: [{ hole: 5, playerId: 'player-1', type: 'Sandie' as JunkType, value: 2 }]
    },
    { 
      name: 'Penalty Detection', 
      hole: 6, 
      playerId: 'player-1',
      grossScore: 5,
      par: 3,
      flags: { 
        hadBunkerShot: false,
        isOnGreenFromTee: true,
        isClosestOnGreen: false,
        hadThreePutts: true,
        isLongDrive: false
      },
      base: 2,
      expected: [{ hole: 6, playerId: 'player-1', type: 'Penalty' as JunkType, value: 2 }]
    },
    { 
      name: 'LD10 Detection', 
      hole: 17, 
      playerId: 'player-1',
      grossScore: 4,
      par: 4,
      flags: { 
        hadBunkerShot: false,
        isOnGreenFromTee: false,
        isClosestOnGreen: false,
        hadThreePutts: false,
        isLongDrive: true
      },
      base: 2,
      expected: [{ hole: 17, playerId: 'player-1', type: 'LD10' as JunkType, value: 10 }]
    },
    { 
      name: 'Multiple Events (Birdie + Sandie)', 
      hole: 4, 
      playerId: 'player-1',
      grossScore: 3,
      par: 4,
      flags: { 
        hadBunkerShot: true,
        isOnGreenFromTee: false,
        isClosestOnGreen: false,
        hadThreePutts: false,
        isLongDrive: false
      },
      base: 2,
      expected: [
        { hole: 4, playerId: 'player-1', type: 'Birdie' as JunkType, value: 2 },
        { hole: 4, playerId: 'player-1', type: 'Sandie' as JunkType, value: 2 }
      ]
    }
  ];
  
  // Evaluate junk events
  const evaluate = () => {
    const flags: JunkFlags = {
      hadBunkerShot,
      isOnGreenFromTee,
      isClosestOnGreen,
      hadThreePutts,
      isLongDrive
    };
    
    const events = evaluateJunkEvents(hole, playerId, grossScore, par, flags, base);
    setJunkEvents(events);
  };
  
  // Run a specific test case
  const runTestCase = (testCase: any) => {
    setHole(testCase.hole);
    setPlayerId(testCase.playerId);
    setGrossScore(testCase.grossScore);
    setPar(testCase.par);
    setHadBunkerShot(testCase.flags.hadBunkerShot);
    setIsOnGreenFromTee(testCase.flags.isOnGreenFromTee);
    setIsClosestOnGreen(testCase.flags.isClosestOnGreen);
    setHadThreePutts(testCase.flags.hadThreePutts);
    setIsLongDrive(testCase.flags.isLongDrive);
    setBase(testCase.base);
    
    // Set timeout to allow state to update before evaluating
    setTimeout(() => {
      evaluate();
    }, 50);
  };
  
  // Check if test passes
  const checkTestResult = (expected: JunkEvent[]) => {
    if (junkEvents.length !== expected.length) return false;
    
    return expected.every(expectedEvent => {
      return junkEvents.some(actualEvent => 
        actualEvent.hole === expectedEvent.hole &&
        actualEvent.playerId === expectedEvent.playerId &&
        actualEvent.type === expectedEvent.type &&
        actualEvent.value === expectedEvent.value
      );
    });
  };
  
  return (
    <div className="test-container">
      <h2>Junk Calculator Test</h2>
      
      <div className="test-controls">
        <div>
          <label>Hole (1-18):</label>
          <input 
            type="number" 
            value={hole} 
            onChange={(e) => setHole(Number(e.target.value))} 
            min={1} max={18}
          />
        </div>
        
        <div>
          <label>Gross Score:</label>
          <input 
            type="number" 
            value={grossScore} 
            onChange={(e) => setGrossScore(Number(e.target.value))} 
            min={1} 
          />
        </div>
        
        <div>
          <label>Par:</label>
          <input 
            type="number" 
            value={par} 
            onChange={(e) => setPar(Number(e.target.value))} 
            min={3} max={5}
          />
        </div>
        
        <div>
          <label>Base Amount ($):</label>
          <input 
            type="number" 
            value={base} 
            onChange={(e) => setBase(Number(e.target.value))} 
            min={1} 
          />
        </div>
      </div>
      
      <div className="junk-flags">
        <h3>Junk Flags</h3>
        <div>
          <label>
            <input 
              type="checkbox" 
              checked={hadBunkerShot} 
              onChange={(e) => setHadBunkerShot(e.target.checked)} 
            />
            Had Bunker Shot (Sandie)
          </label>
        </div>
        
        <div>
          <label>
            <input 
              type="checkbox" 
              checked={isOnGreenFromTee} 
              onChange={(e) => setIsOnGreenFromTee(e.target.checked)} 
            />
            On Green from Tee (Greenie/Penalty)
          </label>
        </div>
        
        <div>
          <label>
            <input 
              type="checkbox" 
              checked={isClosestOnGreen} 
              onChange={(e) => setIsClosestOnGreen(e.target.checked)} 
            />
            Closest to Pin (Greenie)
          </label>
        </div>
        
        <div>
          <label>
            <input 
              type="checkbox" 
              checked={hadThreePutts} 
              onChange={(e) => setHadThreePutts(e.target.checked)} 
            />
            Had Three Putts (Penalty)
          </label>
        </div>
        
        <div>
          <label>
            <input 
              type="checkbox" 
              checked={isLongDrive} 
              onChange={(e) => setIsLongDrive(e.target.checked)} 
            />
            Long Drive (LD10)
          </label>
        </div>
        
        <button onClick={evaluate}>Evaluate Junk</button>
      </div>
      
      <div className="results">
        <h3>Results</h3>
        {junkEvents.length === 0 ? (
          <p>No junk events detected.</p>
        ) : (
          <ul>
            {junkEvents.map((event, idx) => (
              <li key={idx}>
                <strong>{event.type}</strong>: Hole {event.hole}, ${event.value}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="test-cases">
        <h3>Test Cases</h3>
        {testCases.map((test, idx) => (
          <div key={idx} className="test-case">
            <button onClick={() => runTestCase(test)}>{test.name}</button>
            <div className="expected">
              Expected: {test.expected.length} junk event(s)
            </div>
            <div className={checkTestResult(test.expected) ? 'passing' : 'failing'}>
              {checkTestResult(test.expected) ? '✅ PASS' : '❌ FAIL'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 