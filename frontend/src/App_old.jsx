import { useState, useEffect } from 'react'
import './App.css'
import PlayingCard from './PlayingCard'
import './PlayingCard.css'
// BETTING SYSTEM - TEMPORARILY DISABLED
import { GameModeSelector, BlackjackGame } from './components'
// import { CasinoTable, BettingPanel } from './components'
import logo from './assets/logo.png'
import { io } from 'socket.io-client';
import { ConfigManager } from './config/environment';

// Load and validate configuration
const config = ConfigManager.validate();
const API_URL = config.API_URL;
const WS_URL = config.WS_URL;
const socket = io(WS_URL, { autoConnect: false });

// BETTING SYSTEM - TEMPORARILY DISABLED
// const START_BALANCE = 1000
// const CHIP_VALUES = [25, 50, 100, 250, 500, 1000]

function App() {
  const [mode, setMode] = useState(null); // 'blackjack' | 'crazy8'
  // Main app only needs to track the current game mode

  if (!mode) {
    return <GameModeSelector onModeSelect={setMode} />;
  }

  // Handle different game modes
  if (mode === 'blackjack') {
    return <BlackjackGame onBackToMenu={() => setMode(null)} />;
  }

  if (mode === 'crazy8') {
    // TODO: Implement Crazy8Game component
    return (
      <div className="coming-soon-screen">
        <h1>Crazy 8 - Coming Soon!</h1>
        <p>This game mode is under development.</p>
        <button onClick={() => setMode(null)}>Back to Menu</button>
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
            <button className="mode-btn" onClick={() => setMode(null)}>Volver</button>
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
                <button className="mode-btn" onClick={() => setMode(null)}>Volver</button>
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

          // Transform game state data for CasinoTable component
          const casinoPlayers = gs.players.map((p, idx) => ({
            id: p.id,
            name: p.name,
            position: idx,
            cards: p.hand || [],
            total: p.total || 0,
            // BETTING SYSTEM - TEMPORARILY DISABLED
            // bet: p.bet || 0,
            // balance: p.balance || 1000,
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
                {/* BETTING SYSTEM - TEMPORARILY DISABLED */}
                {/* Betting Panel - shown during betting phase */}
                {/* {gs.phase === 'betting' && myPlayer && (
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
                )} */}

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
                        {/* BETTING SYSTEM - TEMPORARILY DISABLED */}
                        {/* {gs.results && gs.results[p.id] && gs.results[p.id].payout > 0 && ` (+${gs.results[p.id].payout})`} */}
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
                // disabled={betLocked}
              />
              <button
                className="start-btn"
                onClick={() => {
                  if (playerName.trim().length > 0) setNameSaved(true);
                  else setError('Please enter your name');
                }}
                disabled={playerName.trim().length === 0}
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
          {/* BETTING SYSTEM - TEMPORARILY DISABLED */}
          {/* {nameSaved && !gameState && (
            <div className="place-bet-msg">
              PLACE BET <span className="arrow-right">→</span>
            </div>
          )} */}
        </div>
        <div className="right-panel">
          <button className="exit-btn-top" onClick={handleQuit}>Exit</button>
          {/* BETTING SYSTEM - TEMPORARILY DISABLED */}
          {/* <div className="chips-label">CHIPS: {balance}</div>
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
          </div> */}
          
          {/* Simplified start button without betting */}
          {nameSaved && !gameState && (
            <button
              className="place-bet-btn"
              onClick={placeBet}
              style={{ marginTop: '2rem' }}
            >
              Start Game
            </button>
          )}
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
