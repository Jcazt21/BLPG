import React, { useMemo, useCallback, useState, useEffect } from 'react';
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
  noChipsMessage = '',
  bettingTimeLeft = 0,
  minBet = 25,
  maxBet = null,
  isConnected = true,
  betConfirmed = false,
  onRetryBet = null,
  lastBetError = null
}) {
  const [betAnimation, setBetAnimation] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const canBet = useMemo(() => 
    balance > 0 && !disabled && !betConfirmed && isConnected && bettingTimeLeft > 0, 
    [balance, disabled, betConfirmed, isConnected, bettingTimeLeft]
  );

  const effectiveMaxBet = useMemo(() => 
    maxBet !== null ? Math.min(maxBet, balance + currentBet) : balance + currentBet,
    [maxBet, balance, currentBet]
  );

  // Animate bet changes
  useEffect(() => {
    if (currentBet > 0) {
      setBetAnimation('bet-updated');
      const timer = setTimeout(() => setBetAnimation(''), 300);
      return () => clearTimeout(timer);
    }
  }, [currentBet]);

  // Handle bet confirmation animation
  useEffect(() => {
    if (betConfirmed) {
      setBetAnimation('bet-confirmed');
      const timer = setTimeout(() => setBetAnimation(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [betConfirmed]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleChipClick = useCallback((value) => {
    if (!canBet) return;
    
    const newBetAmount = currentBet + value;
    if (newBetAmount > effectiveMaxBet) return;
    if (newBetAmount < minBet && newBetAmount !== value) return;
    
    onChipClick(value);
  }, [onChipClick, canBet, currentBet, effectiveMaxBet, minBet]);

  const handleAllIn = useCallback(() => {
    if (!canBet || balance === 0) return;
    onAllIn();
  }, [onAllIn, canBet, balance]);

  const handleClearBet = useCallback(() => {
    if (disabled || currentBet === 0) return;
    onClearBet();
  }, [onClearBet, disabled, currentBet]);

  const handlePlaceBet = useCallback(() => {
    if (!canBet || currentBet === 0 || currentBet > balance) return;
    onPlaceBet();
  }, [onPlaceBet, canBet, currentBet, balance]);

  const handleRetry = useCallback(async () => {
    if (!onRetryBet || isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await onRetryBet();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  }, [onRetryBet, isRetrying]);

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
    
    // Sort chips in ascending order and filter out chips that would exceed max bet
    return dynamicChips
      .sort((a, b) => a - b)
      .filter(value => currentBet + value <= effectiveMaxBet);
  }, [balance, currentBet, effectiveMaxBet]);

  // Memoize chip buttons to prevent unnecessary re-renders
  const chipButtons = useMemo(() => {
    return chipValues.map((value) => {
      const wouldExceedBalance = currentBet + value > balance + currentBet;
      const wouldExceedMax = currentBet + value > effectiveMaxBet;
      const belowMinimum = currentBet + value < minBet && currentBet + value !== value;
      const isDisabled = !canBet || wouldExceedBalance || wouldExceedMax || belowMinimum;
      
      return (
        <button
          key={value}
          className={`chip chip-${value >= 1000 ? '1000' : value} ${isDisabled ? 'chip-disabled' : ''}`}
          disabled={isDisabled}
          onClick={() => handleChipClick(value)}
          title={
            wouldExceedBalance ? 'Insufficient balance' :
            wouldExceedMax ? 'Exceeds maximum bet' :
            belowMinimum ? 'Below minimum bet' :
            !isConnected ? 'Connection lost' :
            bettingTimeLeft <= 0 ? 'Betting time expired' :
            betConfirmed ? 'Bet already confirmed' :
            ''
          }
        >
          {value}
        </button>
      );
    });
  }, [chipValues, canBet, currentBet, balance, effectiveMaxBet, minBet, isConnected, bettingTimeLeft, betConfirmed, handleChipClick]);

  return (
    <div className={`betting-panel-component ${!isConnected ? 'disconnected' : ''} ${betConfirmed ? 'bet-confirmed' : ''}`}>
      <div className="chips-section">
        <div className="chips-label">
          BALANCE: {balance}
          {!isConnected && <span className="connection-status"> (OFFLINE)</span>}
        </div>
        <div className="chip-buttons">
          {chipButtons}
          <button 
            className={`chip all-in ${!canBet || balance === 0 ? 'chip-disabled' : ''}`}
            disabled={!canBet || balance === 0} 
            onClick={handleAllIn}
            title={
              balance === 0 ? 'No balance available' :
              !isConnected ? 'Connection lost' :
              bettingTimeLeft <= 0 ? 'Betting time expired' :
              betConfirmed ? 'Bet already confirmed' :
              ''
            }
          >
            ALL IN
          </button>
        </div>
      </div>

      <div className="bet-section">
        <div className={`bet-label ${betAnimation}`}>
          BET: {currentBet}
          {betConfirmed && <span className="confirmed-indicator"> ✓</span>}
        </div>
        {bettingTimeLeft > 0 && (
          <div className="betting-timer">
            Time: {Math.ceil(bettingTimeLeft / 1000)}s
          </div>
        )}
      </div>
      
      <div className="betting-controls">
        <button
          className="clear-bet-btn"
          onClick={handleClearBet}
          disabled={disabled || currentBet === 0 || betConfirmed}
        >
          Clear Bet
        </button>
        
        {showPlaceBetButton && (
          <button
            className={`place-bet-btn ${betConfirmed ? 'confirmed' : ''}`}
            onClick={handlePlaceBet}
            disabled={!canBet || currentBet === 0 || currentBet > balance}
          >
            {betConfirmed ? 'Bet Placed' : 'Place Bet'}
          </button>
        )}
        
        {lastBetError && onRetryBet && (
          <button
            className="retry-bet-btn"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying...' : `Retry (${retryCount})`}
          </button>
        )}
      </div>

      {lastBetError && (
        <div className="error-msg">
          {lastBetError}
        </div>
      )}

      {noChipsMessage && (
        <div className="no-chips-msg">{noChipsMessage}</div>
      )}
      
      {currentBet < minBet && currentBet > 0 && (
        <div className="warning-msg">
          Minimum bet is {minBet} chips
        </div>
      )}
    </div>
  );
});

export default BettingPanel;