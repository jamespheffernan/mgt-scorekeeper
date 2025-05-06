import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import '../App.css';

interface EndGameDialogProps {
  onClose: () => void;
}

const EndGameDialog: React.FC<EndGameDialogProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const finishRound = useGameStore(state => state.finishRound);
  const resetGame = useGameStore(state => state.resetGame);
  
  // Handle game ending
  const handleEndGame = async () => {
    try {
      // Call the store action to finish the round
      await finishRound();
      
      // Reset game state
      resetGame();
      
      // Close the dialog
      onClose();
      
      // Navigate to the ledger/settlement view before returning to main menu
      navigate('/settlement');
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-content end-game-dialog">
        <h3>End Game</h3>
        
        <p>
          Are you sure you want to end this game? This will:
        </p>
        
        <ul>
          <li>Complete the current game</li>
          <li>Save a record in game history</li>
          <li>Show the final settlement</li>
        </ul>
        
        <div className="dialog-actions">
          <button
            className="cancel-button"
            onClick={onClose}
          >
            Keep Playing
          </button>
          
          <button
            className="confirm-button"
            onClick={handleEndGame}
          >
            End Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndGameDialog; 