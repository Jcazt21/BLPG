/**
 * Validates a bet amount
 */
export function validateBet(balance: number, currentBet: number, betAmount: number): { 
  valid: boolean; 
  error?: string 
} {
  if (betAmount < 0) {
    return { valid: false, error: 'Bet amount cannot be negative' };
  }
  
  if (betAmount === 0) {
    return { valid: false, error: 'Bet amount must be greater than zero' };
  }
  
  if (betAmount > balance + currentBet) {
    return { valid: false, error: 'Insufficient balance for this bet' };
  }
  
  return { valid: true };
}