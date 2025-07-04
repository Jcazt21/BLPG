import { useState, useEffect } from 'react'
import './App.css'
import PlayingCard from './PlayingCard'
import './PlayingCard.css'
import logo from './assets/logo.png'

const API_URL = 'http://172.16.50.34:5185/game'
const START_BALANCE = 1000
const CHIP_VALUES = [25, 50, 100, 250, 500, 1000]

function App() {
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

  // Add error boundary for render
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
