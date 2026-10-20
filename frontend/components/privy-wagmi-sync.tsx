import { useEffect, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

/**
 * Explicitly bridges the active Privy wallet to wagmi.
 *
 * @privy-io/wagmi's useSyncPrivyWallets sets up connectors for Privy wallets
 * but may not actually connect them in all cases (session restore, page
 * transitions, etc). This component directly connects wagmi to the Privy
 * wallet's EIP-1193 provider using wagmi's useConnect hook with an injected()
 * connector targeting the Privy provider.
 *
 * Without this, wagmi's useWriteContract throws "Connector not connected"
 * even though the user is signed in via Privy.
 */
export function PrivyWagmiSync() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { address: wagmiAddress, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const lastSyncedAddress = useRef<string | undefined>(undefined);
  const isSyncing = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || wallets.length === 0) return;

    // Prefer the Privy embedded wallet so wagmi reads use the same
    // wallet/chain as our Privy-based writes.
    const activeWallet =
      wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
    if (!activeWallet) return;

    // Already connected to the right wallet
    if (
      isConnected &&
      wagmiAddress?.toLowerCase() === activeWallet.address.toLowerCase()
    ) {
      lastSyncedAddress.current = activeWallet.address;
      return;
    }

    // Already syncing
    if (isSyncing.current) return;

    isSyncing.current = true;

    (async () => {
      try {
        const provider = await activeWallet.getEthereumProvider();

        // Build connector ID matching @privy-io/wagmi's toWalletConnectorId logic
        const connectorId =
          activeWallet.walletClientType === "privy"
            ? `${activeWallet.meta.id}.${activeWallet.address}`
            : activeWallet.meta.id;

        // Check if the connector already exists in wagmi's config
        const existingConnector = connectors.find((c) => c.id === connectorId);

        if (existingConnector) {
          // Connector exists — connect to it if not already connected
          if (!isConnected) {
            await connectAsync({ connector: existingConnector });
          }
        } else {
          // Connector doesn't exist — create a new injected connector
          // targeting the Privy wallet's provider
          const privyConnector = injected({
            target: {
              provider: provider as any,
              id: connectorId,
              name: activeWallet.meta.name,
              icon:
                typeof activeWallet.meta.icon === "string"
                  ? activeWallet.meta.icon
                  : undefined,
            },
          });

          // If wagmi is connected to a different wallet, disconnect first
          if (isConnected) {
            try {
              await disconnectAsync();
            } catch {
              // Ignore disconnect errors
            }
          }

          await connectAsync({ connector: privyConnector });
        }

        lastSyncedAddress.current = activeWallet.address;
      } catch (err) {
        // Connector might not be ready yet — will retry on next render
        console.warn("[PrivyWagmiSync] Failed to connect wagmi to Privy wallet:", err);
      } finally {
        isSyncing.current = false;
      }
    })();
  }, [
    ready,
    authenticated,
    wallets,
    isConnected,
    wagmiAddress,
    connectAsync,
    disconnectAsync,
    connectors,
  ]);

  return null;
}
