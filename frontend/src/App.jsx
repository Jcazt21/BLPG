import { useState, useEffect } from 'react'
import './App.css'
import PlayingCard from './PlayingCard'
import './PlayingCard.css'
import { CasinoTable, BettingPanel } from './components'
import logo from './assets/logo.png'
import { io } from 'socket.io-client';
import { ConfigManager } from './config/environment';

// Load and validate configuration
const config = ConfigManager.validate();
const API_URL = config.API_URL;
const WS_URL = config.WS_URL;
const socket = io(WS_URL, { autoConnect: false });

const START_BALANCE = 1000
const CHIP_VALUES = [25, 50, 100, 250, 500, 1000]

function App() {
  const [mode, setMode] = useState(null); // 'solo' | 'multi'
  const [playerName, setPlayerName] = useState('')
  const [gameState, setGameState] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [winCount, setWinCount] = useState(0)
  const [balance, setBalance] = useState(START_BALANCE)
  const [bet, setBet] = useState(0)
  const [betPlaced, setBetPlaced] = useState(false)
  const [betLocked, setBetLocked] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nextRoundReady, setNextRoundReady] = useState(false)
  const [phase, setPhase] = useState('betting')
  const [doubleDownAvailable, setDoubleDownAvailable] = useState(false)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [splitActive, setSplitActive] = useState(false)
  const [activeHand, setActiveHand] = useState(0)
  const [splitHands, setSplitHands] = useState([])
  const [noChipsMsg, setNoChipsMsg] = useState('')
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
  const [multiBet, setMultiBet] = useState(0);
  const [multiBalance, setMultiBalance] = useState(START_BALANCE);
  const [bettingError, setBettingError] = useState('');

  // Now it's safe to use socketId and creatorId
  const isCreator = socketId && creatorId && socketId === creatorId;


  const handleStartGame = async () => {
    setStartError('');
    setStartLoading(true);
    try {
      if (joinedRoom) {
        socket.emit('startGameInRoom', joinedRoom);
        // Espera confirmación si lo deseas
      }
    } catch (err) {
      setStartError('Error al iniciar la partida. Intenta de nuevo.');
    } finally {
      setStartLoading(false);
    }
  }

  useEffect(() => {
    if (mode === 'multi') {
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
        // data: { players: [...], creator: 'socketId' }
        setPlayers(data.players);
        setCreatorId(data.creator);
      });
      socket.on('gameStarted', state => {
        setMultiGameState(state);
        setStatus('multi-started');
      });
      socket.on('gameStateUpdate', state => {
        setMultiGameState(state);
        // Update player's balance and bet from game state
        const myPlayer = state.players?.find(p => p.id === socketId);
        if (myPlayer) {
          setMultiBalance(myPlayer.balance);
          setMultiBet(myPlayer.bet);
        }
      });
      socket.on('bettingError', msg => {
        setBettingError(msg);
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
        socket.off('bettingError');
        socket.disconnect();
      };
    }
  }, [mode]);

  // Helper to call backend
  const callApi = async (endpoint, method = 'POST', body = {}) => {
    setError('')
    // Always include sessionId if available and not already present
    if (sessionId && !body.sessionId) body.sessionId = sessionId;
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unknown error')
      // If this is the /start response, set sessionId and gameState
      if (endpoint === '/start' && data.sessionId) {
        setSessionId(data.sessionId)
        setGameState(data.gameState)
        setStatus(data.gameState.status || 'playing')
        if (data.gameState.player) {
          setBalance(data.gameState.player.balance)
          setBet(data.gameState.player.bet)
        }
        return data.gameState
      } else {
        setGameState(data)
        setStatus(data.status || 'playing')
        if (data.player) {
          setBalance(data.player.balance)
          setBet(data.player.bet)
        }
        return data
      }
    } catch (err) {
      setError(err.message)
    }
  }

  // Start game
  const handleStart = () => {
    if (!playerName) return setError('Please enter your name')
    if (bet <= 0) return setError('Please place a bet')
    if (bet > balance) return setError('Bet exceeds balance')
    setWinCount(0)
    setBetLocked(true)
    setNextRoundReady(false)
    callApi('/start', 'POST', { name: playerName, bet, balance })
  }

  // Hit
  const handleHit = () => callApi('/hit')
  // Stand
  const handleStand = () => callApi('/stand')
  // Next Round (restart)
  const handleNextRound = () => {
    if (bet > balance) {
      setError('Bet exceeds balance')
      return
    }
    setBetLocked(true)
    setNextRoundReady(false)
    callApi('/restart', 'POST', { bet })
    setTimeout(() => setBet(0), 100) // Reset bet right after starting next round
  }
  // Quit
  const handleQuit = () => {
    setGameState(null)
    setStatus('idle')
    setPlayerName('')
    setNameSaved(false)
    setWinCount(0)
    setBalance(START_BALANCE)
    setBet(0)
    setBetLocked(false)
    setNextRoundReady(false)
    setError('')
  }

  // Betting logic
  const handleChip = (value) => {
    if (betLocked) return
    if (bet + value > balance) return
    setBet((b) => b + value)
  }
  const handleMaxBet = () => {
    if (betLocked) return
    setBet(balance)
  }
  const handleClearBet = () => {
    if (betLocked) return
    setBet(0)
  }

  // Modular betting system logic
  const placeBet = () => {
    if (bet > 0 && bet <= balance) {
      setBalance(balance - bet)
      setBetPlaced(true)
      setBetLocked(true)
      setNoChipsMsg('')
      handleStart()
    }
  }

  const payout = (result) => {
    if (result === 'win') {
      setBalance((b) => b + bet * 2)
    } else if (result === 'draw') {
      setBalance((b) => b + bet)
    }
    // lose: do nothing (bet already deducted)
  }

  // After round ends, handle payout and reset bet
  useEffect(() => {
    if (['win', 'lose', 'draw', 'blackjack'].includes(status)) {
      payout(status === 'blackjack' ? 'win' : status)
      setBet(0)
      setBetPlaced(false)
      setBetLocked(false)
      setNextRoundReady(true)
      if (balance === 0) setNoChipsMsg('No more chips!')
    }
  }, [status])

  // Disable betting if balance is 0
  const canBet = balance > 0

  // Multiplayer betting handlers
  const handleMultiChip = (value) => {
    if (multiGameState?.phase !== 'betting') return;
    const myPlayer = multiGameState.players?.find(p => p.id === socketId);
    if (!myPlayer || myPlayer.hasPlacedBet) return;
    
    const newBet = multiBet + value;
    if (newBet > multiBalance + multiBet) return; // Can't exceed available balance
    
    setMultiBet(newBet);
    socket.emit('updateBet', { code: joinedRoom, amount: newBet });
  };

  const handleMultiAllIn = () => {
    if (multiGameState?.phase !== 'betting') return;
    const myPlayer = multiGameState.players?.find(p => p.id === socketId);
    if (!myPlayer || myPlayer.hasPlacedBet) return;
    
    const allInAmount = multiBalance + multiBet;
    setMultiBet(allInAmount);
    socket.emit('updateBet', { code: joinedRoom, amount: allInAmount });
  };

  const handleMultiClearBet = () => {
    if (multiGameState?.phase !== 'betting') return;
    const myPlayer = multiGameState.players?.find(p => p.id === socketId);
    if (!myPlayer || myPlayer.hasPlacedBet) return;
    
    setMultiBet(0);
    socket.emit('updateBet', { code: joinedRoom, amount: 0 });
  };

  const handleMultiPlaceBet = () => {
    if (multiGameState?.phase !== 'betting' || multiBet <= 0) return;
    const myPlayer = multiGameState.players?.find(p => p.id === socketId);
    if (!myPlayer || myPlayer.hasPlacedBet) return;
    
    socket.emit('placeBet', { code: joinedRoom, amount: multiBet });
    setBettingError('');
  };

  // Card rendering helper
  const renderCard = (card, idx, isDealer = false) => (
    <PlayingCard
      key={idx}
      value={card?.value}
      suit={card?.suit}
      faceDown={
        (phase === 'dealing' && !cardFlipped) ||
        (isDealer && phase === 'player-turn' && idx === 1 && !cardFlipped) // dealer's hole card
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
    // Double down is available if player has exactly 2 cards, enough balance, and not after hit
    setDoubleDownAvailable(
      gameState?.player &&
      Array.isArray(gameState.player.hands) &&
      gameState.player.hands.length > 0 &&
      Array.isArray(gameState.player.hands[0].cards) &&
      gameState.player.hands[0].cards.length === 2 &&
      gameState.player.balance >= gameState.player.bet &&
      phase === 'player-turn'
    );
  }, [gameState]);

  // Flip cards when phase transitions from 'dealing' to 'player-turn' or 'dealer-turn'
  useEffect(() => {
    if (phase === 'dealing') {
      setCardFlipped(false);
    } else if ((phase === 'player-turn' || phase === 'dealer-turn') && !cardFlipped) {
      setTimeout(() => setCardFlipped(true), 400); // delay for flip effect
    }
  }, [phase]);

  // Add Double Down handler
  const handleDoubleDown = () => callApi('/double');

  // Add Split handler
  const handleSplit = async () => {
    const res = await callApi('/split');
    if (res && res.splitHands) {
      setSplitActive(true);
      setSplitHands(res.splitHands);
      setActiveHand(0);
    }
  };

  // Helper to check if split is available
  const splitAvailable = (
    gameState?.player &&
    Array.isArray(gameState.player.hands) &&
    gameState.player.hands.length === 1 &&
    Array.isArray(gameState.player.hands[0]?.cards) &&
    gameState.player.hands[0].cards.length === 2 &&
    gameState.player.hands[0].cards[0]?.value === gameState.player.hands[0].cards[1]?.value &&
    gameState.player.balance >= gameState.player.bet &&
    phase === 'player-turn'
  );

  if (!mode) {
    return (
      <div className="mode-select-modal">
        <img src={logo} alt="Logo" className="logo logo-large" />
        <h2>¿Cómo quieres jugar?</h2>
        <button className="mode-btn" onClick={() => setMode('solo')}>Solo</button>
        <button className="mode-btn" onClick={() => setMode('multi')}>Multiplayer</button>
      </div>
    );
  }

  if (mode === 'multi') {
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
                maxLength={6}
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
            <button className="mode-btn" onClick={() => setMode(null)}>Volver</button>
          </div>
        </div>
      );
    } else {
      if (status !== 'multi-started') {
        return (
          <div className="main-layout">
            <div className="center-panel">
              <img src={logo} alt="Logo" className="logo" />
              <h2>Sala: <span style={{ color: '#ffd54f' }}>{joinedRoom}</span></h2>
              <p>Comparte este código para que otros se unan.</p>
              <h3>Jugadores en la sala:</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {players.map(p => (
                  <li key={p.id} style={{ fontWeight: p.id === socket.id ? 'bold' : 'normal' }}>
                    {p.name} {p.id === socket.id ? '(Tú)' : ''} {isCreator && p.id === socket.id ? '(Creador)' : ''}
                  </li>
                ))}
              </ul>
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
              <button className="mode-btn" onClick={() => setMode(null)}>Volver</button>
            </div>
          </div>
        );
      } else {
        if (multiGameState) {
          const gs = multiGameState;
          const isMyTurn = gs.phase === 'playing' && gs.players[gs.turn]?.id === socketId;
          const isResult = gs.phase === 'result';
          const myPlayer = gs.players.find(p => p.id === socketId);
          
          // Transform game state data for CasinoTable component
          const casinoPlayers = gs.players.map((p, idx) => ({
            id: p.id,
            name: p.name,
            position: idx,
            cards: p.hand || [],
            total: p.total || 0,
            bet: p.bet || 0,
            balance: p.balance || 1000,
            status: p.isBust ? 'bust' : p.isBlackjack ? 'blackjack' : p.isStand ? 'stand' : 'playing',
            isCurrentPlayer: p.id === socketId
          }));

          const casinoDealer = {
            hand: gs.dealer?.hand || [],
            total: gs.dealer?.total || 0
          };

          return (
            <div className="casino-layout">
              {/* Top bar with room info and controls */}
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
                  {/* Control buttons */}
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
                    
                    <button className="control-btn menu-btn" onClick={() => setMode(null)}>
                      Menu
                    </button>
                  </div>
                </div>
              </div>

              {/* Main casino table area */}
              <CasinoTable
                players={casinoPlayers}
                dealer={casinoDealer}
                gamePhase={gs.phase || 'waiting'}
                currentTurn={gs.turn}
              />

              {/* Bottom status bar */}
              <div className="casino-footer">
                {/* Betting Panel - shown during betting phase */}
                {gs.phase === 'betting' && myPlayer && (
                  <div className="betting-section">
                    <BettingPanel
                      balance={multiBalance}
                      currentBet={multiBet}
                      onChipClick={handleMultiChip}
                      onAllIn={handleMultiAllIn}
                      onClearBet={handleMultiClearBet}
                      onPlaceBet={handleMultiPlaceBet}
                      disabled={myPlayer.hasPlacedBet}
                      showPlaceBetButton={true}
                      noChipsMessage={multiBalance === 0 ? 'No more chips!' : ''}
                    />
                    {bettingError && (
                      <div className="error-msg" style={{ marginTop: '1rem' }}>
                        {bettingError}
                      </div>
                    )}
                    {myPlayer.hasPlacedBet && (
                      <div className="status-msg" style={{ marginTop: '1rem' }}>
                        Bet placed! Waiting for other players...
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons for current player */}
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

                {/* Waiting message */}
                {gs.phase === 'playing' && !isMyTurn && (
                  <div className="status-msg">
                    Waiting for <b>{gs.players[gs.turn]?.name}</b>'s turn...
                  </div>
                )}

                {/* Dealing phase message */}
                {gs.phase === 'dealing' && (
                  <div className="status-msg">
                    Dealing cards...
                  </div>
                )}

                {/* Results */}
                {isResult && (
                  <div className="results-summary">
                    <span>Round Complete - </span>
                    {gs.players.map((p, idx) => (
                      <span key={p.id} style={{ marginRight: '1rem' }}>
                        {p.name}: {gs.results && gs.results[p.id] ? gs.results[p.id].status : 'unknown'} 
                        {gs.results && gs.results[p.id] && gs.results[p.id].payout > 0 && ` (+${gs.results[p.id].payout})`}
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

  let renderError = null;
  let mainContent = null;
  try {
    mainContent = (
      <div className="main-layout">
        <div className="left-panel">
          <div className="game-title">BLACKJACK</div>
        </div>
        <div className="center-panel">
          {!nameSaved ? (
            <div className="name-modal">
              <img src={logo} alt="Logo" className="logo logo-large" />
              <input
                className="player-input"
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                autoFocus
                disabled={betLocked}
              />
              <button
                className="start-btn"
                onClick={() => {
                  if (playerName.trim().length > 0) setNameSaved(true);
                  else setError('Please enter your name');
                }}
                disabled={betLocked || playerName.trim().length === 0}
              >
                Save Name
              </button>
            </div>
          ) : (
            <>
              <img src={logo} alt="Logo" className="logo" />
              <div className="dealer-label">Dealer</div>
              <div className="hand-row dealer-cards">
                {Array.isArray(gameState?.dealer?.hand?.cards) &&
                  gameState.dealer.hand.cards.length > 0 &&
                  gameState.dealer.hand.cards.map((card, idx) => renderCard(card, idx, true))
                }
              </div>
              {gameState?.dealer?.hand?.total !== undefined ? (
                <div className="hand-total">Total: {gameState.dealer.hand.total}</div>
              ) : null}
              <div className="vs-separator">VS</div>
              <div className="player-label">{Array.isArray(gameState?.player?.hands) && gameState.player.hands.length > 0 && gameState.player.name}</div>
              <div className="hand-row player-cards">
                {Array.isArray(gameState?.player?.hands) &&
                  gameState.player.hands.length > 0 &&
                  Array.isArray(gameState.player.hands[0]?.cards) &&
                  gameState.player.hands[0].cards.map((card, idx) => renderCard(card, idx, false))}
              </div>
              {Array.isArray(gameState?.player?.hands) &&
                gameState.player.hands.length > 0 &&
                typeof gameState.player.hands[0].total !== 'undefined' && (
                  <div className="hand-total">Total: {gameState.player.hands[0].total}</div>
                )
              }
              <div className="action-btn-row">
                {status === 'playing' && (
                  <>
                    <button className="action-btn stand-btn" onClick={handleStand}>STAND</button>
                    <button className="action-btn hit-btn" onClick={handleHit}>HIT</button>
                    {doubleDownAvailable && (
                      <button className="action-btn double-down-btn" onClick={handleDoubleDown}>DOUBLE</button>
                    )}
                    {splitAvailable && (
                      <button className="action-btn split-btn" onClick={handleSplit}>SPLIT</button>
                    )}
                  </>
                )}
              </div>
              <div className="status-msg">
                {status === 'blackjack' && <span>Blackjack! 🎉</span>}
                {status === 'bust' && <span>Bust! 💥</span>}
                {status === 'win' && <span>You Win! 🏆</span>}
                {status === 'lose' && <span>You Lose! 😢</span>}
                {status === 'draw' && <span>Draw! 🤝</span>}
              </div>
              {['win', 'lose', 'draw', 'blackjack', 'bust'].includes(status) && (
                <div className="post-round-btn-row">
                  <button
                    className="post-round-btn next-round-btn"
                    onClick={() => {
                      setGameState(null);
                      setStatus('idle');
                      setBet(0);
                      setBetLocked(false);
                      setNextRoundReady(false);
                      setError('');
                    }}
                  >
                    Next Round
                  </button>
                  <button
                    className="post-round-btn quit-btn"
                    onClick={handleQuit}
                  >
                    Quit
                  </button>
                </div>
              )}
            </>
          )}
          {nameSaved && !gameState && (
            <div className="place-bet-msg">
              PLACE BET <span className="arrow-right">→</span>
            </div>
          )}
        </div>
        <div className="right-panel">
          <button className="exit-btn-top" onClick={handleQuit}>Exit</button>
          <div className="chips-label">CHIPS: {balance}</div>
          <div className="betting-panel">
            {CHIP_VALUES.map((v, i) => (
              <button
                key={v}
                className={`chip chip-${v}`}
                disabled={betLocked || bet + v > balance}
                onClick={() => handleChip(v)}
              >
                {v}
              </button>
            ))}
            <button className="chip all-in" disabled={betLocked || balance === 0} onClick={handleMaxBet}>ALL IN</button>
            <div className="bet-label">BET: {bet}</div>
            <button
              className="clear-bet-btn"
              onClick={handleClearBet}
              disabled={betLocked || bet === 0}
            >
              Clear Bet
            </button>
            {nameSaved && !gameState && (
              <button
                className="place-bet-btn"
                onClick={placeBet}
                disabled={betLocked || bet === 0 || bet > balance || !canBet}
              >
                Place Bet
              </button>
            )}
            {noChipsMsg && <div className="no-chips-msg">{noChipsMsg}</div>}
          </div>
        </div>
      </div>
    );
  } catch (err) {
    renderError = err;
  }
  if (renderError) {
    return <div style={{ color: 'red', padding: '2em', textAlign: 'center' }}>An error occurred: {renderError.message}</div>;
  }
  if (!mainContent) {
    return <div style={{ color: '#ffd54f', padding: '2em', textAlign: 'center' }}>Loading...</div>;
  }
  return mainContent;
}

export default App
