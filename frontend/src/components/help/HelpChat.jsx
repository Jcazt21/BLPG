import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { ConfigManager } from '../../config/environment';
import helpService from '../../services/helpService';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import './HelpChat.css';

const HelpChat = ({ isOpen, onClose, roomCode }) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connecting', 'connected', 'disconnected', 'offline'
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Initialize socket connection when chat opens
  useEffect(() => {
    if (isOpen && !socketRef.current) {
      // Get WebSocket URL from environment config
      const config = ConfigManager.getConfig();
      const wsUrl = config.WS_URL;
      
      console.log('Attempting to connect to WebSocket:', `${wsUrl}/help`);
      console.log('Config details:', config);
      setConnectionStatus('connecting');
      
      // Test server availability first
      fetch(`${config.API_URL.replace('/game', '')}/health`)
        .then(response => {
          console.log('Server health check:', response.status);
          if (response.ok) {
            console.log('Server is healthy, proceeding with WebSocket connection');
          }
        })
        .catch(error => {
          console.warn('Server health check failed:', error);
        });
      
      socketRef.current = io(`${wsUrl}/help`, {
        autoConnect: true,
        transports: ['polling', 'websocket'], // Try polling first
        timeout: 15000, // Increased timeout
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 3,
        forceNew: true,
        // Additional connection options
        upgrade: true,
        rememberUpgrade: false
      });

      const socket = socketRef.current;

      // Connection timeout fallback with retry logic - increased timeout since we know server works
      const connectionTimeout = setTimeout(() => {
        if (!isConnected && !socket.connected) {
          console.warn('WebSocket connection timeout after 15 seconds, switching to offline mode');
          console.log('Connection details:', {
            url: `${wsUrl}/help`,
            socketId: socket.id,
            connected: socket.connected,
            disconnected: socket.disconnected,
            transport: socket.io?.engine?.transport?.name,
            readyState: socket.io?.engine?.readyState
          });
          setIsConnected(true); // Enable offline mode
          setConnectionStatus('offline');
          setSessionId('offline-session');
          setMessages([{
            id: Date.now(),
            type: 'system',
            content: '¡Hola! Soy tu asistente de blackjack. Estoy funcionando en modo offline porque no pude conectarme al servidor. Puedo ayudarte con las reglas básicas, estrategias y mecánicas del juego. ¿En qué puedo ayudarte?',
            timestamp: new Date()
          }]);
        }
      }, 15000); // 15 second timeout - server is working, give more time

      // Connection events
      socket.on('connect', () => {
        console.log('WebSocket connected successfully to:', `${wsUrl}/help`);
        console.log('Socket ID:', socket.id);
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        // Start help session
        socket.emit('help:startSession', { roomCode });
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // If disconnected for network reasons, try to reconnect
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          socket.connect();
        }
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        console.log('Failed to connect to:', `${wsUrl}/help`);
        console.log('Error details:', err.message);
        
        // Try to reconnect after a delay if not already in offline mode
        if (!sessionId || sessionId !== 'offline-session') {
          setTimeout(() => {
            if (socket.disconnected && !sessionId) {
              console.log('Attempting to reconnect...');
              socket.connect();
            }
          }, 2000);
        }
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('WebSocket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
        setError(null);
        // Restart session after reconnection
        socket.emit('help:startSession', { roomCode });
      });

      socket.on('reconnect_error', (err) => {
        console.error('WebSocket reconnection error:', err);
      });

      socket.on('reconnect_failed', () => {
        console.error('WebSocket reconnection failed - switching to offline mode');
        setIsConnected(true); // Enable offline mode
        setSessionId('offline-session');
        setMessages([{
          id: Date.now(),
          type: 'system',
          content: '¡Hola! Soy tu asistente de blackjack. Estoy funcionando en modo offline porque no pude conectarme al servidor. Puedo ayudarte con las reglas básicas, estrategias y mecánicas del juego. ¿En qué puedo ayudarte?',
          timestamp: new Date()
        }]);
      });

      // Additional debugging events
      socket.on('connecting', () => {
        console.log('Socket.IO: Connecting...');
      });

      socket.on('connect_timeout', () => {
        console.warn('Socket.IO: Connection timeout');
      });

      socket.io.on('error', (error) => {
        console.error('Socket.IO engine error:', error);
      });

      socket.io.on('upgrade', () => {
        console.log('Socket.IO: Upgraded to WebSocket');
      });

      socket.io.on('upgradeError', (error) => {
        console.warn('Socket.IO: Upgrade error:', error);
      });

      // Help session events
      socket.on('help:sessionStarted', (data) => {
        setSessionId(data.sessionId);
        setMessages([{
          id: Date.now(),
          type: 'system',
          content: data.welcomeMessage || '¡Hola! Soy tu asistente de blackjack. Puedo ayudarte con las reglas, estrategias básicas y mecánicas del juego. ¿En qué puedo ayudarte?',
          timestamp: new Date()
        }]);
      });

      socket.on('help:response', (data) => {
        setIsTyping(false);
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id: data.message.id || Date.now(),
          type: 'assistant',
          content: data.message.content,
          timestamp: new Date(data.message.timestamp)
        }]);
      });

      socket.on('help:typing', () => {
        setIsTyping(true);
      });

      socket.on('help:error', (data) => {
        setIsTyping(false);
        setIsLoading(false);
        setError(data.error);
        
        // Add error message to chat
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'system',
          content: data.canRetry 
            ? 'Lo siento, hubo un error. Por favor intenta de nuevo.' 
            : 'El servicio no está disponible en este momento.',
          timestamp: new Date()
        }]);
      });

      socket.on('help:sessionEnded', () => {
        setSessionId(null);
        setMessages([]);
      });
    }

    return () => {
      if (socketRef.current && !isOpen) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setSessionId(null);
        setMessages([]);
        setError(null);
      }
    };
  }, [isOpen, roomCode]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Handle sending messages
  const handleSendMessage = async (message) => {
    if (!sessionId || !message.trim()) return;

    // Validate message
    const validation = helpService.validateQuestion(message.trim());
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Check if we have a real WebSocket connection or are in offline mode
    const isOfflineMode = sessionId === 'offline-session' || !socketRef.current?.connected;

    if (isOfflineMode) {
      // Offline mode - use fallback responses
      setIsTyping(true);
      
      // Simulate thinking time
      setTimeout(() => {
        const response = helpService.getFallbackResponse(message.trim());
        
        setIsTyping(false);
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'assistant',
          content: response,
          timestamp: new Date()
        }]);
      }, 1000 + Math.random() * 1000); // 1-2 second delay
    } else {
      // Online mode - send to server via WebSocket
      socketRef.current.emit('help:askQuestion', {
        question: message.trim(),
        sessionId
      });
    }
  };

  // Handle closing chat
  const handleClose = () => {
    if (socketRef.current && sessionId) {
      socketRef.current.emit('help:endSession', { sessionId });
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setMessages([]);
    setSessionId(null);
    setIsConnected(false);
    setError(null);
    setIsTyping(false);
    setIsLoading(false);
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="help-chat-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div 
        className="help-chat-container"
        role="dialog"
        aria-labelledby="help-chat-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="help-chat-header">
          <div className="help-chat-title-section">
            <h2 id="help-chat-title" className="help-chat-title">
              Asistente de Blackjack
            </h2>
            <div className="help-chat-status">
              <div className={`status-indicator ${
                sessionId === 'offline-session' ? 'offline' : 
                isConnected ? 'connected' : 'disconnected'
              }`}></div>
              <span className="status-text">
                {connectionStatus === 'offline' ? 'Modo Offline' : 
                 connectionStatus === 'connected' ? 'Conectado' : 
                 connectionStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
              </span>
              {sessionId === 'offline-session' && (
                <button 
                  className="reconnect-button"
                  onClick={() => {
                    // Try to reconnect
                    if (socketRef.current) {
                      socketRef.current.disconnect();
                      socketRef.current = null;
                    }
                    setSessionId(null);
                    setIsConnected(false);
                    setMessages([]);
                    // This will trigger the useEffect to reconnect
                  }}
                  title="Intentar reconectar"
                >
                  🔄
                </button>
              )}
            </div>
          </div>
          <button
            className="help-chat-close"
            onClick={handleClose}
            aria-label="Cerrar chat de ayuda"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div 
          className="help-chat-messages" 
          ref={chatContainerRef}
          role="log"
          aria-live="polite"
          aria-label="Mensajes del chat"
        >
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {isTyping && <TypingIndicator />}
          
          {error && (
            <div className="error-message" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="help-chat-footer">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={!isConnected || !sessionId || isLoading}
            isLoading={isLoading}
          />
          <div className="help-chat-disclaimer">
            Este asistente solo responde preguntas sobre blackjack. No proporciona consejos específicos de juego.
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpChat;