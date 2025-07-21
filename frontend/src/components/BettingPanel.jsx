import React, { useMemo, useCallback } from 'react';
import './BettingPanel.css';

const BASE_CHIP_VALUES = [25, 50, 100, 250, 500];

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

  // Generate dynamic chip values based on player's balance
  const chipValues = useMemo(() => {
    const availableBalance = balance + currentBet; // Total available funds
    const dynamicChips = [...BASE_CHIP_VALUES];
    
    // Add a chip for the player's current balance if it's different from base values
    if (availableBalance > 500 && !BASE_CHIP_VALUES.includes(availableBalance)) {
      // Round down to nearest 25 for cleaner display
      const balanceChip = Math.floor(availableBalance / 25) * 25;
      if (balanceChip > 500 && balanceChip <= availableBalance) {
        dynamicChips.push(balanceChip);
      }
    }
    
    // Sort chips in ascending order
    return dynamicChips.sort((a, b) => a - b);
  }, [balance, currentBet]);

  // Memoize chip buttons to prevent unnecessary re-renders
  const chipButtons = useMemo(() => {
    return chipValues.map((value) => (
      <button
        key={value}
        className={`chip chip-${value >= 1000 ? '1000' : value}`}
        disabled={disabled || currentBet + value > balance + currentBet}
        onClick={() => handleChipClick(value)}
      >
        {value}
      </button>
    ));
  }, [chipValues, disabled, currentBet, balance, handleChipClick]);

  return (
    <div className="betting-panel-component">
      <div className="chips-section">
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
      </div>

      <div className="bet-section">
        <div className="bet-label">BET: {currentBet}</div>
      </div>
      
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