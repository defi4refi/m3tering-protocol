import {
  base,
  baseSepolia,
} from "viem/chains";
import { http, type Transport } from "viem";
import baseIcon from "@/icons/chain-base.svg";

const withIcon = <T extends { id: number }>(chain: T, iconUrl: string) => ({
  ...chain,
  iconUrl,
  iconBackground: "transparent",
});

const baseWithIcon = withIcon(base, baseIcon);
const baseSepoliaWithIcon = withIcon(baseSepolia, baseIcon);

/**
 * Chains available in the wallet network selector.
 */
export const PRODUCTION_CHAINS = [baseWithIcon] as const;

/**
 * Whether testnet mode is enabled via environment variable.
 */
export const isTestnetMode = Boolean(import.meta.env.VITE_TESTNET_MODE);

/**
 * Active chains based on testnet mode.
 * In testnet mode, Base Sepolia is used. In production, Base is used.
 */
export const activeChains = isTestnetMode
  ? ([baseSepoliaWithIcon] as const)
  : PRODUCTION_CHAINS;

/**
 * All chains for the wagmi config.
 */
export const allChains = isTestnetMode
  ? ([baseSepoliaWithIcon] as const)
  : PRODUCTION_CHAINS;

/**
 * Custom RPC transports per chain.
 */
export const transports: Record<number, Transport> = {
  [base.id]: http("https://mainnet.base.org"),
  [baseSepolia.id]: http("https://base-sepolia-rpc.publicnode.com"),
};

// Re-export chain objects for convenience
export { base, baseSepolia };
