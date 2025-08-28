import React, { useState, useRef, useEffect } from 'react';
import './ChatInput.css';

const ChatInput = ({ onSendMessage, disabled = false, isLoading = false }) => {
  const [message, setMessage] = useState('');
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);
  
  const MAX_CHARS = 500;
  const MIN_CHARS = 1;

  // Handle input change with validation
  const handleInputChange = (e) => {
    const value = e.target.value;
    
    // Limit character count
    if (value.length <= MAX_CHARS) {
      setMessage(value);
      setCharCount(value.length);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    
    // Validate message
    if (trimmedMessage.length < MIN_CHARS || trimmedMessage.length > MAX_CHARS) {
      return;
    }
    
    if (disabled || isLoading) {
      return;
    }
    
    // Send message and clear input
    onSendMessage(trimmedMessage);
    setMessage('');
    setCharCount(0);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Send on Enter (but not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Focus input when component mounts
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const isValid = message.trim().length >= MIN_CHARS && message.trim().length <= MAX_CHARS;
  const isNearLimit = charCount > MAX_CHARS * 0.8;

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className={`chat-input ${!isValid && message.length > 0 ? 'invalid' : ''}`}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Conectando...' : 'Escribe tu pregunta sobre blackjack...'}
            disabled={disabled || isLoading}
            rows={1}
            aria-label="Escribe tu pregunta sobre blackjack"
            aria-describedby="char-count-info"
          />
          
          <button
            type="submit"
            className={`send-button ${isValid && !disabled && !isLoading ? 'enabled' : 'disabled'}`}
            disabled={!isValid || disabled || isLoading}
            aria-label="Enviar mensaje"
          >
            {isLoading ? (
              <div className="loading-spinner" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <animateTransform
                      attributeName="transform"
                      attributeType="XML"
                      type="rotate"
                      from="0 12 12"
                      to="360 12 12"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </path>
                </svg>
              </div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        
        <div className="chat-input-footer">
          <div className="input-hints">
            <span className="hint-text">
              Presiona Enter para enviar, Shift+Enter para nueva línea
            </span>
          </div>
          
          <div 
            className={`char-count ${isNearLimit ? 'warning' : ''} ${charCount >= MAX_CHARS ? 'error' : ''}`}
            id="char-count-info"
            aria-live="polite"
          >
            {charCount}/{MAX_CHARS}
          </div>
        </div>
      </div>
    </form>
  );
};

export default ChatInput;