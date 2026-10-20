import { useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, type WalletClient, type Address } from "viem";
import { useConnectedAddress } from "@/hooks/use-connected-address";
import { allChains } from "@/lib/chains";

/**
 * Gets a viem WalletClient from the active Privy wallet's EIP-1193 provider.
 *
 * This bypasses wagmi's connector system entirely, which is unreliable with
 * the @privy-io/wagmi bridge. The wallet client can be used directly with
 * viem's writeContract, sendTransaction, etc.
 *
 * Returns { walletClient, address, chainId } or { walletClient: undefined, ... }
 * if not authenticated.
 */
export function usePrivyWalletClient() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { address: connectedAddress, chainId } = useConnectedAddress();

  // Prefer the Privy embedded wallet so transactions don't open
  // an external injected wallet (MetaMask, Zerion, etc.).
  const activeWallet =
    wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
  const [provider, setProvider] = useState<any>(undefined);

  // Resolve the EIP-1193 provider from Privy and store it in state.
  // viem's custom() transport needs the actual provider object, not a Promise.
  useEffect(() => {
    if (!activeWallet) {
      setProvider(undefined);
      return;
    }
    let cancelled = false;
    activeWallet
      .getEthereumProvider()
      .then((p) => {
        if (!cancelled) setProvider(p);
      })
      .catch(() => {
        if (!cancelled) setProvider(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWallet]);

  const walletClient = useMemo(() => {
    if (!ready || !authenticated || !provider || !connectedAddress) return undefined;

    const chain = allChains.find((c) => c.id === chainId) ?? allChains[0];

    return createWalletClient({
      chain,
      account: connectedAddress as Address,
      transport: custom(provider),
    }) as WalletClient;
  }, [ready, authenticated, provider, connectedAddress, chainId]);

  return {
    walletClient,
    address: connectedAddress,
    chainId,
    isReady: !!walletClient,
  };
}
