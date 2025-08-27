export interface EnvironmentConfig {
  // Network Configuration
  HOST: string;
  BACKEND_PORT: number;
  FRONTEND_PORT: number;
  
  // Service URLs
  API_BASE_URL: string;
  WEBSOCKET_URL: string;
  FRONTEND_URL: string;
  
  // Environment
  NODE_ENV: 'development' | 'production'; // | 'test';
  
  // CORS
  CORS_ORIGIN: string;
}

export class ConfigurationError extends Error {
  constructor(message: string, public missingVars: string[]) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ConfigManager {
  private static config: EnvironmentConfig;
  
  static load(): EnvironmentConfig {
    const requiredVars = ['HOST'];
    const missing = requiredVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new ConfigurationError(
        `Missing required environment variables: ${missing.join(', ')}. Please check your .env file.`,
        missing
      );
    }
    
    const host = process.env.HOST!;
    const publicHost = process.env.PUBLIC_HOST || host; // Use PUBLIC_HOST if available, otherwise HOST
    const backendPort = parseInt(process.env.BACKEND_PORT || '5185');
    const frontendPort = parseInt(process.env.FRONTEND_PORT || '5180');
    
    // Validate port numbers
    if (isNaN(backendPort) || backendPort < 1 || backendPort > 65535) {
      throw new ConfigurationError(
        `Invalid BACKEND_PORT: ${process.env.BACKEND_PORT}. Must be a number between 1 and 65535.`,
        ['BACKEND_PORT']
      );
    }
    
    if (isNaN(frontendPort) || frontendPort < 1 || frontendPort > 65535) {
      throw new ConfigurationError(
        `Invalid FRONTEND_PORT: ${process.env.FRONTEND_PORT}. Must be a number between 1 and 65535.`,
        ['FRONTEND_PORT']
      );
    }
    
    // Validate HOST format (basic check)
    if (!host || host.trim().length === 0) {
      throw new ConfigurationError(
        'HOST cannot be empty. Set it to "localhost" for local development or your IP address for network access.',
        ['HOST']
      );
    }
    
    this.config = {
      HOST: host, // This is what the server binds to (0.0.0.0)
      BACKEND_PORT: backendPort,
      FRONTEND_PORT: frontendPort,
      API_BASE_URL: `http://${publicHost}:${backendPort}`, // This is what clients connect to
      WEBSOCKET_URL: `ws://${publicHost}:${backendPort}`,
      FRONTEND_URL: `http://${publicHost}:${frontendPort}`,
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
    };
    
    return this.config;
  }
  
  static get(): EnvironmentConfig {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }
  
  static validate(): void {
    try {
      this.load();
      console.log('✅ Configuration loaded successfully');
      console.log(`   - Host: ${this.config.HOST}`);
      console.log(`   - Backend Port: ${this.config.BACKEND_PORT}`);
      console.log(`   - Frontend Port: ${this.config.FRONTEND_PORT}`);
      console.log(`   - API Base URL: ${this.config.API_BASE_URL}`);
      console.log(`   - WebSocket URL: ${this.config.WEBSOCKET_URL}`);
      console.log(`   - Frontend URL: ${this.config.FRONTEND_URL}`);
      console.log(`   - Environment: ${this.config.NODE_ENV}`);
      console.log(`   - CORS Origin: ${this.config.CORS_ORIGIN}`);
      
      // Network access guidance
      if (this.config.HOST === 'localhost' || this.config.HOST === '127.0.0.1') {
        console.log('ℹ️  Currently configured for local access only.');
        console.log('   To allow network access from other devices:');
        console.log('   1. Find your IP address (ipconfig on Windows, ifconfig on Mac/Linux)');
        console.log('   2. Update HOST in your .env file to your IP address');
        console.log('   3. Update VITE_HOST in your .env file to match');
      } else {
        console.log('🌐 Network access enabled - other devices can connect using:');
        console.log(`   - Frontend: ${this.config.FRONTEND_URL}`);
        console.log(`   - Backend: ${this.config.API_BASE_URL}`);
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        console.error('❌ Configuration Error:', error.message);
        console.error('   Missing/Invalid variables:', error.missingVars);
        console.error('');
        console.error('   📋 Quick Setup Guide:');
        console.error('   1. Copy .env.example to .env');
        console.error('   2. Update HOST to your IP address for network access');
        console.error('   3. Ensure VITE_HOST matches HOST for frontend');
        console.error('   4. Restart both frontend and backend servers');
        console.error('');
        console.error('   💡 For local development only, set HOST=localhost');
        console.error('   💡 For network access, set HOST to your machine\'s IP address');
        process.exit(1);
      }
      throw error;
    }
  }
}