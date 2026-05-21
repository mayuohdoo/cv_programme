/**
 * Unit Tests for Logger Utility
 */

import { createLogger, LogLevel } from './logger';

describe('Logger', () => {
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    logger = createLogger('TEST');
    jest.clearAllMocks();
  });

  it('should create logger with prefix', () => {
    logger.info('test message');
    expect(console.info).toHaveBeenCalledWith('[TEST] test message');
  });

  it('should respect log level', () => {
    logger.setLevel(LogLevel.ERROR);
    
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
    
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('[TEST] error message');
  });

  it('should log all levels when set to DEBUG', () => {
    logger.setLevel(LogLevel.DEBUG);
    
    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');
    
    expect(console.debug).toHaveBeenCalled();
    expect(console.info).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('should pass additional arguments to console', () => {
    const obj = { key: 'value' };
    logger.info('message', obj, 123);
    
    expect(console.info).toHaveBeenCalledWith('[TEST] message', obj, 123);
  });
});
