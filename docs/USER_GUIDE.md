# User Guide - Blackjack Game

> **📖 Related Documentation:**
> - [Main README](README.md) - Project overview and quick start
> - [Setup Guide](SETUP.md) - Installation and getting started
> - [Game Logic](GAME_LOGIC.md) - Blackjack rules and implementation
> - [API Documentation](API.md) - Technical API reference
> - [WebSocket Events](WEBSOCKET.md) - Multiplayer communication details
> - [Architecture Overview](ARCHITECTURE.md) - Technical system design
> - [Development Guide](DEVELOPMENT.md) - Code structure and workflow
> - [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions

Welcome to the comprehensive user guide for our full-stack Blackjack game! This guide will walk you through everything you need to know to play both single-player and multiplayer modes.

## Table of Contents

- [Getting Started](#getting-started)
  - [Accessing the Game](#accessing-the-game)
  - [System Requirements](#system-requirements)
- [Game Modes](#game-modes)
  - [Solo Mode](#solo-mode)
  - [Multiplayer Mode](#multiplayer-mode)
- [Single-Player Mode](#single-player-mode)
  - [Starting a Single-Player Game](#starting-a-single-player-game)
  - [Single-Player Game Controls](#single-player-game-controls)
  - [Single-Player Game Flow](#single-player-game-flow)
  - [After Each Round](#after-each-round)
- [Multiplayer Mode](#multiplayer-mode)
  - [Creating a Room](#creating-a-room)
  - [Joining a Room](#joining-a-room)
  - [Multiplayer Gameplay](#multiplayer-gameplay)
  - [Multiplayer Room Management](#multiplayer-room-management)
- [Game Controls](#game-controls)
  - [Interface Layout](#interface-layout)
  - [Button Functions](#button-functions)
- [Betting System](#betting-system)
  - [Starting Balance](#starting-balance)
  - [Chip Denominations](#chip-denominations)
  - [Betting Rules](#betting-rules)
  - [Payout System](#payout-system)
- [Scoring and Rules](#scoring-and-rules)
  - [Basic Blackjack Rules](#basic-blackjack-rules)
  - [Winning Conditions](#winning-conditions)
  - [Dealer Rules](#dealer-rules)
- [Advanced Features](#advanced-features)
  - [Double Down](#double-down)
  - [Split Pairs](#split-pairs)
- [Tips and Strategies](#tips-and-strategies)
  - [Basic Strategy](#basic-strategy)
  - [Money Management](#money-management)
  - [Multiplayer Etiquette](#multiplayer-etiquette)
- [Troubleshooting](#troubleshooting)
  - [Common Issues](#common-issues)
  - [Performance Issues](#performance-issues)
  - [Browser Compatibility](#browser-compatibility)
  - [Getting Help](#getting-help)
- [Quick Reference](#quick-reference)

## Getting Started

### Accessing the Game

1. **Open your web browser** and navigate to the game URL (typically `http://localhost:5173` for development)
2. **Choose your game mode** from the main menu:
   - **Solo**: Play against the computer dealer
   - **Multiplayer**: Play with other players in real-time

### System Requirements

- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **JavaScript enabled**
- **Stable internet connection** (especially for multiplayer)
- **Screen resolution**: Optimized for desktop and tablet viewing

## Game Modes

### Solo Mode
- Play against the computer dealer
- Control your own pace
- Practice blackjack strategies
- Session-based gameplay with persistent balance

### Multiplayer Mode
- Play with other players in real-time
- Turn-based gameplay
- Room-based system with shareable codes
- Social gaming experience

## Single-Player Mode

### Starting a Single-Player Game

#### Step 1: Enter Your Name
1. Click **"Solo"** from the main menu
2. Enter your player name in the text field
3. Click **"Save Name"** to proceed

#### Step 2: Place Your Bet
1. **Starting Balance**: You begin with 1,000 chips
2. **Select Chip Values**: Click on chip buttons to add to your bet
   - Available chips: 25, 50, 100, 250, 500, 1000
3. **Betting Options**:
   - **Individual Chips**: Click any chip value to add it to your bet
   - **All In**: Bet your entire balance
   - **Clear Bet**: Reset your bet to zero
4. **Place Bet**: Click "Place Bet" when ready

#### Step 3: Play Your Hand
Once the game starts:
1. **Cards are dealt**: You receive 2 face-up cards, dealer gets 1 face-up and 1 face-down
2. **Check for Blackjack**: If you have 21 with your first 2 cards, you win automatically!
3. **Make your decision** using the action buttons

### Single-Player Game Controls

#### Primary Actions
- **HIT**: Take another card to improve your hand
- **STAND**: Keep your current hand and end your turn
- **DOUBLE**: Double your bet, take exactly one more card, then automatically stand
- **SPLIT**: Split matching pairs into two separate hands (when available)

#### Action Availability
- **HIT/STAND**: Always available during your turn
- **DOUBLE**: Only available with your first 2 cards and sufficient balance
- **SPLIT**: Only available when your first 2 cards have the same value

### Single-Player Game Flow

1. **Betting Phase**: Place your bet
2. **Dealing Phase**: Cards are dealt to you and the dealer
3. **Player Turn**: Make decisions (hit, stand, double, split)
4. **Dealer Turn**: Dealer plays according to house rules
5. **Results**: Compare hands and determine winner
6. **Next Round**: Choose to play again or quit

### After Each Round

**Next Round Options**:
- **Next Round**: Start a new game with the same settings
- **Quit**: Return to the main menu

**Balance Management**:
- Your balance carries over between rounds
- Winnings are automatically added to your balance
- Game ends when you run out of chips

## Multiplayer Mode

> **🔗 Related Documentation:**
> - For technical details on multiplayer communication, see [WebSocket Events](WEBSOCKET.md)
> - For implementation details, see [Game Logic](GAME_LOGIC.md#multiplayer-mode)
> - For troubleshooting connection issues, see [Troubleshooting Guide](TROUBLESHOOTING.md#connectivity-issues)

### Creating a Room

#### Step 1: Set Up Your Room
1. Click **"Multiplayer"** from the main menu
2. Enter your player name (up to 20 characters)
3. Click **"Crear sala"** (Create Room)
4. **Room Code**: You'll receive a 6-character code (e.g., "ABC123")
5. **Share the Code**: Give this code to other players to join

#### Step 2: Wait for Players
- **Player List**: See all players in your room
- **Creator Status**: You'll be marked as the room creator
- **Start Game**: Only you can start the game when ready

### Joining a Room

#### Step 1: Join an Existing Room
1. Click **"Multiplayer"** from the main menu
2. Enter your player name
3. Enter the **6-character room code** (case-insensitive)
4. Click **"Unirse a sala"** (Join Room)

#### Step 2: Wait for Game Start
- **Player List**: See all players in the room
- **Wait**: The room creator will start the game

### Multiplayer Gameplay

#### Turn-Based System
- **Turn Order**: Players take turns in the order they joined
- **Current Player**: Highlighted in yellow with "← Turno" indicator
- **Waiting**: Other players wait for their turn

#### Your Turn Actions
When it's your turn:
1. **Pedir carta** (Hit): Take another card
2. **Plantarse** (Stand): End your turn with current hand
3. **Turn Timer**: No time limit, but be considerate of other players

#### Game Phases

**Phase 1: Setup**
- All players receive 2 cards
- Dealer receives 2 cards (both visible in multiplayer)
- Turn order is established

**Phase 2: Player Turns**
- Each player takes their turn in order
- Players can hit or stand
- Busted players are marked with 💥
- Players who stand are marked as "(Plantado)"

**Phase 3: Results**
- All hands are compared against the dealer
- Results are displayed with icons:
  - 🏆 Win
  - ❌ Loss
  - 🤝 Draw/Push
  - 💥 Bust
  - 🂡 Blackjack

**Phase 4: Next Round**
- Room creator can start the next round
- All players remain in the room for continuous play

### Multiplayer Room Management

#### Room Features
- **Room Code**: 6-character alphanumeric code
- **Player Limit**: No explicit limit (recommended maximum: 6 players)
- **Persistent Rooms**: Rooms stay active until all players leave
- **Creator Privileges**: Only the creator can start/restart games

#### Leaving a Room
- **Leave Room**: Click "Salir de la sala" to leave
- **Automatic Cleanup**: Empty rooms are automatically deleted
- **Disconnection**: Players are automatically removed if they disconnect

## Game Controls

### Interface Layout

#### Left Panel
- **Game Title**: "BLACKJACK" branding
- **Navigation**: Mode selection and game controls

#### Center Panel
- **Dealer Area**: Dealer's cards and total
- **VS Separator**: Visual divider between dealer and player
- **Player Area**: Your cards and total
- **Action Buttons**: Game control buttons
- **Status Messages**: Game results and notifications

#### Right Panel (Single-Player Only)
- **Chip Balance**: Current chip count
- **Betting Chips**: Clickable chip values
- **Bet Display**: Current bet amount
- **Betting Controls**: Clear bet, place bet, all-in options

### Button Functions

#### Game Action Buttons
- **HIT**: Request another card
- **STAND**: End your turn
- **DOUBLE**: Double bet and take one card
- **SPLIT**: Split pairs into two hands

#### Betting Buttons (Single-Player)
- **Chip Values**: 25, 50, 100, 250, 500, 1000
- **ALL IN**: Bet entire balance
- **Clear Bet**: Reset bet to zero
- **Place Bet**: Confirm and start game

#### Navigation Buttons
- **Exit**: Return to main menu
- **Next Round**: Start new game
- **Quit**: End current session
- **Volver**: Go back to previous screen

## Betting System

### Starting Balance
- **Default**: 1,000 chips for all players
- **Persistent**: Balance carries between single-player rounds
- **Fixed**: Multiplayer uses fixed 100-chip bets

### Chip Denominations
Available betting chips in single-player mode:
- **25 chips**: Small bet increment
- **50 chips**: Medium bet increment  
- **100 chips**: Standard bet amount
- **250 chips**: Large bet increment
- **500 chips**: High stakes betting
- **1000 chips**: Maximum single chip value

### Betting Rules

#### Single-Player Betting
- **Minimum Bet**: 1 chip
- **Maximum Bet**: Your current balance
- **Bet Validation**: Cannot bet more than you have
- **Bet Locking**: Bet cannot be changed once game starts

#### Multiplayer Betting
- **Fixed Bet**: 100 chips per game
- **Fixed Balance**: 1,000 chips per player
- **No Betting Phase**: Bets are automatic

### Payout System

#### Payout Multipliers
- **Blackjack**: 2.5x your bet (3:2 payout)
- **Regular Win**: 2x your bet (1:1 payout)
- **Push/Draw**: 1x your bet (bet returned)
- **Loss**: 0x your bet (lose your bet)

#### Payout Examples
If you bet 100 chips:
- **Blackjack Win**: Receive 250 chips (100 bet + 150 winnings)
- **Regular Win**: Receive 200 chips (100 bet + 100 winnings)
- **Push**: Receive 100 chips (bet returned)
- **Loss**: Receive 0 chips (lose the 100 bet)

## Scoring and Rules

> **🔗 Related Documentation:**
> - For detailed game logic implementation, see [Game Logic](GAME_LOGIC.md)
> - For technical implementation details, see [Architecture Overview](ARCHITECTURE.md)
> - For API endpoints related to game actions, see [API Documentation](API.md)

### Basic Blackjack Rules

#### Objective
Get a hand value as close to 21 as possible without going over, while beating the dealer's hand.

#### Card Values
- **Number Cards (2-10)**: Face value
- **Face Cards (J, Q, K)**: Worth 10 points each
- **Aces**: Worth 11 points, automatically convert to 1 when needed to prevent busting

#### Hand Calculation
The game automatically calculates your hand total:
- **Soft Hand**: Contains an Ace counted as 11
- **Hard Hand**: No Aces or all Aces counted as 1
- **Automatic Ace Conversion**: Aces change from 11 to 1 to prevent busting

### Winning Conditions

#### Player Wins
1. **Blackjack**: 21 with exactly 2 cards (Ace + 10-value card)
2. **Higher Total**: Hand closer to 21 than dealer without busting
3. **Dealer Bust**: Dealer's hand exceeds 21

#### Player Loses
1. **Player Bust**: Your hand exceeds 21
2. **Lower Total**: Dealer's hand is closer to 21
3. **Dealer Blackjack**: Dealer has blackjack and you don't

#### Push/Draw
- **Same Total**: You and dealer have the same hand value
- **Both Blackjack**: Both you and dealer have blackjack

### Dealer Rules
- **Must Hit**: Dealer must take cards until reaching 17 or higher
- **Must Stand**: Dealer must stand on 17 or higher
- **No Choices**: Dealer has no strategic decisions

## Advanced Features

### Double Down

#### When Available
- **First 2 Cards Only**: Must have exactly 2 cards
- **Sufficient Balance**: Must have enough chips to double your bet
- **Single-Player Only**: Not available in multiplayer mode

#### How It Works
1. **Double Your Bet**: Your bet is automatically doubled
2. **One Card Only**: You receive exactly one more card
3. **Automatic Stand**: You cannot take any more cards
4. **Higher Risk/Reward**: Double the potential win or loss

#### Strategy Tips
- **Good Totals**: Consider doubling on 10 or 11
- **Dealer's Weak Card**: More attractive when dealer shows 4, 5, or 6
- **Avoid Soft Hands**: Generally not recommended with Ace-low combinations

### Split Pairs

#### When Available
- **Matching Values**: First 2 cards must have same value
- **10-Value Cards**: 10, J, Q, K all count as equivalent
- **Sufficient Balance**: Must have enough chips for second bet
- **Single-Player Only**: Not available in multiplayer mode

#### How It Works
1. **Create Two Hands**: Each original card becomes the start of a new hand
2. **Second Bet**: An additional bet equal to your original bet is placed
3. **New Cards**: Each hand receives one new card
4. **Play Separately**: Each hand is played independently
5. **Separate Results**: Each hand wins or loses individually

#### Strategy Tips
- **Always Split Aces**: Aces give you two chances at blackjack
- **Always Split 8s**: Avoids the weak total of 16
- **Never Split 10s**: 20 is already a strong hand
- **Consider Dealer's Card**: More attractive when dealer shows weak cards

## Tips and Strategies

### Basic Strategy

#### When to Hit
- **Hard totals 8 or less**: Always hit
- **Hard totals 12-16**: Hit if dealer shows 7 or higher
- **Soft totals 17 or less**: Usually hit

#### When to Stand
- **Hard totals 17 or higher**: Always stand
- **Hard totals 12-16**: Stand if dealer shows 6 or lower
- **Soft 18 or higher**: Usually stand

#### When to Double Down
- **Hard 10 or 11**: Double if dealer shows 9 or lower
- **Hard 9**: Double if dealer shows 3-6
- **Soft hands**: Consider doubling with Ace-2 through Ace-7

### Money Management

#### Bankroll Management
- **Set Limits**: Decide how much you're willing to lose
- **Bet Sizing**: Don't bet more than 5% of your balance per hand
- **Win Goals**: Consider stopping when you double your starting balance
- **Loss Limits**: Stop playing if you lose 50% of your starting balance

#### Single-Player Tips
- **Start Small**: Begin with minimum bets to learn the game
- **Increase Gradually**: Raise bets only when you're winning
- **Take Breaks**: Step away if you're on a losing streak

### Multiplayer Etiquette

#### Be Considerate
- **Take Your Turn Promptly**: Don't make other players wait unnecessarily
- **Stay Focused**: Pay attention when it's your turn
- **Be Patient**: Wait for your turn without rushing others

#### Communication
- **Room Codes**: Share room codes only with intended players
- **Player Names**: Choose appropriate, family-friendly names
- **Good Sportsmanship**: Congratulate winners and be gracious in defeat

## Troubleshooting

> **🔗 Related Documentation:**
> - For detailed troubleshooting information, see [Troubleshooting Guide](TROUBLESHOOTING.md)
> - For technical details on connectivity, see [WebSocket Events](WEBSOCKET.md#connection-events)
> - For setup instructions, see [Setup Guide](SETUP.md)

### Common Issues

#### Connection Problems
**Symptoms**: Cannot connect to game, multiplayer rooms not working
**Solutions**:
- Check your internet connection
- Refresh the browser page
- Try a different browser
- Clear browser cache and cookies

#### Game Not Loading
**Symptoms**: Blank screen, loading indefinitely
**Solutions**:
- Ensure JavaScript is enabled
- Disable browser extensions temporarily
- Try an incognito/private browsing window
- Check if the server is running (development mode)

#### Betting Issues
**Symptoms**: Cannot place bets, chips not responding
**Solutions**:
- Ensure you have sufficient balance
- Check that the game is in the correct phase
- Try clearing your bet and starting over
- Refresh the page if buttons are unresponsive

#### Multiplayer Room Issues
**Symptoms**: Cannot create/join rooms, players not appearing
**Solutions**:
- Verify the room code is correct (6 characters)
- Ensure all players have stable internet connections
- Try creating a new room if joining fails
- Check that player names are entered correctly

### Performance Issues

#### Slow Loading
**Causes**: Large images, slow internet, server issues
**Solutions**:
- Use a faster internet connection
- Close other browser tabs
- Clear browser cache
- Try during off-peak hours

#### Card Animation Problems
**Symptoms**: Cards not flipping, visual glitches
**Solutions**:
- Update your browser to the latest version
- Disable hardware acceleration in browser settings
- Try a different browser
- Reduce browser zoom level to 100%

### Browser Compatibility

#### Recommended Browsers
- **Chrome**: Version 90 or higher
- **Firefox**: Version 88 or higher
- **Safari**: Version 14 or higher
- **Edge**: Version 90 or higher

#### Mobile Devices
- **Responsive Design**: Game adapts to different screen sizes
- **Touch Controls**: All buttons work with touch input
- **Portrait/Landscape**: Both orientations supported
- **Performance**: May be slower on older mobile devices

### Getting Help

#### Self-Help Resources
1. **Refresh the Page**: Solves many temporary issues
2. **Check Browser Console**: Look for error messages (F12 key)
3. **Try Different Browser**: Isolate browser-specific issues
4. **Clear Cache**: Remove stored data that might be corrupted

#### When to Seek Help
- **Persistent Connection Issues**: Cannot connect after multiple attempts
- **Game Logic Errors**: Incorrect scoring or rule enforcement
- **Data Loss**: Lost progress or balance unexpectedly
- **Security Concerns**: Suspicious behavior or unauthorized access

---

## Quick Reference

### Single-Player Quick Start
1. Choose "Solo" mode
2. Enter your name and save
3. Place bet using chip buttons
4. Click "Place Bet" to start
5. Use HIT/STAND buttons to play
6. Choose "Next Round" or "Quit" when finished

### Multiplayer Quick Start
1. Choose "Multiplayer" mode
2. Enter your name
3. Create room or join with code
4. Wait for creator to start game
5. Take turns using HIT/STAND buttons
6. Wait for results and next round

### Key Shortcuts
- **Enter**: Confirm name input
- **Space**: Hit (when it's your turn)
- **Escape**: Stand (when it's your turn)
- **R**: Restart/Next Round (when available)

Enjoy playing Blackjack! Remember to play responsibly and have fun! 🎰🃏