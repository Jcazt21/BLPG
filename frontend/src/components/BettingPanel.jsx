import React, { useMemo, useCallback, useState, useEffect } from 'react';
import './BettingPanel.css';

const BASE_CHIP_VALUES = [25, 50, 100, 250, 500];

const BettingPanel = React.memo(function BettingPanel({ 
  balance, 
  currentBet, 
  onChipClick, 
  onClearBet, 
  onPlaceBet, 
  disabled = false,
  showPlaceBetButton = false,
  noChipsMessage = '',
  bettingTimeLeft = 0,
  autoBetCountdown = 0,
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

  const handleClearBet = useCallback(() => {
    if (disabled || currentBet === 0) return;
    onClearBet();
  }, [onClearBet, disabled, currentBet]);

  const handlePlaceBet = useCallback(() => {
    if (!canBet || currentBet > balance) return;
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

  // Generate chip values - fixed set without dynamic balance chips
  const chipValues = useMemo(() => {
    // Use only the base chip values, no dynamic balance chips
    return BASE_CHIP_VALUES
      .filter(value => currentBet + value <= effectiveMaxBet);
  }, [currentBet, effectiveMaxBet]);

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
        </div>
      </div>

      <div className="bet-section">
        <div className={`bet-label ${betAnimation}`}>
          BET: {currentBet}
          {betConfirmed && <span className="confirmed-indicator"> ✓</span>}
        </div>
        {autoBetCountdown > 0 && !betConfirmed && (
          <div className={`auto-bet-timer ${autoBetCountdown <= 3 ? 'urgent' : ''}`} style={{
            color: autoBetCountdown <= 3 ? '#ff4444' : '#ffa500',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            textAlign: 'center',
            padding: '0.25rem',
            backgroundColor: autoBetCountdown <= 3 ? 'rgba(255, 68, 68, 0.1)' : 'rgba(255, 165, 0, 0.1)',
            borderRadius: '4px',
            marginTop: '0.25rem'
          }}>
            Auto-bet: {Math.ceil(autoBetCountdown)}s
          </div>
        )}
        {bettingTimeLeft > 0 && autoBetCountdown === 0 && !betConfirmed && (
          <div className="betting-timer">
            Betting Phase Active
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
            disabled={!canBet || currentBet > balance}
          >
            {betConfirmed ? 'Bet Placed' : 
             currentBet === 0 ? 'Place Bet (25)' : 
             `Place Bet (${currentBet})`}
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