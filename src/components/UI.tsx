import { useGameStore } from '../store';
import './UI.css';

export function UI() {
  const { currentTurn, diceValue, myColor, canRoll, winner } = useGameStore();
  
  const isMyTurn = currentTurn === myColor;
  
  return (
    <div className="game-ui">
      <div className="ui-panel">
        <div className="player-indicator" style={{ 
          backgroundColor: myColor === 'red' ? '#FF4747' : '#47FF47'
        }}>
          You: {myColor?.toUpperCase()}
        </div>
        
        <div className="turn-indicator">
          {winner ? (
            <div className="winner-text">
              {winner === myColor ? '🏆 You Win!' : 'Opponent Wins!'}
            </div>
          ) : (
            <div className={`turn-text ${isMyTurn ? 'active' : ''}`}>
              {isMyTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}
            </div>
          )}
        </div>
        
        <div className="dice-display">
          <div className="dice-label">Dice:</div>
          <div className="dice-value">{diceValue || '-'}</div>
        </div>
        
        {isMyTurn && canRoll && (
          <div className="instruction">
            Click the dice to roll!
          </div>
        )}
      </div>
    </div>
  );
}