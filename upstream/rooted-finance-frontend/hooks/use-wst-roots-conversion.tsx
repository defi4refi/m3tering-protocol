import { useMemo } from "react";
import { useReadContract, useChainId } from "wagmi";
import { parseUnits, parseEther, formatUnits, formatEther } from "viem";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import wstROOTSAbi from "@/abis/wstROOTS";

/** Trim trailing zeros from a decimal string, keeping at least `minDecimals` places. */
function trimDecimals(value: string, maxDecimals: number, minDecimals = 2): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  const fixed = num.toFixed(maxDecimals);
  const [int, dec] = fixed.split(".");
  if (!dec) return fixed;
  const trimmed = dec.replace(/0+$/, "").padEnd(minDecimals, "0");
  return `${int}.${trimmed}`;
}

/** Read the wstROOTS contract's stRootsPerToken (the source of truth for conversions). */
export function useGohmIndex({ enabled = true }: { enabled?: boolean } = {}) {
  const chainId = useChainId();
  const gohmAddress = getTokenAddress(TokenName.WSTROOTS, chainId);

  const { data: index, isLoading } = useReadContract({
    address: gohmAddress,
    abi: wstROOTSAbi,
    functionName: "stRootsPerToken",
    query: {
      enabled: enabled && !!gohmAddress,
    },
  });

  return { index: index as bigint | undefined, isLoading };
}

/**
 * Compute the Wrap-page output amount for a given input. "wrap"/"unwrap" use the wstROOTS
 * index with client-side bigint math (matches wstROOTS.balanceTo / wstROOTS.balanceFrom exactly).
 * "identity" is the 1:1 sROOTS → ROOTS path: no index read, formatting only.
 */
export function useWstRootsConversion(mode: "wrap" | "unwrap" | "identity", inputAmount: string) {
  const { index } = useGohmIndex({ enabled: mode !== "identity" });

  const outputAmount = useMemo(() => {
    if (!inputAmount || parseFloat(inputAmount) === 0) return "";
    if (mode === "identity") return trimDecimals(inputAmount, 4);
    if (!index || index === 0n) return "";

    try {
      if (mode === "wrap") {
        // wstROOTS.balanceTo: wstROOTS = sROOTS * 1e18 / index
        const ohmBigInt = parseUnits(inputAmount, 18);
        const gohmBigInt = (ohmBigInt * 10n ** 18n) / index;
        return trimDecimals(formatEther(gohmBigInt), 6);
      }
      // wstROOTS.balanceFrom: sROOTS = wstROOTS * index / 1e18
      const gohmBigInt = parseEther(inputAmount);
      const ohmBigInt = (gohmBigInt * index) / 10n ** 18n;
      return trimDecimals(formatUnits(ohmBigInt, 18), 4);
    } catch {
      return "";
    }
  }, [inputAmount, index, mode]);

  return { outputAmount };
}

/**
 * Conversion rates using the wstROOTS index.
 */
export function useWstRootsConversionRate() {
  const { index, isLoading } = useGohmIndex();

  const rates = useMemo(() => {
    if (!index || index === 0n) return { ohmPerGohm: undefined, gohmPerOhm: undefined };

    // wstROOTS index is stROOTS per 1 wstROOTS, scaled to 18 decimals.
    const ohmPerGohm = trimDecimals(formatUnits(index, 18), 3);
    // 1 ROOTS (1e18) -> wstROOTS: wstROOTS = 1e18 * 1e18 / index
    const gohmBigInt = (10n ** 18n * 10n ** 18n) / index;
    const gohmPerOhm = trimDecimals(formatEther(gohmBigInt), 6);

    return { ohmPerGohm, gohmPerOhm };
  }, [index]);

  return { ...rates, isLoading };
}

/** Read the total supply of wstROOTS from the contract (returns bigint in 18 decimals). */
export function useGohmTotalSupply() {
  const chainId = useChainId();
  const gohmAddress = getTokenAddress(TokenName.WSTROOTS, chainId);
  const { data } = useReadContract({
    address: gohmAddress,
    abi: wstROOTSAbi,
    functionName: "totalSupply",
    query: { enabled: !!gohmAddress },
  });
  return { totalSupply: data as bigint | undefined };
}
