import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import '../App.css';

interface CancelGameDialogProps {
  onClose: () => void;
}

const CancelGameDialog: React.FC<CancelGameDialogProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const cancelMatch = useGameStore(state => state.cancelMatch);
  const resetGame = useGameStore(state => state.resetGame);
  
  // Handle game cancellation
  const handleCancelGame = async () => {
    try {
      // Call the store action to cancel the match
      await cancelMatch();
      
      // Reset game state
      resetGame();
      
      // Close the dialog
      onClose();
      
      // Navigate back to the main menu
      navigate('/');
    } catch (error) {
      console.error('Error cancelling game:', error);
    }
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-content cancel-game-dialog">
        <h3>Cancel Game</h3>
        
        <p>
          Are you sure you want to cancel this game? This will:
        </p>
        
        <ul>
          <li>End the current game</li>
          <li>Save a record of the cancelled game</li>
          <li>Return to the main menu</li>
        </ul>
        
        <p className="warning">
          This action cannot be undone.
        </p>
        
        <div className="dialog-actions">
          <button
            className="cancel-button"
            onClick={onClose}
          >
            Keep Playing
          </button>
          
          <button
            className="confirm-button"
            onClick={handleCancelGame}
          >
            Cancel Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelGameDialog; 