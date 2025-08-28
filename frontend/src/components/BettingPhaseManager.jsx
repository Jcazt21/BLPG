import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './BettingPhaseManager.css';

const BettingPhaseManager = React.memo(function BettingPhaseManager({
  gameState,
  socket,
  roomCode,
  playerId,
  onPhaseChange,
  onError,
  children
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [phaseStatus, setPhaseStatus] = useState('waiting');
  const [error, setError] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastPhase, setLastPhase] = useState(null);

  // Memoize betting phase status
  const bettingPhaseInfo = useMemo(() => {
    if (!gameState) return null;

    const isBettingPhase = gameState.phase === 'betting';
    const bettingTimeLeft = gameState.bettingTimeLeft || 0;
    const totalPlayers = gameState.players?.length || 0;
    const playersWithBets = gameState.players?.filter(p => p.hasPlacedBet)?.length || 0;
    
    return {
      isBettingPhase,
      timeLeft: bettingTimeLeft,
      totalPlayers,
      playersWithBets,
      allPlayersReady: totalPlayers > 0 && playersWithBets === totalPlayers,
      progress: totalPlayers > 0 ? (playersWithBets / totalPlayers) * 100 : 0
    };
  }, [gameState]);

  // Handle phase transitions
  useEffect(() => {
    if (!gameState || !bettingPhaseInfo) return;

    const currentPhase = gameState.phase;
    
    // Detect phase changes
    if (lastPhase !== currentPhase) {
      setIsTransitioning(true);
      setLastPhase(currentPhase);
      
      // Clear transition state after animation
      const transitionTimer = setTimeout(() => {
        setIsTransitioning(false);
      }, 500);

      // Notify parent of phase change
      if (onPhaseChange) {
        onPhaseChange(currentPhase, lastPhase);
      }

      return () => clearTimeout(transitionTimer);
    }
  }, [gameState?.phase, lastPhase, onPhaseChange, bettingPhaseInfo]);

  // Update betting timer
  useEffect(() => {
    if (!bettingPhaseInfo?.isBettingPhase) {
      setTimeLeft(0);
      return;
    }

    setTimeLeft(bettingPhaseInfo.timeLeft);
  }, [bettingPhaseInfo]);

  // Handle betting phase status updates
  useEffect(() => {
    if (!bettingPhaseInfo) {
      setPhaseStatus('waiting');
      return;
    }

    if (bettingPhaseInfo.isBettingPhase) {
      if (bettingPhaseInfo.timeLeft <= 0) {
        setPhaseStatus('timeout');
      } else if (bettingPhaseInfo.allPlayersReady) {
        setPhaseStatus('ready');
      } else {
        setPhaseStatus('active');
      }
    } else {
      setPhaseStatus('waiting');
    }
  }, [bettingPhaseInfo]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleBettingPhaseStarted = (data) => {
      console.log('Betting phase started:', data);
      setTimeLeft(data.timeLeft || 30);
      setPhaseStatus('active');
      setError(null);
      setIsTransitioning(true);
      
      setTimeout(() => setIsTransitioning(false), 500);
    };

    const handleBettingPhaseEnded = (data) => {
      console.log('Betting phase ended:', data);
      setTimeLeft(0);
      setPhaseStatus('ended');
      setIsTransitioning(true);
      
      setTimeout(() => setIsTransitioning(false), 500);
    };

    const handleBettingTimeUpdate = (data) => {
      setTimeLeft(data.timeLeft || 0);
    };

    const handleNoBetsPlaced = (data) => {
      setError(data.message || 'No bets were placed');
      setPhaseStatus('error');
      
      // Clear error after delay
      setTimeout(() => {
        setError(null);
        setPhaseStatus('waiting');
      }, 3000);
    };

    const handleBettingError = (data) => {
      const errorMessage = data.message || 'Betting error occurred';
      setError(errorMessage);
      setPhaseStatus('error');
      
      if (onError) {
        onError(errorMessage, data);
      }
      
      // Clear error after delay
      setTimeout(() => {
        setError(null);
      }, 5000);
    };

    // Register socket event listeners
    socket.on('bettingPhaseStarted', handleBettingPhaseStarted);
    socket.on('bettingPhaseEnded', handleBettingPhaseEnded);
    socket.on('bettingTimeUpdate', handleBettingTimeUpdate);
    socket.on('noBetsPlaced', handleNoBetsPlaced);
    socket.on('bettingError', handleBettingError);

    return () => {
      socket.off('bettingPhaseStarted', handleBettingPhaseStarted);
      socket.off('bettingPhaseEnded', handleBettingPhaseEnded);
      socket.off('bettingTimeUpdate', handleBettingTimeUpdate);
      socket.off('noBetsPlaced', handleNoBetsPlaced);
      socket.off('bettingError', handleBettingError);
    };
  }, [socket, onError]);

  // Format time display
  const formatTime = useCallback((seconds) => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get status message
  const getStatusMessage = useCallback(() => {
    if (error) return error;
    
    if (!bettingPhaseInfo) return 'Waiting for game state...';
    
    switch (phaseStatus) {
      case 'active':
        if (bettingPhaseInfo.allPlayersReady) {
          return 'All players ready! Starting soon...';
        }
        return `Waiting for ${bettingPhaseInfo.totalPlayers - bettingPhaseInfo.playersWithBets} more players`;
      
      case 'ready':
        return 'All players ready! Starting game...';
      
      case 'timeout':
        return 'Betting time expired! Starting game...';
      
      case 'ended':
        return 'Betting phase complete';
      
      case 'error':
        return error || 'An error occurred';
      
      case 'waiting':
      default:
        return 'Waiting for betting phase to start...';
    }
  }, [phaseStatus, bettingPhaseInfo, error]);

  // Get timer color based on time remaining
  const getTimerColor = useCallback((seconds) => {
    if (seconds <= 5) return '#ff6b6b'; // Red for urgent
    if (seconds <= 10) return '#ffa726'; // Orange for warning
    return '#69db7c'; // Green for normal
  }, []);

  // Don't render if no game state
  if (!gameState) {
    return (
      <div className="betting-phase-manager waiting">
        <div className="phase-status">
          <span className="status-text">Waiting for game to start...</span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className={`betting-phase-manager ${phaseStatus} ${isTransitioning ? 'transitioning' : ''}`}>
      {bettingPhaseInfo?.isBettingPhase && (
        <div className="betting-phase-header">
          <div className="timer-section">
            <div 
              className="countdown-timer"
              style={{ color: getTimerColor(timeLeft) }}
            >
              {formatTime(timeLeft)}
            </div>
            <div className="timer-label">Betting Time</div>
          </div>
          
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${bettingPhaseInfo.progress}%` }}
              />
            </div>
            <div className="progress-text">
              {bettingPhaseInfo.playersWithBets}/{bettingPhaseInfo.totalPlayers} players ready
            </div>
          </div>
        </div>
      )}
      
      <div className="phase-status">
        <div className={`status-indicator ${phaseStatus}`}>
          <div className="status-dot" />
        </div>
        <span className="status-text">{getStatusMessage()}</span>
      </div>
      
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}
      
      {children}
    </div>
  );
});

export default BettingPhaseManager;