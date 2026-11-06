import { callRpc, RpcUnavailableError } from './rpc-call';

const FAST = { timeoutMs: 50, retries: 2, baseDelayMs: 1 };

describe('callRpc', () => {
  it('returns the first successful result after retrying', async () => {
    const call = jest
      .fn<Promise<bigint>, []>()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(5n);
    await expect(callRpc(call, FAST)).resolves.toBe(5n);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retry budget with a wrapped error', async () => {
    const call = jest.fn<Promise<bigint>, []>().mockRejectedValue(new Error('down'));
    await expect(callRpc(call, FAST)).rejects.toBeInstanceOf(RpcUnavailableError);
    expect(call).toHaveBeenCalledTimes(FAST.retries + 1);
  });

  it('times out a hanging call', async () => {
    const call = () => new Promise<bigint>(() => undefined);
    await expect(callRpc(call, { ...FAST, retries: 0 })).rejects.toBeInstanceOf(
      RpcUnavailableError,
    );
  });
});
