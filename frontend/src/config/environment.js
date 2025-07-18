export class ConfigurationError extends Error {
  constructor(message, missingVars = []) {
    super(message);
    this.name = 'ConfigurationError';
    this.missingVars = missingVars;
  }
}

export class ConfigManager {
  static getConfig() {
    // Get environment variables from Vite (VITE_ prefixed)
    const host = import.meta.env.VITE_HOST || 'localhost';
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '5185';
    const frontendPort = import.meta.env.VITE_FRONTEND_PORT || '5180';
    
    // Validate port numbers
    const backendPortNum = parseInt(backendPort);
    const frontendPortNum = parseInt(frontendPort);
    
    if (isNaN(backendPortNum) || backendPortNum < 1 || backendPortNum > 65535) {
      throw new ConfigurationError(
        `Invalid VITE_BACKEND_PORT: ${backendPort}. Must be a number between 1 and 65535.`,
        ['VITE_BACKEND_PORT']
      );
    }
    
    if (isNaN(frontendPortNum) || frontendPortNum < 1 || frontendPortNum > 65535) {
      throw new ConfigurationError(
        `Invalid VITE_FRONTEND_PORT: ${frontendPort}. Must be a number between 1 and 65535.`,
        ['VITE_FRONTEND_PORT']
      );
    }
    
    // Validate HOST format (basic check)
    if (!host || host.trim().length === 0) {
      throw new ConfigurationError(
        'VITE_HOST cannot be empty. Set it to "localhost" for local development or your IP address for network access.',
        ['VITE_HOST']
      );
    }
    
    return {
      HOST: host,
      BACKEND_PORT: backendPortNum,
      FRONTEND_PORT: frontendPortNum,
      API_URL: `http://${host}:${backendPort}/game`,
      WS_URL: `http://${host}:${backendPort}`,
      NODE_ENV: import.meta.env.MODE || 'development'
    };
  }
  
  static validate() {
    try {
      const config = this.getConfig();
      
      // Check if required environment variables are set
      if (!import.meta.env.VITE_HOST) {
        console.warn('⚠️  VITE_HOST not set, using default: localhost');
        console.warn('   For network access, set VITE_HOST in your .env file to match your backend HOST');
      }
      
      console.log('✅ Frontend configuration loaded:');
      console.log(`   - Host: ${config.HOST}`);
      console.log(`   - Backend Port: ${config.BACKEND_PORT}`);
      console.log(`   - Frontend Port: ${config.FRONTEND_PORT}`);
      console.log(`   - API URL: ${config.API_URL}`);
      console.log(`   - WebSocket URL: ${config.WS_URL}`);
      console.log(`   - Environment: ${config.NODE_ENV}`);
      
      // Network access guidance
      if (config.HOST === 'localhost' || config.HOST === '127.0.0.1') {
        console.log('ℹ️  Frontend configured for local access only.');
        console.log('   To allow network access from other devices:');
        console.log('   1. Update VITE_HOST in your .env file to match your backend HOST');
        console.log('   2. Ensure both frontend and backend use the same IP address');
      } else {
        console.log('🌐 Frontend configured for network access:');
        console.log(`   - Other devices can access: http://${config.HOST}:${config.FRONTEND_PORT}`);
        console.log(`   - Connecting to backend: ${config.API_URL}`);
      }
      
      return config;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        console.error('❌ Frontend Configuration Error:', error.message);
        console.error('   Missing/Invalid variables:', error.missingVars);
        console.error('');
        console.error('   📋 Frontend Setup Guide:');
        console.error('   1. Ensure your .env file has VITE_HOST, VITE_BACKEND_PORT, VITE_FRONTEND_PORT');
        console.error('   2. VITE_HOST must match the backend HOST for proper communication');
        console.error('   3. Restart the frontend development server after changes');
        console.error('');
        console.error('   💡 Example .env configuration:');
        console.error('   VITE_HOST=192.168.1.100');
        console.error('   VITE_BACKEND_PORT=5185');
        console.error('   VITE_FRONTEND_PORT=5180');
        throw error;
      }
      throw error;
    }
  }
}