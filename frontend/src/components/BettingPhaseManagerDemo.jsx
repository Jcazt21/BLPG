import React, { useState, useEffect } from 'react';
import BettingPhaseManager from './BettingPhaseManager';
import BettingPanel from './BettingPanel';

const BettingPhaseManagerDemo = () => {
  const [gameState, setGameState] = useState(null);
  const [mockSocket, setMockSocket] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('waiting');
  const [timeLeft, setTimeLeft] = useState(30);
  const [players, setPlayers] = useState([
    { id: '1', name: 'Player 1', hasPlacedBet: false, balance: 1000, currentBet: 0 },
    { id: '2', name: 'Player 2', hasPlacedBet: false, balance: 1500, currentBet: 0 },
    { id: '3', name: 'Player 3', hasPlacedBet: false, balance: 800, currentBet: 0 },
  ]);

  // Create mock socket
  useEffect(() => {
    const mockSocketInstance = {
      on: (event, callback) => {
        console.log(`Mock socket listening for: ${event}`);
      },
      off: (event, callback) => {
        console.log(`Mock socket stopped listening for: ${event}`);
      },
      emit: (event, data) => {
        console.log(`Mock socket emitting: ${event}`, data);
      }
    };
    setMockSocket(mockSocketInstance);
  }, []);

  // Update game state based on current phase
  useEffect(() => {
    const newGameState = {
      phase: currentPhase,
      bettingTimeLeft: timeLeft,
      players: players,
      started: true,
      dealer: { hand: [], total: 0 },
      deck: [],
      turn: 0,
      results: null,
      roundId: 'demo-round-1',
      totalPot: players.reduce((sum, p) => sum + p.currentBet, 0),
      minBet: 25,
      maxBet: 1000
    };
    setGameState(newGameState);
  }, [currentPhase, timeLeft, players]);

  // Simulate betting timer
  useEffect(() => {
    if (currentPhase === 'betting' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, timeLeft]);

  // Auto-transition when timer expires
  useEffect(() => {
    if (currentPhase === 'betting' && timeLeft === 0) {
      setTimeout(() => {
        setCurrentPhase('dealing');
      }, 1000);
    }
  }, [currentPhase, timeLeft]);

  const handlePhaseChange = (newPhase, oldPhase) => {
    console.log(`Phase changed from ${oldPhase} to ${newPhase}`);
  };

  const handleError = (error, data) => {
    console.error('Betting phase error:', error, data);
  };

  const handleStartBetting = () => {
    setCurrentPhase('betting');
    setTimeLeft(30);
    setPlayers(prev => prev.map(p => ({ ...p, hasPlacedBet: false, currentBet: 0 })));
  };

  const handlePlayerBet = (playerId, amount) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId 
        ? { ...p, hasPlacedBet: true, currentBet: amount, balance: p.balance - amount }
        : p
    ));
  };

  const handleResetDemo = () => {
    setCurrentPhase('waiting');
    setTimeLeft(30);
    setPlayers([
      { id: '1', name: 'Player 1', hasPlacedBet: false, balance: 1000, currentBet: 0 },
      { id: '2', name: 'Player 2', hasPlacedBet: false, balance: 1500, currentBet: 0 },
      { id: '3', name: 'Player 3', hasPlacedBet: false, balance: 800, currentBet: 0 },
    ]);
  };

  const handleSimulateError = () => {
    if (mockSocket) {
      // Simulate a betting error
      const errorEvent = new CustomEvent('bettingError', {
        detail: { message: 'Simulated betting error for demo purposes' }
      });
      console.log('Simulating betting error...');
    }
  };

  return (
    <div style={{ 
      padding: '2rem', 
      background: 'linear-gradient(135deg, #1a1a2e, #16213e)', 
      minHeight: '100vh',
      color: '#fff'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
        BettingPhaseManager Demo
      </h1>
      
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Demo Controls */}
        <div style={{ 
          padding: '1rem', 
          background: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: '0.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <button 
            onClick={handleStartBetting}
            style={{ 
              padding: '0.5rem 1rem', 
              background: '#4caf50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Start Betting Phase
          </button>
          
          <button 
            onClick={() => setCurrentPhase('dealing')}
            style={{ 
              padding: '0.5rem 1rem', 
              background: '#2196f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Go to Dealing
          </button>
          
          <button 
            onClick={() => setCurrentPhase('playing')}
            style={{ 
              padding: '0.5rem 1rem', 
              background: '#ff9800', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Go to Playing
          </button>
          
          <button 
            onClick={handleSimulateError}
            style={{ 
              padding: '0.5rem 1rem', 
              background: '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Simulate Error
          </button>
          
          <button 
            onClick={handleResetDemo}
            style={{ 
              padding: '0.5rem 1rem', 
              background: '#9e9e9e', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Reset Demo
          </button>
        </div>

        {/* Current State Display */}
        <div style={{ 
          padding: '1rem', 
          background: 'rgba(255, 255, 255, 0.05)', 
          borderRadius: '0.5rem',
          fontSize: '0.9rem'
        }}>
          <h3>Current State:</h3>
          <p><strong>Phase:</strong> {currentPhase}</p>
          <p><strong>Time Left:</strong> {timeLeft}s</p>
          <p><strong>Players:</strong></p>
          <ul>
            {players.map(player => (
              <li key={player.id}>
                {player.name} - Balance: {player.balance}, Bet: {player.currentBet}, 
                Ready: {player.hasPlacedBet ? '✓' : '✗'}
              </li>
            ))}
          </ul>
        </div>

        {/* BettingPhaseManager Component */}
        <BettingPhaseManager
          gameState={gameState}
          socket={mockSocket}
          roomCode="DEMO"
          playerId="1"
          onPhaseChange={handlePhaseChange}
          onError={handleError}
        >
          {/* Demo betting controls for players */}
          {currentPhase === 'betting' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              marginTop: '1rem'
            }}>
              <h4>Quick Bet Actions:</h4>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {players.map(player => (
                  <div key={player.id} style={{ 
                    padding: '0.5rem', 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: '0.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    minWidth: '150px'
                  }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {player.name}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button 
                        onClick={() => handlePlayerBet(player.id, 50)}
                        disabled={player.hasPlacedBet || player.balance < 50}
                        style={{ 
                          padding: '0.25rem 0.5rem', 
                          fontSize: '0.7rem',
                          background: player.hasPlacedBet ? '#666' : '#4caf50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: player.hasPlacedBet ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Bet 50
                      </button>
                      <button 
                        onClick={() => handlePlayerBet(player.id, 100)}
                        disabled={player.hasPlacedBet || player.balance < 100}
                        style={{ 
                          padding: '0.25rem 0.5rem', 
                          fontSize: '0.7rem',
                          background: player.hasPlacedBet ? '#666' : '#2196f3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: player.hasPlacedBet ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Bet 100
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </BettingPhaseManager>

        {/* Integration Example with BettingPanel */}
        {currentPhase === 'betting' && (
          <div style={{ marginTop: '2rem' }}>
            <h4>Example Integration with BettingPanel:</h4>
            <BettingPanel
              balance={players[0].balance}
              currentBet={players[0].currentBet}
              bettingTimeLeft={timeLeft * 1000}
              minBet={25}
              maxBet={1000}
              onChipClick={(value) => console.log('Chip clicked:', value)}
              onAllIn={() => console.log('All in clicked')}
              onClearBet={() => console.log('Clear bet clicked')}
              onPlaceBet={() => console.log('Place bet clicked')}
              disabled={players[0].hasPlacedBet}
              betConfirmed={players[0].hasPlacedBet}
              isConnected={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BettingPhaseManagerDemo;