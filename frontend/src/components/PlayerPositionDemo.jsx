import React, { useState } from 'react';
import PlayerPosition from './PlayerPosition';
import './PlayerPosition.css';

const PlayerPositionDemo = () => {
  const [gamePhase, setGamePhase] = useState('betting');
  
  const mockPlayers = [
    {
      id: 'player1',
      name: 'Alice',
      position: 0,
      cards: [],
      total: 0,
      status: 'playing',
      isCurrentPlayer: true,
      victories: 3,
      balance: 1500,
      currentBet: 100,
      hasPlacedBet: true
    },
    {
      id: 'player2',
      name: 'Bob',
      position: 1,
      cards: [],
      total: 0,
      status: 'playing',
      isCurrentPlayer: false,
      victories: 1,
      balance: 750,
      currentBet: 50,
      hasPlacedBet: true
    },
    {
      id: 'player3',
      name: 'Charlie',
      position: 2,
      cards: [],
      total: 0,
      status: 'playing',
      isCurrentPlayer: false,
      victories: 0,
      balance: 2000,
      currentBet: 0,
      hasPlacedBet: false
    },
    {
      id: 'player4',
      name: 'Diana',
      position: 3,
      cards: [],
      total: 0,
      status: 'playing',
      isCurrentPlayer: false,
      victories: 5,
      balance: 25,
      currentBet: 25,
      hasPlacedBet: true
    }
  ];

  return (
    <div style={{ 
      padding: '2rem', 
      background: '#1a1a1a', 
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1>PlayerPosition Betting Display Demo</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <label>Game Phase: </label>
        <select 
          value={gamePhase} 
          onChange={(e) => setGamePhase(e.target.value)}
          style={{ 
            padding: '0.5rem', 
            marginLeft: '1rem',
            background: '#333',
            color: 'white',
            border: '1px solid #555'
          }}
        >
          <option value="waiting">Waiting</option>
          <option value="betting">Betting</option>
          <option value="dealing">Dealing</option>
          <option value="playing">Playing</option>
          <option value="result">Result</option>
        </select>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {mockPlayers.map((player, index) => (
          <div key={player.id} style={{ margin: '1rem' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              {player.name} {player.hasPlacedBet ? '(Bet Placed)' : '(Pending)'}
            </h3>
            <PlayerPosition
              player={player}
              isCurrentTurn={index === 0}
              showCards={gamePhase !== 'waiting'}
              isCurrentPlayer={player.isCurrentPlayer}
              gamePhase={gamePhase}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#333', borderRadius: '0.5rem' }}>
        <h3>Features Demonstrated:</h3>
        <ul>
          <li>✅ Balance display with 💰 icon and styled background</li>
          <li>✅ Current bet display with 🎯 icon (only when bet > 0)</li>
          <li>✅ Betting status indicators during betting phase</li>
          <li>✅ Real-time visual feedback (✓ for placed, ⏳ for pending)</li>
          <li>✅ Responsive design for different screen sizes</li>
          <li>✅ Visual styling with hover effects and animations</li>
          <li>✅ Integration with existing victory counter system</li>
        </ul>
      </div>
    </div>
  );
};

export default PlayerPositionDemo;