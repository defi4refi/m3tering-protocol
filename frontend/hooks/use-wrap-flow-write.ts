import { useChainId } from "wagmi";
import { useConnectedAddress } from "@/hooks/use-connected-address";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { TOKENS } from "@/lib/tokens";
import RootsStakingAbi from "@/abis/RootsStaking";
import wstRootsAbi from "@/abis/wstROOTS";
import { WRAP_FLOWS, type WrapFlow } from "@/modules/roots-wrap-flows";
import { useContractWriteFlow } from "./use-contract-write-flow";
import type { TransactionToastConfig } from "./use-transaction-toast";
import type { Abi, Address } from "viem";

type StakingCall = {
  /** Contract that actually exposes the function for this flow. */
  contract: ContractName;
  abi: Abi;
  functionName: "stake" | "wrap" | "unstake" | "unwrap";
  args: (address: Address, amount: bigint) => readonly unknown[];
  /**
   * Contract the input token must be approved to (it pulls the input via
   * transferFrom). Undefined when the function burns the caller's own balance
   * (unstake/unwrap) — no approval step needed.
   */
  approvalSpender?: ContractName;
};

/**
 * Contract call for each Wrap-page flow.
 *
 * Deployed contract surface:
 *   - RootsStaking:  stake(address,uint256,bool,bool) / unstake(address,uint256,bool,bool)
 *   - wstROOTS:      wrap(uint256)  / unwrap(uint256)
 */
const FLOW_CALLS: Record<WrapFlow, StakingCall> = {
  // stake(to, amount, true, false) -> ROOTS → stROOTS  [rebasing=true, StakingAdapter sends stROOTS directly]
  "wrap-roots": { contract: ContractName.STAKING, abi: RootsStakingAbi, functionName: "stake", args: (addr, amount) => [addr, amount, true, false], approvalSpender: ContractName.STAKING },
  // stake(to, amount, false, false) -> ROOTS → wstROOTS  [rebasing=false, StakingAdapter wraps to wstROOTS]
  "wrap-roots-to-wstroots": { contract: ContractName.STAKING, abi: RootsStakingAbi, functionName: "stake", args: (addr, amount) => [addr, amount, false, false], approvalSpender: ContractName.STAKING },
  // wrap(amount) -> stROOTS → wstROOTS  [wstROOTS pulls stROOTS]
  "wrap-stroots": { contract: ContractName.WSTROOTS, abi: wstRootsAbi, functionName: "wrap", args: (_addr, amount) => [amount], approvalSpender: ContractName.WSTROOTS },
  // unwrap(amount) -> wstROOTS → stROOTS  [burns caller's wstROOTS, no approval needed]
  "unwrap-wstroots": { contract: ContractName.WSTROOTS, abi: wstRootsAbi, functionName: "unwrap", args: (_addr, amount) => [amount], approvalSpender: undefined },
  // unstake(to, amount, false, false) -> wstROOTS → ROOTS  [Staking pulls wstROOTS via transferFrom]
  "unwrap-wstroots-to-roots": { contract: ContractName.STAKING, abi: RootsStakingAbi, functionName: "unstake", args: (addr, amount) => [addr, amount, false, false], approvalSpender: ContractName.STAKING },
  // unstake(to, amount, false, true) -> stROOTS → ROOTS  [rebasing=true, StakingAdapter pulls stROOTS directly]
  "unstake-stroots": { contract: ContractName.STAKING, abi: RootsStakingAbi, functionName: "unstake", args: (addr, amount) => [addr, amount, false, true], approvalSpender: ContractName.STAKING },
};

/** Contract the input token must be approved to for a flow, or undefined if none is needed. */
export function getWrapFlowApprovalSpender(flow: WrapFlow): ContractName | undefined {
  return FLOW_CALLS[flow].approvalSpender;
}

function toastConfigFor(flow: WrapFlow): TransactionToastConfig {
  const { input, output, toast } = WRAP_FLOWS[flow];
  const from = TOKENS[input].symbol;
  const to = TOKENS[output].symbol;
  return {
    pending: {
      title: `${toast.progressive} ${from}...`,
      description: "Please wait while your transaction is confirmed.",
    },
    success: {
      title: `${toast.past} ${from} to ${to}`,
      description: `Your ${from} has been ${toast.past.toLowerCase()} to ${to}.`,
    },
    error: {
      title: `${toast.noun} transaction failed`,
      description: `There was an error ${toast.progressive.toLowerCase()} ${from}. Please try again.`,
      userRejected: {
        title: "Transaction cancelled",
        description: `You cancelled the ${toast.noun.toLowerCase()} transaction.`,
      },
      insufficientFunds: {
        title: "Insufficient funds",
        description: "You don't have enough ETH for gas fees.",
      },
    },
  };
}

/**
 * Executes the staking-contract write for a Wrap-page flow (ROOTS/sROOTS → wstROOTS, wstROOTS/sROOTS → ROOTS).
 * Built on useContractWriteFlow for gas buffering, double-submit protection, query
 * invalidation, and toasts. Requires a prior input-token approval to the staking contract.
 */
export function useWrapFlowWrite(flow: WrapFlow) {
  const { address } = useConnectedAddress();
  const chainId = useChainId();
  const call = FLOW_CALLS[flow];
  const targetAddress = getContractAddress(call.contract, chainId);

  const { write, ...rest } = useContractWriteFlow({
    address: targetAddress,
    abi: call.abi,
    functionName: call.functionName,
    toastConfig: toastConfigFor(flow),
  });

  const execute = ({ amount, queryKey }: { amount: bigint; queryKey?: readonly unknown[] }) => {
    if (!address) return;
    return write({ args: call.args(address, amount), queryKey });
  };

  return { execute, ...rest };
}
