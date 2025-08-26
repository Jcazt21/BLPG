import React, { useMemo } from 'react';
import './VictoryLeaderboard.css';

const VictoryLeaderboard = React.memo(function VictoryLeaderboard({ players = [], isVisible = false }) {
  // Sort players by victories (descending)
  const sortedPlayers = useMemo(() => {
    return [...players]
      .filter(player => player && player.name)
      .sort((a, b) => (b.victories || 0) - (a.victories || 0))
      .slice(0, 5); // Show top 5 players
  }, [players]);

  if (!isVisible || sortedPlayers.length === 0) {
    return null;
  }

  const getMedalIcon = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  return (
    <div className="victory-leaderboard">
      <div className="leaderboard-header">
        <h3>🏆 Victory Leaderboard</h3>
      </div>
      <div className="leaderboard-list">
        {sortedPlayers.map((player, index) => (
          <div key={player.id} className={`leaderboard-item ${index === 0 ? 'champion' : ''}`}>
            <div className="player-rank">
              <span className="medal">{getMedalIcon(index)}</span>
            </div>
            <div className="player-details">
              <div className="player-name">{player.name}</div>
              <div className="player-stats">
                <span className="victories">{player.victories || 0} victories</span>
                {player.gamesWon !== undefined && player.gamesBlackjack !== undefined && (
                  <span className="breakdown">
                    ({player.gamesWon || 0} wins + {player.gamesBlackjack || 0} BJ)
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default VictoryLeaderboard;