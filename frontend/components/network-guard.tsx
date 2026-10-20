import { useSwitchChain } from "wagmi";
import { useConnectedAddress } from "@/hooks/use-connected-address";
import { allChains } from "@/lib/chains";
import { Button } from "@/components/ui-button";
import { Card } from "@/components/ui-card";

/**
 * Shows a "switch network" prompt if the user is connected but on an
 * unsupported chain. Renders children when on the correct network.
 */
export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { address, isConnected, chainId } = useConnectedAddress();
  const { switchChain, isPending } = useSwitchChain();

  const activeChain = allChains.find((c) => c.id === chainId);
  const isWrongNetwork = isConnected && address && !activeChain;

  if (!isWrongNetwork) return <>{children}</>;

  return (
    <Card className="p-8 flex flex-col items-center gap-4 text-center">
      <p className="text-lg font-semibold text-primary-t">Wrong Network</p>
      <p className="text-sm text-secondary-t">
        You're connected to an unsupported network. Switch to {allChains[0].name} to continue.
      </p>
      <Button
        onClick={() => switchChain({ chainId: allChains[0].id })}
        disabled={isPending}
      >
        {isPending ? "Switching..." : `Switch to ${allChains[0].name}`}
      </Button>
    </Card>
  );
}
