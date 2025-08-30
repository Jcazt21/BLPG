import React, { useState, useMemo, useCallback } from 'react';
import PlayingCard from '../PlayingCard';
import './CardStack.css';

const CardStack = React.memo(function CardStack({ 
  cards = [], 
  maxVisible = 5, 
  compactOffset = 20, 
  expandedOffset = 40,
  animationDuration = 180 
}) {
  const [expanded, setExpanded] = useState(false);
  const [touchTimeout, setTouchTimeout] = useState(null);

  // Memoize processed cards with z-index and labels
  const processedCards = useMemo(() => {
    if (!cards || cards.length === 0) return [];
    
    const visibleCards = cards.slice(-maxVisible);
    return visibleCards.map((card, index) => ({
      ...card,
      zIndex: index + 1,
      label: `${card.value} de ${card.suit}`,
      id: `${card.value}-${card.suit}-${index}`
    }));
  }, [cards, maxVisible]);

  // Generate accessibility label
  const ariaLabel = useMemo(() => {
    if (processedCards.length === 0) return 'Sin cartas';
    return `Cartas: ${processedCards.map(card => card.label).join(', ')}`;
  }, [processedCards]);

  // Calculate dynamic reserve space (horizontal)
  const reserveSpace = useMemo(() => {
    const baseReserve = Math.max(80, processedCards.length * compactOffset);
    const expandedReserve = Math.max(120, processedCards.length * expandedOffset);
    return expanded ? expandedReserve : baseReserve;
  }, [expanded, processedCards.length, compactOffset, expandedOffset]);

  // Mouse handlers for desktop
  const handleMouseEnter = useCallback(() => {
    setExpanded(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setExpanded(false);
  }, []);

  // Touch handlers for mobile with timeout
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const timeout = setTimeout(() => {
      setExpanded(true);
    }, 150); // Slight delay to distinguish from tap
    setTouchTimeout(timeout);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchTimeout) {
      clearTimeout(touchTimeout);
      setTouchTimeout(null);
    }
    // Keep expanded for a moment, then collapse
    setTimeout(() => setExpanded(false), 800);
  }, [touchTimeout]);

  // Toggle for accessibility button
  const handleToggleExpand = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  if (processedCards.length === 0) {
    return (
      <div className="cardStack empty" aria-label="Sin cartas">
        <div className="empty-placeholder">
          <span className="empty-icon">🂠</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="cardStack"
      style={{
        '--offset': `${expanded ? expandedOffset : compactOffset}px`,
        '--reserve': `${reserveSpace}px`,
        '--anim-duration': `${animationDuration}ms`,
        '--card-count': processedCards.length
      }}
      aria-label={ariaLabel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Accessibility button for screen readers and keyboard navigation */}
      <button 
        className="visuallyHidden" 
        aria-label={`${expanded ? 'Contraer' : 'Expandir'} cartas`}
        onClick={handleToggleExpand}
        tabIndex={0}
      />

      {/* Render cards in horizontal stack */}
      {processedCards.map((card, index) => (
        <div
          key={card.id}
          className="card"
          style={{
            '--card-index': index,
            zIndex: card.zIndex,
            transform: `translateX(calc(var(--offset) * ${index}))`
          }}
          aria-hidden="true"
        >
          <PlayingCard
            value={card.value}
            suit={card.suit}
            faceDown={false}
            flipped={true}
          />
        </div>
      ))}

      {/* Card count indicator if more than maxVisible */}
      {cards.length > maxVisible && (
        <div className="card-count-indicator" aria-hidden="true">
          +{cards.length - maxVisible}
        </div>
      )}

      {/* Expansion hint for mobile */}
      {processedCards.length > 1 && (
        <div className="expansion-hint" aria-hidden="true">
          <span className="hint-icon">👈</span>
        </div>
      )}
    </div>
  );
});

export default CardStack;