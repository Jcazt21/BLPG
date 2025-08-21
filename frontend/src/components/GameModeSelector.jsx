import React from 'react';
import './GameModeSelector.css';

const GameModeCard = ({ title, description, icon, onClick, disabled = false }) => {
  return (
    <div 
      className={`game-mode-card ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="game-icon">{icon}</div>
      <h3 className="game-title">{title}</h3>
      <p className="game-description">{description}</p>
      {disabled && <div className="coming-soon">Coming Soon</div>}
    </div>
  );
};

const GameModeSelector = ({ onModeSelect }) => {
  return (
    <div className="game-mode-selector">
      <div className="selector-header">
        <h1>Choose Your Game</h1>
        <p>Select a card game to play with friends</p>
      </div>
      
      <div className="game-modes-grid">
        <GameModeCard
          title="Blackjack"
          description="Classic 21 card game. Beat the dealer without going over!"
          icon="🂡"
          onClick={() => onModeSelect('blackjack')}
        />
        
        <GameModeCard
          title="Crazy 8"
          description="Match suits and numbers. Use 8s as wild cards!"
          icon="🃘"
          onClick={() => onModeSelect('crazy8')}
        />
        
        {/* Future games can be added here */}
        <GameModeCard
          title="UNO"
          description="The classic color-matching card game"
          icon="🎯"
          disabled={true}
        />
        
        <GameModeCard
          title="Hearts"
          description="Avoid hearts and the Queen of Spades"
          icon="♥️"
          disabled={true}
        />
      </div>
    </div>
  );
};

export default GameModeSelector;