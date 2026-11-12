import { logger, redact, setLogSink } from './logger';

const PHRASE = 'test test test test test test test test test test test junk';
const KEY = `0x${'ab'.repeat(32)}`;

describe('redact', () => {
  it('removes 64-hex secrets and mnemonic-like phrases', () => {
    expect(redact(`key: ${KEY}; phrase: ${PHRASE}`)).toBe('key: [REDACTED]; phrase: [REDACTED]');
  });

  it('keeps addresses (40 hex) intact', () => {
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    expect(redact(address)).toBe(address);
  });
});

describe('logger', () => {
  it('redacts sensitive context keys', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    logger.warn('unlock failed', { pin: '123456', attempt: 3 });
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({ level: 'warn', message: 'unlock failed', pin: '[REDACTED]', attempt: 3 }),
    );
    spy.mockRestore();
  });
});

describe('setLogSink', () => {
  afterEach(() => setLogSink(null));

  it('receives redacted info, warn and error lines with the original Error, never debug', () => {
    for (const level of ['debug', 'info', 'warn', 'error'] as const) {
      jest.spyOn(console, level).mockImplementation(() => undefined);
    }
    const sink = jest.fn();
    const failure = new Error(`bad key ${KEY}`);
    setLogSink(sink);

    logger.debug('noise');
    logger.info('started');
    logger.error(`import failed: ${PHRASE}`, { error: failure, pin: '123456' });

    expect(sink).toHaveBeenCalledTimes(2);
    expect(sink).toHaveBeenNthCalledWith(1, {
      level: 'info',
      message: 'started',
      context: undefined,
      error: undefined,
    });
    expect(sink).toHaveBeenNthCalledWith(2, {
      level: 'error',
      message: 'import failed: [REDACTED]',
      context: { error: 'bad key [REDACTED]', pin: '[REDACTED]' },
      error: failure,
    });
    jest.restoreAllMocks();
  });

  it('stops after the sink is removed', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sink = jest.fn();
    setLogSink(sink);
    setLogSink(null);
    logger.warn('quiet');
    expect(sink).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
