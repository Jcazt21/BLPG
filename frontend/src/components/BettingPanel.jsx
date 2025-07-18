import React, { useMemo, useCallback } from 'react';
import './BettingPanel.css';

const CHIP_VALUES = [25, 50, 100, 250, 500, 1000];

const BettingPanel = React.memo(function BettingPanel({ 
  balance, 
  currentBet, 
  onChipClick, 
  onAllIn, 
  onClearBet, 
  onPlaceBet, 
  disabled = false,
  showPlaceBetButton = false,
  noChipsMessage = ''
}) {
  const canBet = useMemo(() => balance > 0 && !disabled, [balance, disabled]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleChipClick = useCallback((value) => {
    onChipClick(value);
  }, [onChipClick]);

  const handleAllIn = useCallback(() => {
    onAllIn();
  }, [onAllIn]);

  const handleClearBet = useCallback(() => {
    onClearBet();
  }, [onClearBet]);

  const handlePlaceBet = useCallback(() => {
    onPlaceBet();
  }, [onPlaceBet]);

  // Memoize chip buttons to prevent unnecessary re-renders
  const chipButtons = useMemo(() => {
    return CHIP_VALUES.map((value) => (
      <button
        key={value}
        className={`chip chip-${value}`}
        disabled={disabled || currentBet + value > balance}
        onClick={() => handleChipClick(value)}
      >
        {value}
      </button>
    ));
  }, [disabled, currentBet, balance, handleChipClick]);

  return (
    <div className="betting-panel-component">
      <div className="chips-label">CHIPS: {balance}</div>
      
      <div className="chip-buttons">
        {chipButtons}
        
        <button 
          className="chip all-in" 
          disabled={disabled || balance === 0} 
          onClick={handleAllIn}
        >
          ALL IN
        </button>
      </div>

      <div className="bet-label">BET: {currentBet}</div>
      
      <div className="betting-controls">
        <button
          className="clear-bet-btn"
          onClick={handleClearBet}
          disabled={disabled || currentBet === 0}
        >
          Clear Bet
        </button>
        
        {showPlaceBetButton && (
          <button
            className="place-bet-btn"
            onClick={handlePlaceBet}
            disabled={disabled || currentBet === 0 || currentBet > balance || !canBet}
          >
            Place Bet
          </button>
        )}
      </div>

      {noChipsMessage && (
        <div className="no-chips-msg">{noChipsMessage}</div>
      )}
    </div>
  );
});

export default BettingPanel;