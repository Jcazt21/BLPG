import React from 'react';
import './PlayingCard.css';

const suitSymbols = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};
const suitColors = {
  hearts: '#e57373', // red
  diamonds: '#ffd54f', // yellow
  clubs: '#64b5f6', // blue
  spades: '#e0e0e0', // white/gray
};

export default function PlayingCard({ value, suit, faceDown = false, flipped = false }) {
  if (faceDown) {
    return (
      <div className={`playing-card back${flipped ? ' flipped' : ''}`}>
        <div className="card-back-inner" />
      </div>
    );
  }
  return (
    <div className={`playing-card${flipped ? ' flipped' : ''}`}
      style={{ color: suitColors[suit] }}>
      <div className="corner top-left">
        <span className="card-value">{value}</span>
        <span className="card-suit">{suitSymbols[suit]}</span>
      </div>
      <div className="card-center">{suitSymbols[suit]}</div>
      <div className="corner bottom-right">
        <span className="card-value">{value}</span>
        <span className="card-suit">{suitSymbols[suit]}</span>
      </div>
    </div>
  );
} 