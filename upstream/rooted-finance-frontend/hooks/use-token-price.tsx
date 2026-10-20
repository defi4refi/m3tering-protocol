import type { Address } from "viem";
import { parseUnits } from "viem";
import { useReadContract } from "wagmi";
import PriceAbi from "@/abis/Price";
import gOhmAbi from "@/abis/wstROOTS";
import { getTokenAddress, TokenName } from "@/lib/tokens";
import { getContractAddress, ContractName } from "@/lib/contracts";
import { formatTokenAmount } from "@/lib/math";

const ONE_WSTROOTS = parseUnits("1", 18);
const PRICE_QUERY_OPTIONS = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

function sameAddress(a?: Address, b?: Address): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export const useTokenPrice = (chainId: number, tokenAddress?: Address): { price: number } => {
  const ohmAddress = getTokenAddress(TokenName.ROOTS, chainId);
  const usdsAddress = getTokenAddress(TokenName.USDS, chainId);
  const azusdAddress = getTokenAddress(TokenName.USDC, chainId);
  const gOhmAddress = getTokenAddress(TokenName.WSTROOTS, chainId);
  const priceAddress = getContractAddress(ContractName.PRICE, chainId);

  const isOhmToken = sameAddress(tokenAddress, ohmAddress);
  const isUsdsToken = sameAddress(tokenAddress, usdsAddress);
  const isAzusdToken = sameAddress(tokenAddress, azusdAddress);
  const isWSTROOTSToken = sameAddress(tokenAddress, gOhmAddress);

  // PRICE module returns ROOTS price in reserve (USDS) with 18 decimals.
  const { data: ohmPriceRaw } = useReadContract({
    address: priceAddress,
    abi: PriceAbi,
    functionName: "getCurrentPrice",
    chainId,
    query: {
      ...PRICE_QUERY_OPTIONS,
      enabled: !!tokenAddress && !!priceAddress && (isOhmToken || isWSTROOTSToken),
    },
  });

  // Convert exactly 1 wstROOTS to ROOTS via token contract helper.
  // wstRootsToStRoots returns stROOTS amount, then stRootsPerToken gives ROOTS per stROOTS.
  const { data: stRootsFromOneWSTROOTS } = useReadContract({
    address: gOhmAddress,
    abi: gOhmAbi,
    functionName: "wstRootsToStRoots",
    args: [ONE_WSTROOTS],
    chainId,
    query: {
      ...PRICE_QUERY_OPTIONS,
      enabled: !!tokenAddress && !!gOhmAddress && isWSTROOTSToken,
    },
  });

  const { data: stRootsPerToken } = useReadContract({
    address: gOhmAddress,
    abi: gOhmAbi,
    functionName: "stRootsPerToken",
    chainId,
    query: {
      ...PRICE_QUERY_OPTIONS,
      enabled: !!tokenAddress && !!gOhmAddress && isWSTROOTSToken,
    },
  });

  if (isUsdsToken || isAzusdToken) {
    // todo:Temporary assumption for stablecoin pricing.
    return { price: 1 };
  }

  if (isOhmToken) {
    return { price: ohmPriceRaw ? formatTokenAmount(ohmPriceRaw) : 0 };
  }

  if (isWSTROOTSToken) {
    if (!ohmPriceRaw || !stRootsFromOneWSTROOTS || !stRootsPerToken) return { price: 0 };

    const ohmPriceUsd = formatTokenAmount(ohmPriceRaw);
    const stRootsPerWstRoots = formatTokenAmount(stRootsFromOneWSTROOTS);
    const rootsPerStRoots = formatTokenAmount(stRootsPerToken);
    const rootsPerWstRoots = stRootsPerWstRoots * rootsPerStRoots;

    return { price: ohmPriceUsd * rootsPerWstRoots };
  }

  return { price: 0 };
};
