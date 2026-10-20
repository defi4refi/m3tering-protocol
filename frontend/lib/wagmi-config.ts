import { createConfig } from "@privy-io/wagmi";
import { createStorage } from "wagmi";
import { allChains, transports } from "@/lib/chains";
import { DATA_SUFFIX } from "@/lib/attribution";

/**
 * Wagmi config for use with Privy.
 *
 * Uses @privy-io/wagmi's createConfig which:
 * - Sets multiInjectedProviderDiscovery: false (prevents multi-wallet detection)
 * - Filters out non-mock connectors from any we pass
 *
 * Uses @privy-io/wagmi's WagmiProvider which:
 * - Sets reconnectOnMount: false (no auto-reconnect to old wallets)
 * - Wraps children in PrivyWagmiConnector which bridges Privy wallets to wagmi
 *
 * Uses a fresh storage key ("rooted-privy-wagmi") so old RainbowKit wagmi
 * state (stored under "wagmi.store") is NOT restored. This prevents stale
 * MetaMask connections from bypassing Privy, while still allowing
 * useSyncPrivyWallets to persist recentConnectorId for proper reconnection.
 */
export const config = createConfig({
  chains: allChains,
  transports,
  ssr: false,
  storage: createStorage({
    key: "rooted-privy-wagmi",
  }),
  batch: {
    multicall: true,
  },
});

export { DATA_SUFFIX };
