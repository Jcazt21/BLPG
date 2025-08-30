import React, { useMemo, useCallback } from 'react';
import PlayerPosition from './PlayerPosition';
import PlayingCard from '../PlayingCard';
import CardStack from './CardStack';
import VictoryLeaderboard from './VictoryLeaderboard';
import './CasinoTable.css';

const CasinoTable = React.memo(function CasinoTable({ players = [], dealer = null, gamePhase = 'waiting', currentTurn = -1, showLeaderboard = true }) {
  // Memoize active players filtering to prevent unnecessary recalculations
  const activePlayers = useMemo(() => {
    return players.filter(player => player && player.name);
  }, [players]);

  // Memoize dealer cards rendering
  const dealerCards = useMemo(() => {
    if (!dealer?.hand || dealer.hand.length === 0) return null;
    
    return (
      <CardStack 
        cards={dealer.hand} 
        maxVisible={5}
        compactOffset={20}
        expandedOffset={40}
        animationDuration={200}
      />
    );
  }, [dealer?.hand]);

  // Memoize game phase text to prevent unnecessary recalculations
  const gamePhaseText = useMemo(() => {
    switch (gamePhase) {
      case 'waiting': return 'Waiting for players...';
      case 'betting': return 'Place your bets';
      case 'dealing': return 'Dealing cards...';
      case 'playing': return 'Players turn';
      case 'dealer': return 'Dealer turn';
      case 'result': return 'Round complete';
      default: return '';
    }
  }, [gamePhase]);

  // Memoize player positions rendering
  const playerPositions = useMemo(() => {
    return activePlayers.map((player, index) => (
      <div key={player.id || index} className="position-slot">
        <PlayerPosition
          player={player}
          isCurrentTurn={currentTurn === index}
          showCards={gamePhase !== 'waiting'}
          isCurrentPlayer={player.isCurrentPlayer}
          gamePhase={gamePhase}
        />
      </div>
    ));
  }, [activePlayers, currentTurn, gamePhase]);

  return (
    <div className="casino-table">
      {/* Victory Leaderboard - Hide during active gameplay */}
      <VictoryLeaderboard 
        players={activePlayers} 
        isVisible={showLeaderboard && activePlayers.length > 1 && (gamePhase === 'waiting' || gamePhase === 'result')}
      />

      {/* Dealer area at the top */}
      <div className="dealer-area">
        <div className="dealer-header">
          <div className="dealer-label">Javi</div>
        </div>
        <div className="dealer-cards">
          {dealerCards}
        </div>
        {dealer?.total !== undefined && (
          <div className="dealer-total">Total: {dealer.total}</div>
        )}
        {/* Imagen de Javi alineada con el área del dealer */}
        <div className="javi-dealer-image"></div>
      </div>

      {/* Table surface */}
      <div className="table-surface">
        {/* Active players only - responsive layout */}
        <div className="player-positions">
          {playerPositions}
        </div>
      </div>

      {/* Game phase indicator */}
      <div className="game-phase-indicator">
        <span className={`phase-text ${gamePhase}`}>
          {gamePhaseText}
        </span>
      </div>
    </div>
  );
});

export default CasinoTable;