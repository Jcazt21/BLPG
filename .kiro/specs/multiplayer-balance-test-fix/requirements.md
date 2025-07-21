# Requirements Document

## Introduction

The multiplayer balance validation test is incorrectly calculating expected balance values, causing false positive errors when the backend balance logic is actually working correctly. The test needs to be fixed to properly validate the multiplayer game balance calculations according to the correct blackjack payout logic.

## Requirements

### Requirement 1

**User Story:** As a developer running tests, I want the balance validation test to correctly calculate expected balances, so that I can trust the test results and identify real balance issues.

#### Acceptance Criteria

1. WHEN a player loses a hand THEN the test SHALL expect the final balance to equal the balance after the bet was deducted (no payout)
2. WHEN a player wins a hand THEN the test SHALL expect the final balance to equal the balance after bet deduction plus 2x the bet amount (bet returned + winnings)
3. WHEN a player gets blackjack THEN the test SHALL expect the final balance to equal the balance after bet deduction plus 2.5x the bet amount (bet returned + 1.5x winnings)
4. WHEN a player draws/pushes THEN the test SHALL expect the final balance to equal the balance after bet deduction plus 1x the bet amount (bet returned only)
5. WHEN a player busts THEN the test SHALL expect the final balance to equal the balance after the bet was deducted (no payout)

### Requirement 2

**User Story:** As a developer, I want the test to use the correct balance reference points, so that the validation logic matches the actual backend implementation.

#### Acceptance Criteria

1. WHEN calculating expected balance THEN the test SHALL use the balance after bet deduction as the baseline
2. WHEN a bet is placed THEN the test SHALL track that the balance was reduced by the bet amount
3. WHEN calculating expected payout THEN the test SHALL use the original bet amount before any resets
4. WHEN validating final balance THEN the test SHALL compare against (balance_after_bet + payout)

### Requirement 3

**User Story:** As a developer, I want the test to properly handle the timing of bet resets, so that payout calculations use the correct bet values.

#### Acceptance Criteria

1. WHEN capturing bet amount for payout calculation THEN the test SHALL use the bet amount before it gets reset to 0
2. WHEN the backend resets bet to 0 after payout THEN the test SHALL not use the reset value for validation
3. WHEN calculating expected payout THEN the test SHALL use the original bet amount that was placed

### Requirement 4

**User Story:** As a developer, I want clear error messages when balance validation fails, so that I can quickly identify the root cause of any real issues.

#### Acceptance Criteria

1. WHEN a balance validation fails THEN the test SHALL show the expected calculation formula
2. WHEN a balance validation fails THEN the test SHALL show the actual balance progression (initial -> after_bet -> final)
3. WHEN a payout validation fails THEN the test SHALL show the bet amount used and the expected payout formula
4. WHEN validation passes THEN the test SHALL log success with the correct balance progression