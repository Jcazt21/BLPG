import React, { useState, useEffect } from 'react';
import BettingPanel from './BettingPanel';

const BettingPanelDemo = () => {
  const [balance, setBalance] = useState(1000);
  const [currentBet, setCurrentBet] = useState(0);
  const [bettingTimeLeft, setBettingTimeLeft] = useState(30000);
  const [isConnected, setIsConnected] = useState(true);
  const [betConfirmed, setBetConfirmed] = useState(false);
  const [lastBetError, setLastBetError] = useState(null);

  // Simulate betting timer
  useEffect(() => {
    if (bettingTimeLeft > 0 && !betConfirmed) {
      const timer = setTimeout(() => {
        setBettingTimeLeft(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [bettingTimeLeft, betConfirmed]);

  const handleChipClick = (value) => {
    if (currentBet + value <= balance + currentBet) {
      setCurrentBet(prev => prev + value);
      setLastBetError(null);
    }
  };

  const handleAllIn = () => {
    setCurrentBet(balance + currentBet);
    setLastBetError(null);
  };

  const handleClearBet = () => {
    setBalance(prev => prev + currentBet);
    setCurrentBet(0);
    setLastBetError(null);
  };

  const handlePlaceBet = () => {
    if (currentBet > 0 && currentBet <= balance + currentBet) {
      setBalance(prev => prev - currentBet);
      setBetConfirmed(true);
      setLastBetError(null);
    }
  };

  const handleRetryBet = async () => {
    // Simulate network retry
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.3) {
          setLastBetError(null);
          setBetConfirmed(true);
          resolve();
        } else {
          setLastBetError('Retry failed - network timeout');
          reject(new Error('Network timeout'));
        }
      }, 1000);
    });
  };

  const resetDemo = () => {
    setBalance(1000);
    setCurrentBet(0);
    setBettingTimeLeft(30000);
    setIsConnected(true);
    setBetConfirmed(false);
    setLastBetError(null);
  };

  const simulateError = () => {
    setLastBetError('Network connection failed');
  };

  const toggleConnection = () => {
    setIsConnected(prev => !prev);
  };

  return (
    <div style={{ padding: '2rem', background: '#1a1a1a', minHeight: '100vh' }}>
      <h1 style={{ color: '#fff', textAlign: 'center', marginBottom: '2rem' }}>
        Enhanced BettingPanel Demo
      </h1>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <BettingPanel
          balance={balance}
          currentBet={currentBet}
          onChipClick={handleChipClick}
          onAllIn={handleAllIn}
          onClearBet={handleClearBet}
          onPlaceBet={handlePlaceBet}
          showPlaceBetButton={true}
          bettingTimeLeft={bettingTimeLeft}
          minBet={25}
          maxBet={500}
          isConnected={isConnected}
          betConfirmed={betConfirmed}
          onRetryBet={lastBetError ? handleRetryBet : null}
          lastBetError={lastBetError}
        />
        
        <div style={{ 
          marginTop: '2rem', 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button 
            onClick={resetDemo}
            style={{
              padding: '0.5rem 1rem',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            Reset Demo
          </button>
          
          <button 
            onClick={simulateError}
            style={{
              padding: '0.5rem 1rem',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            Simulate Error
          </button>
          
          <button 
            onClick={toggleConnection}
            style={{
              padding: '0.5rem 1rem',
              background: isConnected ? '#ff9800' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
        
        <div style={{ 
          marginTop: '2rem', 
          color: '#fff', 
          textAlign: 'center',
          fontSize: '0.9rem'
        }}>
          <h3>Features Demonstrated:</h3>
          <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
            <li>✅ Predefined chip values (25, 50, 100, 250, 500)</li>
            <li>✅ Dynamic chip generation based on balance</li>
            <li>✅ Real-time bet amount display and updates</li>
            <li>✅ All-In and Clear Bet functionality</li>
            <li>✅ Visual feedback for bet confirmation</li>
            <li>✅ Chip disabling for insufficient balance</li>
            <li>✅ Betting timer display</li>
            <li>✅ Connection status awareness</li>
            <li>✅ Error handling and retry logic</li>
            <li>✅ Minimum bet validation</li>
            <li>✅ Maximum bet limits</li>
            <li>✅ Responsive design</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BettingPanelDemo;