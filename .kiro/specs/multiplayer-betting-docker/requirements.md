# Requirements Document

## Introduction

This specification covers three critical enhancements to the Blackjack game application:

1. **Multiplayer Betting System**: Implement the same betting interface from single-player mode in multiplayer, including chip buttons (25, 50, 100, 250, 500, 1000) and "All In" functionality, replacing the current fixed 100-chip system.

2. **Docker Containerization**: Create a single Docker container that runs both frontend and backend services together for simplified deployment and management.

3. **Secure Environment Configuration**: Implement secure environment variable management following security best practices, replacing hardcoded values and improving configuration management.

These enhancements will improve the game's functionality, deployment flexibility, and security posture while maintaining the existing user experience.

## Requirements

### Requirement 1: Multiplayer Betting System and Casino Table Experience

**User Story:** As a multiplayer game player, I want to experience a realistic casino table with proper card dealing sequence and the same betting interface as single-player mode, so that I can enjoy an authentic blackjack experience with other players.

#### Acceptance Criteria

1. WHEN a player is in a multiplayer room THEN the system SHALL display the same betting interface as single-player mode with chip buttons (25, 50, 100, 250, 500, 1000)
2. WHEN a player clicks chip buttons THEN the system SHALL add the chip value to their current bet amount
3. WHEN a player clicks "All In" THEN the system SHALL set their bet to their entire balance
4. WHEN a player clicks "Clear Bet" THEN the system SHALL reset their bet to zero
5. WHEN multiple players have different bet amounts THEN the system SHALL track each player's individual bet and balance separately
6. WHEN a multiplayer game round ends THEN the system SHALL calculate payouts based on each player's individual bet amount using the same payout logic as single-player
7. IF a player tries to bet more than their balance THEN the system SHALL prevent the bet and show validation feedback

#### Casino Table Experience Acceptance Criteria

8. WHEN the game starts THEN the system SHALL display a casino table layout showing all players' positions around the table
9. WHEN cards are dealt THEN the system SHALL follow authentic casino dealing sequence:
   - First, deal one card face-up to each player in turn order
   - Then, deal one card face-up to the dealer
   - Next, deal a second card face-up to each player in turn order  
   - Finally, deal one card face-down to the dealer (hole card)
10. WHEN it's the dealer's turn THEN the system SHALL reveal the hole card before the dealer plays
11. WHEN viewing the table THEN each player's cards SHALL be visible to all players with their names and bet amounts
12. WHEN a player busts or stands THEN their status SHALL be clearly visible on the table
13. WHEN the round ends THEN all players SHALL see the final results displayed on the table with win/lose indicators

### Requirement 2: Docker Containerization

**User Story:** As a developer or system administrator, I want to deploy the Blackjack application in a single Docker container that runs both frontend and backend services, so that I can have simplified deployment and management.

#### Acceptance Criteria

1. WHEN I run docker-compose up THEN the system SHALL start a single container running both frontend and backend services
2. WHEN the container starts THEN both services SHALL be accessible through the same container with proper port mapping
3. WHEN I make code changes THEN the development setup SHALL support hot reloading for both services within the single container
4. WHEN deploying to production THEN the container SHALL use optimized production builds for both frontend and backend
5. IF the container fails THEN the system SHALL provide clear error messages and logging for both services
6. WHEN the container runs THEN it SHALL serve the frontend static files and handle backend API requests on the same host

### Requirement 3: Secure Environment Configuration

**User Story:** As a developer, I want all configuration to be managed through environment variables with a focus on easy IP configuration, so that I only need to change IP addresses in the .env file to deploy in different network environments.

#### Acceptance Criteria

1. WHEN I deploy the application THEN I SHALL only need to modify IP addresses in the .env file to configure the entire system
2. WHEN the application starts THEN all hardcoded IPs and URLs SHALL be replaced with environment variables
3. WHEN I change the backend IP in .env THEN both frontend API calls and WebSocket connections SHALL automatically use the new IP
4. WHEN running in different environments THEN the system SHALL support environment-specific .env files (.env.development, .env.production)
5. IF required environment variables are missing THEN the system SHALL provide clear error messages indicating which variables need to be set
6. WHEN using Docker THEN the container SHALL read environment variables from the .env file and apply them to both frontend and backend services
7. WHEN deploying to different networks THEN only the HOST/IP variables in .env SHALL need to be updated

### Requirement 4: Code Optimization and Performance

**User Story:** As a developer, I want the codebase to be optimized for performance and maintainability without introducing bugs, so that the application runs efficiently and is easier to maintain.

#### Acceptance Criteria

1. WHEN reviewing the codebase THEN any redundant or inefficient code SHALL be refactored without changing functionality
2. WHEN optimizing React components THEN unnecessary re-renders SHALL be prevented using React.memo, useMemo, and useCallback where appropriate
3. WHEN optimizing the backend THEN database queries and API responses SHALL be optimized for performance
4. WHEN refactoring code THEN existing functionality SHALL remain intact and all tests SHALL continue to pass
5. WHEN optimizing WebSocket communications THEN message frequency and payload size SHALL be minimized
6. WHEN improving code structure THEN better separation of concerns and modularity SHALL be implemented
7. IF any optimization introduces breaking changes THEN it SHALL be documented and handled gracefully