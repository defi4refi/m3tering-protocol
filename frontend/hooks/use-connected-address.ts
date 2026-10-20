import { useAccount, useChainId } from "wagmi";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import type { Address } from "viem";

/**
 * Returns the connected wallet address and chain ID, checking both wagmi
 * and Privy. wagmi's useAccount may not return an address when the
 * @privy-io/wagmi bridge hasn't connected, so we fall back to Privy's
 * useWallets() for the address and chain ID.
 */
export function useConnectedAddress() {
  const { ready, authenticated } = usePrivy();
  const { address: wagmiAddress, isConnected: wagmiConnected, chainId: wagmiChainId } = useAccount();
  const wagmiDefaultChainId = useChainId();
  const { wallets } = useWallets();

  // Get the first connected wallet from Privy as fallback
  const privyWallet = wallets[0];
  const privyAddress = privyWallet?.address as Address | undefined;

  // Parse Privy chain ID (CAIP-2 format: "eip155:84532" → 84532)
  const privyChainId = (() => {
    if (!privyWallet?.chainId) return undefined;
    const parts = privyWallet.chainId.split(":");
    const id = Number(parts[parts.length - 1]);
    return Number.isNaN(id) ? undefined : id;
  })();

  // Prefer wagmi address (has proper chain tracking), fall back to Privy
  const address = (wagmiAddress || (authenticated ? privyAddress : undefined)) as Address | undefined;
  const isConnected = wagmiConnected || (ready && authenticated && !!privyAddress);

  // Chain ID: prefer wagmi's connected chainId, then wagmi's default chainId
  // (which reflects the config's chain), then Privy's wallet chainId
  const chainId = wagmiChainId ?? wagmiDefaultChainId ?? privyChainId;

  return {
    address,
    isConnected,
    chainId,
    isWrongNetwork: wagmiConnected && !wagmiChainId,
  };
}
