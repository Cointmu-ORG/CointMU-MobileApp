import { logger, redact } from './logger';

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
