import { useChainId } from "wagmi";
import { ContractName, getContractAddress } from "@/lib/contracts";
import WsROOTSAbi from "@/abis/wsROOTS";
import { useContractWriteFlow } from "./use-contract-write-flow";
import type { TransactionToastConfig } from "./use-transaction-toast";

const toastConfig: TransactionToastConfig = {
  pending: {
    title: "Unwrapping wsROOTS...",
    description: "Please wait while your transaction is confirmed.",
  },
  success: {
    title: "Unwrapped to sROOTS v1",
    description: "Your wsROOTS has been unwrapped to sROOTS v1. Next, unstake it to ROOTS v1.",
  },
  error: {
    title: "Unwrap failed",
    description: "There was an error unwrapping your wsROOTS. Please try again.",
    userRejected: {
      title: "Transaction cancelled",
      description: "You cancelled the unwrap transaction.",
    },
    insufficientFunds: {
      title: "Insufficient funds",
      description: "You don't have enough ETH for gas fees.",
    },
  },
};

/**
 * Unwrap wsROOTS → sROOTS v1 via the legacy wsROOTS contract. No approval is needed (the
 * contract burns the caller's own wsROOTS). The resulting sROOTS v1 can then be unstaked to
 * ROOTS v1 and migrated. wsROOTS is 18 decimals; the returned sROOTS v1 is 9 decimals and
 * scaled by the wstROOTS index (not 1:1).
 */
export function useUnwrapWsohm() {
  const chainId = useChainId();
  const wsohmAddress = getContractAddress(ContractName.WSROOTS, chainId);

  const { write, ...flow } = useContractWriteFlow({
    address: wsohmAddress,
    abi: WsROOTSAbi,
    functionName: "unwrap",
    toastConfig,
  });

  const unwrap = ({ amount, queryKey }: { amount: bigint; queryKey?: readonly unknown[] }) =>
    write({ args: [amount], queryKey });

  return { unwrap, ...flow };
}
