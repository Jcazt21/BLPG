# Betting System User Guide

## Overview

The Enhanced Betting System provides a comprehensive gambling experience for multiplayer games with real-time betting, balance management, and payout calculations. This guide covers all user-facing features and functionality.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Placing Bets](#placing-bets)
3. [Managing Your Balance](#managing-your-balance)
4. [Understanding Payouts](#understanding-payouts)
5. [Betting Interface](#betting-interface)
6. [Game Phases](#game-phases)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

## Getting Started

### Initial Setup

When you join a game room, you'll automatically receive an initial balance of chips to start betting:

- **Default Balance**: 1000 chips
- **Minimum Bet**: 10 chips
- **Maximum Bet**: Your current balance (all-in)

### Joining a Betting Game

1. Enter a valid room code
2. Choose your player name
3. Wait for the game to start
4. Your betting balance will be displayed in the interface

## Placing Bets

### Basic Betting

1. **Select Bet Amount**: Use the betting controls to choose your wager
   - Click preset amounts (10, 25, 50, 100)
   - Use the slider for custom amounts
   - Type directly in the bet input field

2. **Place Your Bet**: Click "Place Bet" to confirm your wager
   - Your balance will be reduced by the bet amount
   - The bet will be locked in for the current round

3. **Modify Your Bet**: Before betting closes, you can:
   - Increase your bet (if you have sufficient balance)
   - Decrease your bet
   - Clear your bet entirely

### Betting Controls

#### Preset Buttons
- **10, 25, 50, 100**: Quick bet amounts
- **Max**: Bet your entire balance (all-in)
- **Clear**: Remove your current bet

#### Bet Slider
- Drag to select any amount between minimum and maximum
- Real-time balance updates as you adjust
- Smooth increments for precise betting

#### Manual Input
- Type exact amounts in the bet field
- Automatic validation prevents invalid bets
- Press Enter to confirm

### All-In Betting

When you bet your entire balance:
- Click the "Max" button or manually enter your full balance
- A special "ALL-IN" indicator will appear
- You cannot place additional bets until the next round

## Managing Your Balance

### Balance Display

Your current balance is always visible:
- **Current Balance**: Shows available chips
- **Current Bet**: Shows your active wager
- **Remaining**: Balance minus current bet

### Balance Updates

Your balance changes when:
- **Placing Bets**: Balance decreases by bet amount
- **Winning**: Balance increases by payout amount
- **Losing**: Bet amount is lost (already deducted)
- **Push/Draw**: Bet amount is returned

### Balance Validation

The system prevents:
- Betting more than your balance
- Negative balances
- Invalid bet amounts (non-numeric, zero, etc.)

## Understanding Payouts

### Payout Calculation

Payouts depend on the game outcome:

#### Blackjack Payouts
- **Blackjack Win**: 2.5x your bet (3:2 odds)
- **Regular Win**: 2x your bet (1:1 odds)
- **Push/Draw**: 1x your bet (money back)
- **Loss**: 0x your bet (lose wager)

#### Custom Game Payouts
- Payout multipliers vary by game type
- Check game rules for specific odds
- Multipliers are displayed during gameplay

### Payout Distribution

After each round:
1. Game results are calculated
2. Payouts are determined based on outcomes
3. Balances are updated automatically
4. New betting round begins (if game continues)

## Betting Interface

### Main Betting Panel

The betting interface includes:

```
┌─────────────────────────────────┐
│ Balance: 850 chips              │
│ Current Bet: 50 chips           │
│ Remaining: 800 chips            │
├─────────────────────────────────┤
│ [10] [25] [50] [100] [Max]      │
│                                 │
│ ████████████░░░░░░░░░░░░░░░░░░░ │
│ Bet Amount: [50        ]        │
│                                 │
│ [Place Bet] [Clear] [All-In]    │
└─────────────────────────────────┘
```

### Status Indicators

- **🟢 Betting Open**: You can place or modify bets
- **🟡 Betting Closing**: Limited time remaining
- **🔴 Betting Closed**: No more bet changes allowed
- **⏱️ Timer**: Shows remaining betting time

### Visual Feedback

- **Green**: Successful actions
- **Yellow**: Warnings (low balance, time running out)
- **Red**: Errors or invalid actions
- **Blue**: Information and updates

## Game Phases

### 1. Betting Phase

**Duration**: Typically 30-60 seconds

**Actions Available**:
- Place new bets
- Modify existing bets
- Clear bets
- View other players' betting status

**Interface Elements**:
- Betting controls are active
- Timer shows remaining time
- Balance updates in real-time

### 2. Game Play Phase

**Duration**: Varies by game type

**Actions Available**:
- Watch game progression
- View current bets (locked)
- See potential payouts

**Interface Elements**:
- Betting controls are disabled
- Current bets are displayed
- Game action is shown

### 3. Results Phase

**Duration**: 5-10 seconds

**Actions Available**:
- View game results
- See payout calculations
- Check updated balances

**Interface Elements**:
- Results are highlighted
- Payout amounts are shown
- Balance changes are animated

## Troubleshooting

### Common Issues

#### "Insufficient Balance" Error
**Problem**: Trying to bet more than available balance
**Solution**: 
- Check your current balance
- Reduce bet amount
- Clear existing bet if needed

#### "Betting Closed" Message
**Problem**: Trying to bet after betting phase ended
**Solution**:
- Wait for next betting round
- Be quicker in future rounds
- Watch the timer countdown

#### Bet Not Registering
**Problem**: Clicking "Place Bet" but nothing happens
**Solution**:
- Check internet connection
- Refresh the page
- Ensure bet amount is valid
- Try a different bet amount

#### Balance Not Updating
**Problem**: Balance shows incorrect amount
**Solution**:
- Refresh the page
- Check transaction history
- Contact support if persistent

### Connection Issues

#### Disconnection During Betting
- Your last valid bet remains active
- Reconnect quickly to modify bets
- Balance is preserved across disconnections

#### Slow Response Times
- Check internet connection
- Close other browser tabs
- Try refreshing the page
- Switch to a different network if available

### Error Recovery

The system includes automatic error recovery:
- Failed bets are automatically retried
- Balance inconsistencies are corrected
- Connection issues trigger reconnection attempts

## FAQ

### General Questions

**Q: What happens if I disconnect during a game?**
A: Your bets remain active, and any winnings are credited to your account. Reconnect to continue playing.

**Q: Can I change my bet after placing it?**
A: Yes, as long as the betting phase is still active. You can increase, decrease, or clear your bet.

**Q: What's the minimum/maximum bet?**
A: Minimum bet is 10 chips. Maximum bet is your current balance (all-in).

**Q: How are payouts calculated?**
A: Payouts depend on game rules and outcomes. Blackjack typically pays 2.5x for blackjack, 2x for regular wins.

### Technical Questions

**Q: Why can't I bet a certain amount?**
A: Ensure the amount is:
- At least 10 chips (minimum)
- Not more than your balance
- A valid number (no letters or symbols)

**Q: The betting timer seems wrong. What should I do?**
A: The timer syncs with the server. If it seems off, refresh your page to resync.

**Q: My balance disappeared. Where did it go?**
A: Check if:
- You placed a bet that's still active
- The game round ended and you lost
- There was a payout you missed

### Gameplay Questions

**Q: Can I see other players' bets?**
A: You can see that other players have bet, but not the exact amounts (privacy protection).

**Q: What happens if two players go all-in with different amounts?**
A: Each player's payout is calculated based on their individual bet amount and the game outcome.

**Q: Can I bet on multiple outcomes?**
A: No, you can only place one bet per round in the current game format.

## Advanced Features

### Betting Strategies

#### Conservative Strategy
- Bet small, consistent amounts (10-25 chips)
- Preserve balance for longer gameplay
- Lower risk, lower reward

#### Aggressive Strategy
- Bet larger amounts (50-100+ chips)
- Higher risk, higher reward
- Can lead to quick wins or losses

#### All-In Strategy
- Bet entire balance on confident rounds
- Maximum risk, maximum reward
- Use sparingly for dramatic moments

### Statistics Tracking

The system tracks (for your reference):
- Total bets placed
- Win/loss ratio
- Average bet size
- Biggest win/loss
- Current streak

### Keyboard Shortcuts

- **1-4**: Quick bet presets (10, 25, 50, 100)
- **M**: Max bet (all-in)
- **C**: Clear bet
- **Enter**: Place/confirm bet
- **Space**: Place bet (when amount selected)

## Support

### Getting Help

If you encounter issues:

1. **Check this guide** for common solutions
2. **Refresh the page** to resolve temporary issues
3. **Check your internet connection**
4. **Contact support** with specific error messages

### Reporting Bugs

When reporting issues, include:
- Room code
- Player name
- Exact error message
- Steps to reproduce the problem
- Browser and device information

### Contact Information

- **In-Game Support**: Use the help button in the game interface
- **Email Support**: support@gameplatform.com
- **Live Chat**: Available during peak hours

---

*This guide covers the core betting system features. Game-specific rules and payouts may vary. Always check the specific game rules before playing.*