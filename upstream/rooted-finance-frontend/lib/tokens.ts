import type { Address } from "viem";
import type { IconName } from "@/components/icon.tsx";
import type { ChainId } from "./contracts";
import { base, baseSepolia } from "@/lib/chains";

export type TokenInfo = {
  addresses: Partial<Record<ChainId, Address>>;
  symbol: string;
  decimals: number;
  icon: IconName;
};

export enum TokenName {
  USDC = "USDC",
  USDS = "USDS",
  ROOTS = "ROOTS",
  STROOTS = "STROOTS",
  WSTROOTS = "WSTROOTS",
  BUCKY = "BUCKY",
  RIDX = "RIDX",
  V1_ROOTS = "V1_ROOTS",
  V1_SROOTS = "V1_SROOTS",
  WSROOTS = "WSROOTS",
  STATA_USDC = "STATA_USDC",
}

export const TOKENS: Record<TokenName, TokenInfo> = {
  USDC: {
    addresses: {
      [base.id]: "0x3595ca37596d5895b70efab592ac315d5b9809b2",
      [baseSepolia.id]: "0xb6a1BC3D383f8751eF0CC216943290740E4D1493",
    },
    symbol: "USDC",
    decimals: 6,
    icon: "USDCTokenIcon",
  },
  ROOTS: {
    addresses: {
      [base.id]: "0x0000000000000000000000000000000000000000",
      [baseSepolia.id]: "0x823d5d44F9E647402c949376E54f709Ab3a9015b",
    },
    symbol: "ROOTS",
    decimals: 18,
    icon: "ROOTSTokenIcon",
  },
  STROOTS: {
    addresses: {
      [base.id]: "0x0000000000000000000000000000000000000000",
      [baseSepolia.id]: "0xdb3D61dEE55eF664412BcEBEd144981B2Fc11a34",
    },
    symbol: "stROOTS",
    decimals: 18,
    icon: "STROOTSTokenIcon",
  },
  WSTROOTS: {
    addresses: {
      [base.id]: "0x0000000000000000000000000000000000000000",
      [baseSepolia.id]: "0x933E4B8e744733FAaFD67aC99eD8987C9Aa5E533",
    },
    symbol: "wstROOTS",
    decimals: 18,
    icon: "WSTROOTSTokenIcon",
  },
  BUCKY: {
    addresses: {
      [base.id]: "0x0000000000000000000000000000000000000000",
      [baseSepolia.id]: "0xd8D866BB5EB8E93Da1c2f3c47Df4ab0E2665422E",
    },
    symbol: "Bucky",
    decimals: 18,
    icon: "BuckyTokenIcon",
  },
  RIDX: {
    addresses: {
      [base.id]: "0x0000000000000000000000000000000000000000",
      [baseSepolia.id]: "0x1C98820e839C3A92C041312259A785B5e16Df997",
    },
    symbol: "RIDX",
    decimals: 18,
    icon: "WSTROOTSTokenIcon",
  },
  USDS: {
    addresses: {
      [base.id]: "0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD",
      [baseSepolia.id]: "0x74Ca575601aa47a1aa44bD6786F3C0be36afA079",
    },
    symbol: "sUSDS",
    decimals: 18,
    icon: "USDCTokenIcon",
  },
  V1_ROOTS: {
    addresses: {
      [base.id]: "0x0000000000000000000000000000000000000000",
    },
    symbol: "ROOTS v1",
    decimals: 9,
    icon: "ROOTSTokenIcon",
  },
  V1_SROOTS: {
    addresses: {
      [base.id]: "0x0000000000000000000000000000000000000000",
    },
    symbol: "stROOTS v1",
    decimals: 9,
    icon: "ROOTSTokenIcon",
  },
  WSROOTS: {
    addresses: {
      [base.id]: "0x0000000000000000000000000000000000000000",
    },
    symbol: "wsROOTS",
    decimals: 18,
    icon: "WSTROOTSTokenIcon",
  },
  STATA_USDC: {
    addresses: {
      [baseSepolia.id]: "0xb3f8cbBb5F63928ffaeA4545370ceB598f270FbE",
    },
    symbol: "USDC",
    decimals: 6,
    icon: "USDCTokenIcon",
  },
};

export function getTokenAddress(token: TokenName, chainId: ChainId): Address | undefined {
  return TOKENS[token].addresses[chainId];
}

export function requireTokenAddress(token: TokenName, chainId: ChainId): Address {
  const address = getTokenAddress(token, chainId);
  if (!address) {
    throw new Error(`Token ${token} not found on chain ${chainId}`);
  }
  return address;
}
