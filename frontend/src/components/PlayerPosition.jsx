import React, { useMemo, useCallback } from 'react';
import PlayingCard from '../PlayingCard';
import './PlayerPosition.css';

const PlayerPosition = React.memo(function PlayerPosition({ player, isCurrentTurn = false, showCards = true, isCurrentPlayer = false, gamePhase = 'waiting' }) {
  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'bust': return '💥';
      case 'blackjack': return '🂡';
      case 'stand': return '✋';
      case 'win': return '🏆';
      case 'lose': return '❌';
      case 'draw': return '🤝';
      default: return '';
    }
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'bust': return '#e57373';
      case 'blackjack': return '#ffd54f';
      case 'stand': return '#90caf9';
      case 'win': return '#b6e2a1';
      case 'lose': return '#e57373';
      case 'draw': return '#ffd54f';
      default: return '#e0e0e0';
    }
  }, []);

  const getBettingStatusInfo = useCallback((player, gamePhase) => {
    if (gamePhase !== 'betting' && gamePhase !== 'dealing' && gamePhase !== 'playing') {
      return null;
    }

    const hasPlacedBet = player.hasPlacedBet || (player.currentBet && player.currentBet > 0);
    const bettingStatus = hasPlacedBet ? 'placed' : 'pending';
    
    return {
      status: bettingStatus,
      icon: bettingStatus === 'placed' ? '✓' : '⏳',
      color: bettingStatus === 'placed' ? '#b6e2a1' : '#ffd54f',
      text: bettingStatus === 'placed' ? 'Bet Placed' : 'Placing bet...'
    };
  }, []);

  // Memoize expensive calculations
  const statusIcon = useMemo(() => getStatusIcon(player.status), [player.status, getStatusIcon]);
  const statusColor = useMemo(() => getStatusColor(player.status), [player.status, getStatusColor]);
  const bettingStatusInfo = useMemo(() => getBettingStatusInfo(player, gamePhase), [player, gamePhase, getBettingStatusInfo]);

  // Memoize card rendering to prevent unnecessary re-renders
  const renderedCards = useMemo(() => {
    if (!showCards || !player.cards || player.cards.length === 0) return null;

    return player.cards.map((card, idx) => (
      <PlayingCard
        key={`${card.value}-${card.suit}-${idx}`}
        value={card.value}
        suit={card.suit}
        faceDown={false}
        flipped={true}
      />
    ));
  }, [showCards, player.cards]);

  return (
    <div className={`player-position ${isCurrentTurn ? 'current-turn' : ''}`}>
      {/* Player info header */}
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        {/* Victory counter */}
        {player.victories !== undefined && (
          <div className="player-victories">
            🏆 {player.victories} victories
          </div>
        )}
        
        {/* Betting Information */}
        {(player.balance !== undefined || player.currentBet !== undefined) && (
          <div className="player-betting-info">
            {player.balance !== undefined && (
              <div className="player-balance">
                💰 {player.balance}
              </div>
            )}
            {player.currentBet !== undefined && player.currentBet > 0 && (
              <div className="player-bet">
                🎯 {player.currentBet}
              </div>
            )}
            {bettingStatusInfo && gamePhase === 'betting' && (
              <div 
                className={`betting-status ${bettingStatusInfo.status}`}
                style={{ color: bettingStatusInfo.color }}
              >
                <span className="betting-status-icon">{bettingStatusInfo.icon}</span>
                <span className="betting-status-text">{bettingStatusInfo.text}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Player cards */}
      {renderedCards && (
        <div className="player-cards">
          {renderedCards}
        </div>
      )}

      {/* Hand total */}
      {showCards && player.total !== undefined && (
        <div className="hand-total">
          Total: {player.total}
        </div>
      )}

      {/* Player status */}
      {player.status && player.status !== 'playing' && (
        <div
          className="player-status"
          style={{ color: statusColor }}
        >
          <span className="status-icon">{statusIcon}</span>
          <span className="status-text">{player.status.toUpperCase()}</span>
        </div>
      )}

      {/* Current turn indicator */}
      {isCurrentTurn && (
        <div className="turn-indicator">
          <div className="turn-arrow">▼</div>
          <div className="turn-text">
            {isCurrentPlayer ? 'YOUR TURN' : `${player.name}'S TURN`}
          </div>
        </div>
      )}
    </div>
  );
});

export default PlayerPosition;