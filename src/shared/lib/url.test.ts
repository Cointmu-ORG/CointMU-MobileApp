import { formatUrlHost } from './url';

describe('formatUrlHost', () => {
  it.each([
    ['https://rpc.cointmu.invalid/', 'rpc.cointmu.invalid'],
    ['http://10.0.0.1:8585', '10.0.0.1:8585'],
    ['https://node.invalid/rpc', 'node.invalid/rpc'],
    ['not a url', 'not a url'],
  ])('%s → %s', (url, expected) => {
    expect(formatUrlHost(url)).toBe(expected);
  });
});
