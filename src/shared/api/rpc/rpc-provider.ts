import { JsonRpcProvider, Network } from 'ethers';

export type RpcEndpoint = {
  readonly url: string;
  readonly chainId: number;
};

/**
 * The only place a JsonRpcProvider is constructed (conventions: blockchain code).
 * staticNetwork skips the eth_chainId probe on every request; HTTP polling only (D-09).
 */
export function createRpcProvider({ url, chainId }: RpcEndpoint): JsonRpcProvider {
  const network = Network.from(chainId);
  return new JsonRpcProvider(url, network, { staticNetwork: network });
}
