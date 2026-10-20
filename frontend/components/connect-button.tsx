import { usePrivy, useLogout } from "@privy-io/react-auth";
import { useDisconnect, useSwitchChain } from "wagmi";
import { useConnectedAddress } from "@/hooks/use-connected-address";
import { Button } from "@/components/ui-button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Icon } from "@/components/icon";
import { ChainIcon } from "@/components/chain-icon";
import { allChains } from "@/lib/chains";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Connect button using Privy for wallet connection.
 *
 * Shows "Sign In" when disconnected, or address + disconnect button when
 * connected. The disconnect button is always visible (not in a dropdown)
 * so users can always disconnect. Disconnects both Privy and wagmi state.
 */
export function ConnectButton() {
  const { isMobile } = useIsMobile();
  const { ready, authenticated, login } = usePrivy();
  const { logout } = useLogout();
  const { switchChain } = useSwitchChain();
  const { address, isConnected, chainId } = useConnectedAddress();
  const { disconnect } = useDisconnect();

  const activeChain = allChains.find((c) => c.id === chainId);
  const isWrongNetwork = isConnected && !activeChain;

  // Connected if EITHER Privy is authenticated OR wagmi has a connection.
  // This ensures we always show a disconnect button when any wallet is
  // connected, even if the states are temporarily out of sync.
  const connected = address && (authenticated || isConnected);

  const handleDisconnect = () => {
    // Disconnect wagmi (clears wagmi connection state)
    disconnect();
    // Logout from Privy (clears Privy session)
    logout();
  };

  if (!connected) {
    return (
      <Button
        onClick={() => login()}
        disabled={!ready}
        type="button"
        size={isMobile ? "sm" : "md"}
      >
        <Icon name="WalletIcon" size={16} />
        Sign In
      </Button>
    );
  }

  if (isWrongNetwork) {
    return (
      <div className="flex gap-2">
        <Button
          variant="secondary"
          type="button"
          size={isMobile ? "sm" : "md"}
          onClick={() => switchChain({ chainId: allChains[0].id })}
        >
          Switch to {allChains[0].name}
        </Button>
        <Button
          variant="secondary"
          onClick={handleDisconnect}
          type="button"
          size={isMobile ? "sm" : "md"}
          className={isMobile ? "p-2" : "p-2.5"}
          aria-label="Disconnect"
        >
          <Icon name="WalletIcon" size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      {activeChain && (
        <Button
          variant="secondary"
          type="button"
          size={isMobile ? "sm" : "md"}
          aria-label={activeChain?.name ?? "Switch network"}
          className={isMobile ? "p-2" : "p-2.5"}
        >
          <ChainIcon chainId={activeChain.id} size={isMobile ? 16 : 20} rounded />
        </Button>
      )}
      <Button
        variant="secondary"
        type="button"
        size={isMobile ? "sm" : "md"}
        className="px-3"
        title={address}
      >
        {isMobile ? (
          <Icon name="WalletIcon" size={16} />
        ) : (
          shortenAddress(address)
        )}
      </Button>
      <Button
        variant="secondary"
        onClick={handleDisconnect}
        type="button"
        size={isMobile ? "sm" : "md"}
        className={isMobile ? "p-2" : "p-2.5"}
        aria-label="Disconnect wallet"
        title="Disconnect"
      >
        <Icon name="WalletIcon" size={16} />
        {!isMobile && <span className="ml-1 text-red">Disconnect</span>}
      </Button>
    </div>
  );
}
