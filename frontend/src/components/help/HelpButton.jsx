import React from 'react';
import './HelpButton.css';

const HelpButton = ({ onOpen, disabled = false }) => {
  return (
    <button
      className={`help-button ${disabled ? 'disabled' : ''}`}
      onClick={onOpen}
      disabled={disabled}
      aria-label="Abrir asistente de ayuda para blackjack"
      title="¿Necesitas ayuda con las reglas del blackjack?"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="help-button-text">Ayuda</span>
    </button>
  );
};

export default HelpButton;