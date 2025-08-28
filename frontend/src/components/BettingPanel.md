# Enhanced BettingPanel Component

## Overview

The enhanced BettingPanel component provides a comprehensive betting interface for the multiplayer Blackjack game. It includes all the features required by the betting system specification, with real-time updates, error handling, and visual feedback.

## Features Implemented

### ✅ Core Requirements (5.1-5.8)

1. **Predefined Chip Values (5.1)**: Shows clickable chips with values 25, 50, 100, 250, 500
2. **Additive Betting (5.2)**: Clicking chips adds value to current bet
3. **Real-time Display (5.3)**: Bet amount updates immediately with animations
4. **All-In Functionality (5.4)**: Dedicated All-In button for maximum bet
5. **Clear Bet Functionality (5.5)**: Clear Bet button to reset current bet
6. **Bet Confirmation (5.6)**: Visual feedback when bet is confirmed
7. **Real-time Sync (5.7)**: Ready for multiplayer bet synchronization
8. **Smart Chip Disabling (5.8)**: Chips disabled when insufficient balance

### ✅ Enhanced Features

- **Dynamic Chip Generation**: Automatically creates chips for large balances
- **Betting Timer**: Shows countdown for betting phase
- **Connection Status**: Visual indicator for online/offline status
- **Error Handling**: Displays error messages and retry functionality
- **Minimum Bet Validation**: Warns when bet is below minimum
- **Maximum Bet Limits**: Respects maximum bet constraints
- **Responsive Design**: Works on all screen sizes
- **Accessibility**: Proper tooltips and ARIA labels

## Props API

```jsx
<BettingPanel
  // Core betting state
  balance={1000}                    // Player's available balance
  currentBet={0}                    // Current bet amount
  
  // Event handlers
  onChipClick={(value) => {}}       // Called when chip is clicked
  onAllIn={() => {}}                // Called when All-In is clicked
  onClearBet={() => {}}             // Called when Clear Bet is clicked
  onPlaceBet={() => {}}             // Called when Place Bet is clicked
  
  // Betting phase configuration
  bettingTimeLeft={30000}           // Time left in milliseconds
  minBet={25}                       // Minimum bet amount
  maxBet={500}                      // Maximum bet amount (null for no limit)
  
  // UI state
  disabled={false}                  // Disable all controls
  showPlaceBetButton={true}         // Show/hide Place Bet button
  betConfirmed={false}              // Show bet confirmation state
  isConnected={true}                // Connection status
  
  // Error handling
  lastBetError={null}               // Error message to display
  onRetryBet={null}                 // Retry function for failed bets
  
  // Messages
  noChipsMessage=""                 // Custom message when no chips available
/>
```

## Usage Examples

### Basic Usage

```jsx
import { BettingPanel } from './components';

function GameComponent() {
  const [balance, setBalance] = useState(1000);
  const [currentBet, setCurrentBet] = useState(0);

  const handleChipClick = (value) => {
    setCurrentBet(prev => prev + value);
  };

  const handleAllIn = () => {
    setCurrentBet(balance);
  };

  const handleClearBet = () => {
    setCurrentBet(0);
  };

  return (
    <BettingPanel
      balance={balance}
      currentBet={currentBet}
      onChipClick={handleChipClick}
      onAllIn={handleAllIn}
      onClearBet={handleClearBet}
    />
  );
}
```

### With Betting Timer

```jsx
<BettingPanel
  balance={balance}
  currentBet={currentBet}
  bettingTimeLeft={bettingTimeLeft}
  onChipClick={handleChipClick}
  onAllIn={handleAllIn}
  onClearBet={handleClearBet}
  onPlaceBet={handlePlaceBet}
  showPlaceBetButton={true}
/>
```

### With Error Handling

```jsx
<BettingPanel
  balance={balance}
  currentBet={currentBet}
  onChipClick={handleChipClick}
  onAllIn={handleAllIn}
  onClearBet={handleClearBet}
  lastBetError={lastBetError}
  onRetryBet={handleRetryBet}
  isConnected={isConnected}
/>
```

## Visual States

### Normal State
- Clean interface with available chips
- Balance and bet clearly displayed
- All controls enabled

### Betting Confirmed State
- Green border and background tint
- Checkmark next to bet amount
- "Bet Placed" button text
- Controls disabled

### Disconnected State
- Red border and brown background tint
- "(OFFLINE)" indicator next to balance
- All controls disabled
- Tooltips explain disconnection

### Error State
- Error message displayed in red box
- Retry button available if onRetryBet provided
- Retry counter shows attempt number

### Low Balance State
- Chips automatically disabled when insufficient balance
- Tooltips explain why chips are disabled
- Warning message for bets below minimum

## Animations

- **Bet Update**: Scale animation when bet amount changes
- **Bet Confirmation**: Pulse animation for confirmation checkmark
- **Chip Hover**: Scale and shadow effects on hover
- **Smooth Transitions**: All state changes animated smoothly

## Responsive Behavior

### Desktop (>900px)
- Full-size chips (45px)
- Complete labels and spacing
- All features visible

### Tablet (600-900px)
- Medium chips (35px)
- Reduced spacing
- Smaller fonts

### Mobile (<600px)
- Small chips (30px)
- Compact layout
- Essential features only

## Accessibility

- **Keyboard Navigation**: All buttons focusable and keyboard accessible
- **Screen Readers**: Proper ARIA labels and descriptions
- **High Contrast**: Clear visual distinctions between states
- **Tooltips**: Explanatory text for disabled states
- **Focus Indicators**: Clear focus outlines for keyboard users

## Integration with Backend

The component is designed to work with the enhanced betting system backend:

```jsx
// Socket event integration example
useEffect(() => {
  socket.on('betConfirmed', ({ newBalance, betAmount }) => {
    setBalance(newBalance);
    setBetConfirmed(true);
  });

  socket.on('betError', ({ error }) => {
    setLastBetError(error);
  });

  socket.on('bettingPhaseStart', ({ timeLeft }) => {
    setBettingTimeLeft(timeLeft);
    setBetConfirmed(false);
  });
}, []);

const handlePlaceBet = () => {
  socket.emit('placeBet', { 
    roomCode, 
    amount: currentBet 
  });
};
```

## Testing

The component includes comprehensive prop validation and error boundaries. For testing, use the included `BettingPanelDemo` component which demonstrates all features:

```jsx
import { BettingPanelDemo } from './components';

// Render demo to test all features
<BettingPanelDemo />
```

## Performance Optimizations

- **React.memo**: Component memoized to prevent unnecessary re-renders
- **useCallback**: Event handlers memoized for stable references
- **useMemo**: Expensive calculations cached (chip generation, validation)
- **Efficient Updates**: Only re-renders when relevant props change

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## File Structure

```
frontend/src/components/
├── BettingPanel.jsx          # Main component
├── BettingPanel.css          # Styles and animations
├── BettingPanelDemo.jsx      # Demo component
└── BettingPanel.md           # This documentation
```