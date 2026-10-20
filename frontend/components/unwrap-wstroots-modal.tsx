import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { useChainId, useReadContract } from "wagmi";
import { useConnectedAddress } from "@/hooks/use-connected-address";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui-dialog";
import { TransactionSuccessDialog } from "@/components/transaction-steps";
import { Button } from "@/components/ui-button";
import { TokenBigInput } from "@/components/ui-token-big-input";
import { useToken } from "@/hooks/use-token";
import { useUnwrapWsohm } from "@/hooks/use-unwrap-wsohm";
import { ContractName, getContractAddress } from "@/lib/contracts";
import { TokenName } from "@/lib/tokens";
import { formatTokenDisplay } from "@/lib/math";
import WsROOTSAbi from "@/abis/wsROOTS";

interface UnwrapWstRootsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WSROOTS_DECIMALS = 18;
const SROOTS_DECIMALS = 9;

export function UnwrapWstRootsModal({ isOpen, onClose }: UnwrapWstRootsModalProps) {
  const { address } = useConnectedAddress();
  const chainId = useChainId();
  const [amount, setAmount] = useState("");

  const wsohmAddress = getContractAddress(ContractName.WSROOTS, chainId);

  const wsohmToken = useToken(TokenName.WSROOTS, address);
  const gohmToken = useToken(TokenName.WSTROOTS);
  // wsROOTS has no direct price feed; it tracks wstROOTS, so display value using the wstROOTS price.
  const inputToken = useMemo(
    () => ({ ...wsohmToken, price: gohmToken.price }),
    [wsohmToken, gohmToken.price],
  );

  const balance = wsohmToken.balance ?? 0n;

  const amountBigInt = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, WSROOTS_DECIMALS);
    } catch {
      return 0n;
    }
  }, [amount]);

  // Preview sROOTS v1 received (not 1:1 — scaled by the wstROOTS index).
  const { data: sohmOut } = useReadContract({
    address: wsohmAddress,
    abi: WsROOTSAbi,
    functionName: "wROOTSTosROOTS",
    args: [amountBigInt],
    query: { enabled: !!wsohmAddress && amountBigInt > 0n },
  });
  const receiveAmount =
    sohmOut !== undefined ? formatTokenDisplay(sohmOut, SROOTS_DECIMALS, { digits: 4 }) : "0";

  const {
    unwrap,
    isPending: isUnwrapping,
    isSuccess: unwrapSuccess,
    hash: unwrapHash,
    reset: resetUnwrap,
  } = useUnwrapWsohm();

  const buttonState = useMemo(() => {
    if (!address) return { disabled: true, label: "Sign In" };
    if (!amount || amountBigInt === 0n) return { disabled: true, label: "Enter Amount" };
    if (amountBigInt > balance) return { disabled: true, label: "Insufficient wsROOTS Balance" };
    return { disabled: false, label: "Unwrap to sROOTS v1" };
  }, [address, amount, amountBigInt, balance]);

  const handleMax = () => setAmount(formatUnits(balance, WSROOTS_DECIMALS));
  const handleUnwrap = () => unwrap({ amount: amountBigInt });
  const handleClose = () => onClose();

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset fn is stable enough; only re-run on open/close
  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      resetUnwrap();
    }
  }, [isOpen]);

  // Success state.
  if (unwrapSuccess) {
    return (
      <TransactionSuccessDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Unwrapped to sROOTS v1"
        description="Next, unstake your sROOTS v1 to ROOTS v1, then migrate."
        hash={unwrapHash}
      />
    );
  }

  // Input phase (single transaction — no approval needed for unwrap).
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-md mx-auto p-6 gap-4">
        <DialogHeader className="text-center !gap-2">
          <DialogTitle className="text-[20px]/[24px] font-semibold text-primary-t">
            Unwrap wsROOTS
          </DialogTitle>
          <p className="text-xs/4 font-normal text-secondary-t">
            Unwrap wsROOTS to sROOTS v1 — then unstake it to ROOTS v1 to migrate.
          </p>
        </DialogHeader>

        <TokenBigInput
          label="Unwrap"
          token={inputToken}
          value={amount}
          onChange={(val) => setAmount(val)}
          onMax={handleMax}
        />

        <div className="flex justify-between text-sm px-1">
          <span className="text-secondary-t">You receive</span>
          <span className="font-semibold text-primary-t">≈ {receiveAmount} sROOTS v1</span>
        </div>

        <Button
          onClick={handleUnwrap}
          disabled={buttonState.disabled || isUnwrapping}
          className="w-full"
        >
          {isUnwrapping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming Unwrap In Your Wallet
            </>
          ) : (
            buttonState.label
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
