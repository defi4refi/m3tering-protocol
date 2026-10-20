import { useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import RootsStakingV1Abi from "@/abis/RootsStakingV1";
import { useContractWriteFlow } from "./use-contract-write-flow";
import type { TransactionToastConfig } from "./use-transaction-toast";

const toastConfig: TransactionToastConfig = {
  pending: {
    title: "Unstaking sROOTS v1...",
    description: "Please wait while your transaction is confirmed.",
  },
  success: {
    title: "Unstaked to ROOTS v1",
    description: "Your sROOTS v1 has been unstaked to ROOTS v1. You can now migrate.",
  },
  error: {
    title: "Unstake failed",
    description: "There was an error unstaking your sROOTS v1. Please try again.",
    userRejected: {
      title: "Transaction cancelled",
      description: "You cancelled the unstake transaction.",
    },
    insufficientFunds: {
      title: "Insufficient funds",
      description: "You don't have enough ETH for gas fees.",
    },
  },
};

/**
 * Unstake sROOTS v1 → ROOTS v1 via the legacy Rooted Finance v1 staking contract (1:1). Requires a
 * prior exact-amount sROOTS v1 approval to the staking contract. This is the prerequisite
 * step for sROOTS v1 holders who want to migrate (the migrator only burns ROOTS v1).
 */
export function useUnstakeV1() {
  const chainId = useChainId();
  const stakingV1 = getContractAddress(ContractName.STAKING_V1, chainId);

  const { write, ...flow } = useContractWriteFlow({
    address: stakingV1,
    abi: RootsStakingV1Abi,
    functionName: "unstake",
    toastConfig,
  });

  const unstake = ({ amount, queryKey }: { amount: bigint; queryKey?: readonly unknown[] }) =>
    // unstake(_amount, _trigger=false) — trigger=false skips the (gas-heavy) rebase.
    write({ args: [amount, false], queryKey });

  return { unstake, ...flow };
}
