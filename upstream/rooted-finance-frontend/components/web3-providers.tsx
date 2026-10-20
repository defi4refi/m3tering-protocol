import { useMemo, useEffect } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { hashFn } from "@wagmi/core/query";
import { useQueryClient } from "@tanstack/react-query";
import { config } from "@/lib/wagmi-config";
import { allChains } from "@/lib/chains";
import { useTheme } from "@/components/theme-provider";
import { PrivyWagmiSync } from "@/components/privy-wagmi-sync";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

if (!PRIVY_APP_ID) {
  console.warn(
    "VITE_PRIVY_APP_ID is not set. Wallet connection will not work. " +
      "Get your app ID from the Privy dashboard at https://dashboard.privy.io",
  );
}

function ThemedPrivy({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const resolvedDark = resolvedTheme === "dark";

  const privyConfig = useMemo(
    () => ({
      // Use the app's theme (dark/light) for Privy's modal UI
      appearance: {
        theme: resolvedDark ? ("dark" as const) : ("light" as const),
        accentColor: (resolvedDark ? "#FFFFFF" : "#000000") as `#${string}`,
      },
      // Only show the chains we support
      defaultChain: allChains[0],
      supportedChains: [...allChains],
      // Embedded wallets — always create one so transactions go through
      // Privy's embedded wallet rather than an external injected wallet
      // (MetaMask, Zerion, etc.) that the user may have installed.
      embeddedWallets: {
        ethereum: {
          createOnLogin: "all-users" as const,
        },
      },
    }),
    [resolvedDark],
  );

  return (
    <PrivyProvider appId={PRIVY_APP_ID || "PLACEHOLDER"} config={privyConfig}>
      {children}
    </PrivyProvider>
  );
}

export function Web3Providers({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.setDefaultOptions({
      ...queryClient.getDefaultOptions(),
      queries: {
        ...queryClient.getDefaultOptions().queries,
        queryKeyHashFn: hashFn,
      },
    });
  }, [queryClient]);

  return (
    <ThemedPrivy>
      {/* Use @privy-io/wagmi's WagmiProvider (not wagmi's) so that Privy's
          connected wallets are bridged to wagmi state and all wagmi hooks
          (useWriteContract, useSendTransaction, etc.) route through Privy. */}
      <WagmiProvider config={config}>
        <PrivyWagmiSync />
        {children}
        {import.meta.env.DEV && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        )}
      </WagmiProvider>
    </ThemedPrivy>
  );
}
