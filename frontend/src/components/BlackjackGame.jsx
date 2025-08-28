import React, { useState, useEffect } from 'react';
import { CasinoTable } from './index';
import BettingPanel from './BettingPanel';
import PlayingCard from '../PlayingCard';
import logo from '../assets/logo.png';
import { io } from 'socket.io-client';
import { ConfigManager } from '../config/environment';

// Load and validate configuration
const config = ConfigManager.validate();
const API_URL = config.API_URL;
const WS_URL = config.WS_URL;
const socket = io(WS_URL, { autoConnect: false });

function BlackjackGame() {
  const [playerName, setPlayerName] = useState('')
  const [gameState, setGameState] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [winCount, setWinCount] = useState(0)
  const [nameSaved, setNameSaved] = useState(false)
  const [nextRoundReady, setNextRoundReady] = useState(false)
  const [phase, setPhase] = useState('betting')
  const [doubleDownAvailable, setDoubleDownAvailable] = useState(false)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [splitActive, setSplitActive] = useState(false)
  const [activeHand, setActiveHand] = useState(0)
  const [splitHands, setSplitHands] = useState([])
  const [roomCode, setRoomCode] = useState('')
  const [joinedRoom, setJoinedRoom] = useState(null)
  const [roomInput, setRoomInput] = useState('')
  const [roomError, setRoomError] = useState('')
  const [players, setPlayers] = useState([])
  const [socketId, setSocketId] = useState(null)
  const [creatorId, setCreatorId] = useState(null)
  const [multiGameState, setMultiGameState] = useState(null)
  const [startError, setStartError] = useState('');
  const [startLoading, setStartLoading] = useState(false);
  const [gameMode, setGameMode] = useState('multi'); // Go directly to multiplayer
  
  // Betting state
  const [bettingTimeLeft, setBettingTimeLeft] = useState(0);
  const [betError, setBetError] = useState('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  // Now it's safe to use socketId and creatorId
  const isCreator = socketId && creatorId && socketId === creatorId;

  const handleStartGame = async () => {
    setStartError('');
    setStartLoading(true);
    try {
      if (joinedRoom) {
        socket.emit('startGameInRoom', joinedRoom);
      }
    } catch (err) {
      setStartError('Error al iniciar la partida. Intenta de nuevo.');
    } finally {
      setStartLoading(false);
    }
  }

  useEffect(() => {
    if (gameMode === 'multi') {
      socket.connect();
      socket.on('connect', () => {
        setSocketId(socket.id);
        console.log('Socket.IO conectado:', socket.id);
      });
      socket.on('disconnect', () => {
        setSocketId(null);
        console.log('Socket.IO desconectado');
      });
      socket.on('roomCreated', code => {
        setRoomCode(code);
        setJoinedRoom(code);
        setRoomError('');
      });
      socket.on('roomJoined', code => {
        setJoinedRoom(code);
        setRoomError('');
      });
      socket.on('roomError', msg => {
        setRoomError(msg);
      });
      socket.on('playersUpdate', data => {
        setPlayers(data.players);
        setCreatorId(data.creator);
      });
      socket.on('gameStarted', state => {
        setMultiGameState(state);
        setStatus('multi-started');
      });
      socket.on('gameStateUpdate', state => {
        console.log('Game state update:', state);
        setMultiGameState(state);
      });
      
      // Betting events
      socket.on('bettingPhaseStarted', (data) => {
        console.log('Betting phase started:', data);
        setBettingTimeLeft(data.timeLeft || data.duration);
        setBetError('');
      });
      
      socket.on('bettingTimeUpdate', (data) => {
        setBettingTimeLeft(data.timeLeft);
      });
      
      socket.on('betConfirmed', (data) => {
        setIsPlacingBet(false);
        setBetError('');
        // Update the game state with new bet info
        if (data.success && multiGameState) {
          const updatedState = { ...multiGameState };
          const playerIndex = updatedState.players.findIndex(p => p.id === socketId);
          if (playerIndex !== -1) {
            updatedState.players[playerIndex] = {
              ...updatedState.players[playerIndex],
              currentBet: data.betAmount,
              balance: data.newBalance,
              hasPlacedBet: true
            };
            setMultiGameState(updatedState);
          }
        }
      });
      
      socket.on('betError', (data) => {
        setIsPlacingBet(false);
        setBetError(data.error);
      });
      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('roomCreated');
        socket.off('roomJoined');
        socket.off('roomError');
        socket.off('playersUpdate');
        socket.off('gameStarted');
        socket.off('gameStateUpdate');
        socket.off('bettingPhaseStarted');
        socket.off('bettingTimeUpdate');
        socket.off('betConfirmed');
        socket.off('betError');
        socket.disconnect();
      };
    }
  }, [gameMode]);

  // Helper to call backend (for solo mode - currently disabled)
  const callApi = async (endpoint, method = 'POST', body = {}) => {
    setError('')
    if (sessionId && !body.sessionId) body.sessionId = sessionId;
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unknown error')
      if (endpoint === '/start' && data.sessionId) {
        setSessionId(data.sessionId)
        setGameState(data.gameState)
        setStatus(data.gameState.status || 'playing')
        return data.gameState
      } else {
        setGameState(data)
        setStatus(data.status || 'playing')
        return data
      }
    } catch (err) {
      setError(err.message)
    }
  }

  // Solo mode functions (currently disabled)
  const handleStart = () => {
    if (!playerName) return setError('Please enter your name')
    setWinCount(0)
    setNextRoundReady(false)
    callApi('/start', 'POST', { name: playerName })
  }

  const handleHit = () => callApi('/hit')
  const handleStand = () => callApi('/stand')
  
  const handleNextRound = () => {
    setNextRoundReady(false)
    callApi('/restart', 'POST', {})
  }
  
  const handleQuit = () => {
    setGameState(null)
    setStatus('idle')
    setPlayerName('')
    setNameSaved(false)
    setWinCount(0)
    setNextRoundReady(false)
    setError('')
  }

  // Betting functions
  const handleChipClick = useCallback((chipValue) => {
    if (!multiGameState || multiGameState.phase !== 'betting') return;
    
    const myPlayer = multiGameState.players.find(p => p.id === socketId);
    if (!myPlayer) return;

    const newBetAmount = (myPlayer.currentBet || 0) + chipValue;
    
    if (newBetAmount > myPlayer.balance + (myPlayer.currentBet || 0)) {
      setBetError('Insufficient balance');
      return;
    }

    setIsPlacingBet(true);
    setBetError('');
    socket.emit('placeBet', {
      code: joinedRoom,
      amount: newBetAmount
    });
  }, [multiGameState, socketId, joinedRoom]);

  const handleAllIn = useCallback(() => {
    if (!multiGameState || multiGameState.phase !== 'betting') return;
    
    const myPlayer = multiGameState.players.find(p => p.id === socketId);
    if (!myPlayer) return;

    setIsPlacingBet(true);
    setBetError('');
    socket.emit('placeBet', {
      code: joinedRoom,
      amount: myPlayer.balance + (myPlayer.currentBet || 0)
    });
  }, [multiGameState, socketId, joinedRoom]);

  const handleClearBet = useCallback(() => {
    if (!multiGameState || multiGameState.phase !== 'betting') return;
    
    setIsPlacingBet(true);
    setBetError('');
    socket.emit('clearBet', {
      code: joinedRoom
    });
  }, [multiGameState, joinedRoom]);
   

  const placeBet = () => {
    handleStart()
  }

  useEffect(() => {
    if (['win', 'lose', 'draw', 'blackjack'].includes(status)) {
      setNextRoundReady(true)
    }
  }, [status])

  // Card rendering helper
  const renderCard = (card, idx, isDealer = false) => (
    <PlayingCard
      key={idx}
      value={card?.value}
      suit={card?.suit}
      faceDown={
        (phase === 'dealing' && !cardFlipped) ||
        (isDealer && phase === 'player-turn' && idx === 1 && !cardFlipped)
      }
      flipped={cardFlipped || phase === 'result'}
    />
  )

  // Update phase and doubleDownAvailable based on gameState
  useEffect(() => {
    if (!gameState) return;
    if (gameState.status === 'betting') setPhase('betting');
    else if (gameState.status === 'dealing') setPhase('dealing');
    else if (gameState.status === 'player-turn') setPhase('player-turn');
    else if (gameState.status === 'dealer-turn') setPhase('dealer-turn');
    else setPhase('result');
    
    setDoubleDownAvailable(
      gameState?.player &&
      Array.isArray(gameState.player.hands) &&
      gameState.player.hands.length > 0 &&
      Array.isArray(gameState.player.hands[0].cards) &&
      gameState.player.hands[0].cards.length === 2 &&
      phase === 'player-turn'
    );
  }, [gameState]);

  // Flip cards when phase transitions
  useEffect(() => {
    if (phase === 'dealing') {
      setCardFlipped(false);
    } else if ((phase === 'player-turn' || phase === 'dealer-turn') && !cardFlipped) {
      setTimeout(() => setCardFlipped(true), 400);
    }
  }, [phase]);

  const handleDoubleDown = () => callApi('/double');

  const handleSplit = async () => {
    const res = await callApi('/split');
    if (res && res.splitHands) {
      setSplitActive(true);
      setSplitHands(res.splitHands);
      setActiveHand(0);
    }
  };

  const splitAvailable = (
    gameState?.player &&
    Array.isArray(gameState.player.hands) &&
    gameState.player.hands.length === 1 &&
    Array.isArray(gameState.player.hands[0]?.cards) &&
    gameState.player.hands[0].cards.length === 2 &&
    gameState.player.hands[0].cards[0]?.value === gameState.player.hands[0].cards[1]?.value &&
    phase === 'player-turn'
  );

  // Multiplayer mode (main functionality)
  if (gameMode === 'multi') {
    if (!joinedRoom) {
      return (
        <div className="main-layout">
          <div className="center-panel">
            <img src={logo} alt="Logo" className="logo" />
            <h2>Modo Multiplayer</h2>
            <input
              className="player-input"
              type="text"
              placeholder="Tu nombre"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={20}
              style={{ marginBottom: '1em' }}
            />
            <div style={{ margin: '1em 0' }}>
              <button className="mode-btn" onClick={() => {
                if (!playerName.trim()) {
                  setRoomError('Ingresa tu nombre');
                  return;
                }
                socket.emit('createRoom', playerName.trim());
              }}>Crear sala</button>
            </div>
            <div style={{ margin: '1em 0' }}>
              <input
                className="player-input"
                type="text"
                placeholder="Código de sala"
                value={roomInput}
                onChange={e => setRoomInput(e.target.value.toUpperCase())}
                maxLength={4}
                style={{ textTransform: 'uppercase' }}
              />
              <button className="mode-btn" onClick={() => {
                if (!playerName.trim()) {
                  setRoomError('Ingresa tu nombre');
                  return;
                }
                if (roomInput.trim().length === 0) {
                  setRoomError('Ingresa un código de sala');
                  return;
                }
                socket.emit('joinRoom', { code: roomInput.trim().toUpperCase(), playerName: playerName.trim() });
              }}>Unirse a sala</button>
            </div>
            {roomError && <div className="error-msg">{roomError}</div>}
          </div>
        </div>
      );
    } else {
      if (status !== 'multi-started') {
        return (
          <div className="lobby-layout">
            <div className="lobby-content">
              <img src={logo} alt="Logo" className="logo" />
              <h2>Sala: <span style={{ color: '#ffd54f' }}>{joinedRoom}</span></h2>
              <p>Comparte este código para que otros se unan.</p>
              <h3>Jugadores en la sala:</h3>
              <ul className="players-list">
                {players.map(p => (
                  <li key={p.id} className={p.id === socket.id ? 'current-player' : ''}>
                    {p.name} {p.id === socket.id ? '(Tú)' : ''} {isCreator && p.id === socket.id ? '(Creador)' : ''}
                  </li>
                ))}
              </ul>
              <div className="lobby-buttons">
                {isCreator && (
                  <button className="mode-btn" onClick={() => socket.emit('startGameInRoom', joinedRoom)}>
                    Iniciar partida
                  </button>
                )}
                <button className="mode-btn" onClick={() => {
                  setJoinedRoom(null);
                  setRoomCode('');
                  setRoomInput('');
                  setRoomError('');
                  setPlayers([]);
                  setCreatorId(null);
                  socket.emit('leaveRoom', joinedRoom);
                }}>Salir de la sala</button>
              </div>
            </div>
          </div>
        );
      } else {
        if (multiGameState) {
          const gs = multiGameState;
          const isMyTurn = gs.phase === 'playing' && gs.players[gs.turn]?.id === socketId;
          const isResult = gs.phase === 'result';
          const myPlayer = gs.players.find(p => p.id === socketId);

          const casinoPlayers = gs.players.map((p, idx) => ({
            id: p.id,
            name: p.name,
            position: idx,
            cards: p.hand || [],
            total: p.total || 0,
            status: p.isBust ? 'bust' : p.isBlackjack ? 'blackjack' : p.isStand ? 'stand' : 'playing',
            isCurrentPlayer: p.id === socketId,
            // Victory counters
            victories: p.victories || 0,
            gamesWon: p.gamesWon || 0,
            gamesBlackjack: p.gamesBlackjack || 0,
            gamesLost: p.gamesLost || 0,
            gamesDraw: p.gamesDraw || 0,
            gamesBust: p.gamesBust || 0,
            // Betting information
            balance: p.balance,
            currentBet: p.currentBet,
            hasPlacedBet: p.hasPlacedBet
          }));

          const casinoDealer = {
            hand: gs.dealer?.hand || [],
            total: gs.dealer?.total || 0
          };

          return (
            <div className="casino-layout">
              <div className="casino-header">
                <div className="room-info">
                  <img src={logo} alt="Logo" className="logo-small" />
                  {(multiGameState?.phase === 'waiting' || multiGameState?.phase === undefined) && (
                    <div className="room-code">
                      Room: <span style={{ color: '#ffd54f' }}>{joinedRoom}</span>
                    </div>
                  )}
                </div>

                <div className="casino-controls">
                  <div className="control-buttons">
                    {isResult && isCreator && (
                      <button className="control-btn next-btn" onClick={() => {
                        socket.emit('restartGameInRoom', joinedRoom);
                        setStatus('multi-started');
                        setMultiGameState(null);
                      }}>
                        Next Round
                      </button>
                    )}

                    <button className="control-btn leave-btn" onClick={() => {
                      setJoinedRoom(null);
                      setRoomCode('');
                      setRoomInput('');
                      setRoomError('');
                      setPlayers([]);
                      setStatus('');
                      setMultiGameState(null);
                      socket.emit('leaveRoom', joinedRoom);
                    }}>
                      Leave
                    </button>
                  </div>
                </div>
              </div>

              <CasinoTable
                players={casinoPlayers}
                dealer={casinoDealer}
                gamePhase={gs.phase || 'waiting'}
                currentTurn={gs.turn}
              />

              <div className="casino-footer">
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div style={{ color: 'yellow', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    Debug: Phase={gs.phase}, MyPlayer={myPlayer ? 'exists' : 'null'}, HasBet={myPlayer?.hasPlacedBet}
                  </div>
                )}
                
                {/* Betting Panel during betting phase */}
                {gs.phase === 'betting' && myPlayer && (
                  <div className="betting-section">
                    <BettingPanel
                      balance={myPlayer.balance || 0}
                      currentBet={myPlayer.currentBet || 0}
                      onChipClick={handleChipClick}
                      onAllIn={handleAllIn}
                      onClearBet={handleClearBet}
                      disabled={isPlacingBet || myPlayer.hasPlacedBet}
                      bettingTimeLeft={bettingTimeLeft}
                      minBet={25}
                      maxBet={null}
                      isConnected={socket.connected}
                      betConfirmed={myPlayer.hasPlacedBet}
                    />
                    {betError && (
                      <div className="bet-error" style={{ 
                        color: '#ff6b6b', 
                        textAlign: 'center', 
                        marginTop: '1rem',
                        fontSize: '0.9rem'
                      }}>
                        {betError}
                      </div>
                    )}
                  </div>
                )}

                {gs.phase === 'playing' && isMyTurn && !myPlayer?.isBust && !myPlayer?.isStand && (
                  <div className="action-buttons">
                    <button
                      className="action-btn hit-btn"
                      onClick={() => socket.emit('playerAction', { code: joinedRoom, action: 'hit' })}
                    >
                      Hit
                    </button>
                    <button
                      className="action-btn stand-btn"
                      onClick={() => socket.emit('playerAction', { code: joinedRoom, action: 'stand' })}
                    >
                      Stand
                    </button>
                  </div>
                )}

                {gs.phase === 'playing' && !isMyTurn && (
                  <div className="status-msg">
                    Waiting for <b>{gs.players[gs.turn]?.name}</b>'s turn...
                  </div>
                )}

                {gs.phase === 'dealing' && (
                  <div className="status-msg">
                    Dealing cards...
                  </div>
                )}

                {isResult && (
                  <div className="results-summary">
                    <span>Round Complete - </span>
                    {gs.players.map((p, idx) => (
                      <span key={p.id} style={{ marginRight: '1rem' }}>
                        {p.name}: {gs.results && gs.results[p.id] ? gs.results[p.id].status : 'unknown'}
                        {idx < gs.players.length - 1 ? ' | ' : ''}
                      </span>
                    ))}
                  </div>
                )}

                {startError && (
                  <div className="error-msg" role="alert">
                    {startError}
                  </div>
                )}
              </div>
            </div>
          );
        } else {
          return (
            <div className="main-layout">
              <div className="center-panel">
                <img src={logo} alt="Logo" className="logo" />
                <h2>Sala: <span style={{ color: '#ffd54f' }}>{joinedRoom}</span></h2>
                <p>Esperando a que el creador inicie la partida...</p>
              </div>
            </div>
          );
        }
      }
    }
  }

  // Solo mode is disabled - this should not be reached
  return (
    <div className="main-layout">
      <div className="center-panel">
        <img src={logo} alt="Logo" className="logo" />
        <h2>Modo no disponible</h2>
        <p>El modo solo está temporalmente deshabilitado.</p>
      </div>
    </div>
  );
}

export default BlackjackGame;