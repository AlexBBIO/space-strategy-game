import winston from 'winston';

// Create a custom format with timestamp and colors
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: customFormat,
  transports: [
    // Console transport for all logs
    new winston.transports.Console(),
    
    // File transports for different log levels
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
  ],
});

// Add extra debug logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.debug('Logging initialized in development mode');
}
