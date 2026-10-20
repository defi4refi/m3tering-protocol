import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { useConnectedAddress } from "@/hooks/use-connected-address";
import { formatUnits } from "viem";
import { RiArrowLeftRightLine, RiArrowRightLine } from "@remixicon/react";
import { WrapRootsModal } from "@/components/wrap-roots-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui-tabs.tsx";
import { useWstRootsConversion } from "@/hooks/use-wst-roots-conversion";
import { Card } from "@/components/ui-card";
import { TOKENS, TokenName } from "@/lib/tokens";
import {
  WRAP_FLOWS,
  SOURCE_TOKENS,
  defaultSourceToken,
  defaultOutputToken,
  getOutputTokens,
  getWrapFlow,
  parseSourceTokenParam,
  type WrapMode,
  type WrapFlow,
} from "./roots-wrap-flows";
import { NumberFlow } from "@/components/ui-number-flow.tsx";
import { Skeleton } from "@/components/ui-skeleton.tsx";
import { Button } from "@/components/ui-button.tsx";
import { Form, FormField, FormItem } from "@/components/ui-form.tsx";
import { TokenBigInput } from "@/components/ui-token-big-input.tsx";
import { useWstRootsConversionRate } from "@/hooks/use-wst-roots-conversion.tsx";
import { PriceChange } from "@/components/price-change.tsx";
import { useRootsPriceHistory } from "@/modules/pulse-useRootsPriceHistory.ts";
import { useWstRootsPriceHistory } from "@/modules/pulse-useWstRootsPriceHistory.ts";
import { useToken, type TokenWithBalance } from "@/hooks/use-token";
import { getReferenceSnapshot } from "@/lib/utils";
import { useStakingAPY } from "@/hooks/use-staking-apy";
import { Icon, type IconName } from "@/components/icon";
import { Separator } from "@/components/ui-separator";
import { useTokenBalance } from "@/hooks/use-token-balance";
import { getTokenAddress } from "@/lib/tokens";
import { parseTokenAmount } from "@/lib/utils-token-amount";
import { DashboardActions } from "@/components/dashboard-actions";
import { Tooltip } from "@/components/ui-tooltip.tsx";
import { NetworkGuard } from "@/components/network-guard";

// ─── Wrap info cards ───

const WRAP_EXPLANATION = [
  {
    title: "ROOTS — Protocol Token",
    body: "ROOTS is the main token of Rooted Finance. It is backed by real money in the treasury. You can buy it at a lower price through bonds, then stake it to earn more over time. If you don't stake your ROOTS, your share slowly dilutes over time as new ROOTS are minted to reward stakers.",
  },
  {
    title: "stROOTS — Staked ROOTS (Rebasing)",
    body: "When you stake ROOTS, you get stROOTS. Your stROOTS balance grows on its own as the protocol earns money. You do not need to claim anything — it just grows.",
  },
  {
    title: "wstROOTS — Wrapped stROOTS (Non-Rebasing)",
    body: "wstROOTS is a wrapped version of stROOTS. Instead of your balance growing, the exchange rate goes up over time. This works better in places where a changing balance causes problems, like Liquidity Pool pools and lending markets.",
  },
  {
    title: "How Staking Works — and Why You Should",
    body: "Stake ROOTS to get stROOTS (grows on its own). Wrap stROOTS to get wstROOTS (exchange rate goes up). Unwrap wstROOTS to get stROOTS back. Unstake stROOTS to get ROOTS back at 1:1. If you don't stake, your ROOTS slowly dilute over time as new ROOTS are minted to stakers — so staking is how you protect and grow your value.",
  },
];

function WrapInfoCards() {
  const GRootsToken = useToken(TokenName.WSTROOTS);
  const RootsToken = useToken(TokenName.ROOTS);
  const { ohmPerGohm: rootsPerWstRoots, gohmPerOhm: wstRootsPerRoots, isLoading: indexLoading } = useWstRootsConversionRate();
  const { apy, isLoading: apyLoading } = useStakingAPY();
  const { data: ohmPriceHistory } = useRootsPriceHistory();
  const { data: gohmPriceHistory } = useWstRootsPriceHistory();

  const rootsRef24h = getReferenceSnapshot(ohmPriceHistory?.dataPoints ?? [], 24);
  const grootsRef24h = getReferenceSnapshot(gohmPriceHistory?.dataPoints ?? [], 24);
  const rootsChange24h =
    rootsRef24h && RootsToken.price > 0
      ? ((RootsToken.price - rootsRef24h.price) / rootsRef24h.price) * 100
      : null;
  const grootsChange24h =
    grootsRef24h && GRootsToken.price > 0
      ? ((GRootsToken.price - grootsRef24h.price) / grootsRef24h.price) * 100
      : null;

  const [inverted, setInverted] = useState(false);

  const fromLabel = inverted ? "ROOTS" : "wstROOTS";
  const toLabel = inverted ? "wstROOTS" : "ROOTS";
  const toValue = Number(inverted ? wstRootsPerRoots : rootsPerWstRoots);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {WRAP_EXPLANATION.map((card) => (
          <Card key={card.title} className="p-6 flex flex-col">
            <h3 className="mb-2 text-sm/5 font-semibold">{card.title}</h3>
            <p className="text-secondary-t text-sm/5">{card.body}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="flex flex-col gap-1 p-6">
        <p className="text-[14px]/[20px] font-normal text-secondary-t">ROOTS Price</p>
        <div className="flex items-center gap-x-2">
          {!RootsToken.price ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <NumberFlow className="text-[20px]/[24px] font-semibold" value={RootsToken.price} />
          )}
          {rootsChange24h !== null && <PriceChange percentage={rootsChange24h} timeframe="24h" />}
        </div>
      </Card>

      <Card className="flex flex-col gap-1 p-6">
        <p className="text-[14px]/[20px] font-normal text-secondary-t">wstROOTS Price</p>
        <div className="flex items-center gap-x-2">
          {!GRootsToken.price ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <NumberFlow className="text-[20px]/[24px] font-semibold" value={GRootsToken.price} />
          )}
          {grootsChange24h !== null && <PriceChange percentage={grootsChange24h} timeframe="24h" />}
        </div>
      </Card>

      <Card className="flex flex-col gap-1 p-6">
        <p className="text-[14px]/[20px] font-normal text-secondary-t">Staking Annual Percentage Yield</p>
        <div className="flex items-center gap-x-2">
          {apyLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : apy !== undefined ? (
            <NumberFlow
              className="text-[20px]/[24px] font-semibold"
              value={apy}
              format={{ style: "decimal", maximumFractionDigits: 1 }}
              suffix="%"
            />
          ) : (
            <span className="text-[20px]/[24px] font-semibold text-tertiary-t">—</span>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-1 p-6">
        <p className="text-[14px]/[20px] font-normal text-secondary-t">Conversion Rate</p>
        <div className="flex items-center gap-x-2">
          {indexLoading ? (
            <Skeleton className="h-6 w-40" />
          ) : (
            <div className="flex items-center gap-x-0.5 flex-wrap">
              <NumberFlow
                className="text-[20px]/[24px] font-semibold break-words"
                value={1}
                format={{ style: "decimal" }}
                suffix={fromLabel}
              />
              ≈
              <NumberFlow
                className="text-[20px]/[24px] font-semibold break-words"
                value={toValue}
                format={{
                  style: "decimal",
                  notation: inverted ? "standard" : "compact",
                  maximumFractionDigits: inverted ? 6 : 2,
                }}
                suffix={toLabel}
              />
            </div>
          )}
          <Button
            className="size-6"
            variant="secondary"
            size="sm"
            onClick={() => setInverted((v) => !v)}
          >
            <RiArrowLeftRightLine className="size-3" />
          </Button>
        </div>
      </Card>
      </div>
    </div>
  );
}

// ─── Wrap form ───

type WrapPageToken = TokenName.ROOTS | TokenName.STROOTS | TokenName.WSTROOTS;

interface WrapFormProps {
  mode: WrapMode;
  sourceToken: TokenName;
  onSourceTokenChange: (token: TokenName) => void;
  outputToken: TokenName;
  onOutputTokenChange: (token: TokenName) => void;
  inputAmount: string;
  onInputAmountChange: (amount: string) => void;
  outputAmount: string;
  onSubmit: () => void;
}

function WrapForm({
  mode,
  sourceToken,
  onSourceTokenChange,
  outputToken,
  onOutputTokenChange,
  inputAmount,
  onInputAmountChange,
  outputAmount,
  onSubmit,
}: WrapFormProps) {
  const { address } = useConnectedAddress();
  const flow = getWrapFlow(mode, sourceToken, outputToken);
  const { copy } = WRAP_FLOWS[flow];

  const RootsToken = useToken(TokenName.ROOTS);
  const GRootsToken = useToken(TokenName.WSTROOTS);

  const ohmBase = useToken(TokenName.ROOTS, address);
  const sohmBase = useToken(TokenName.STROOTS, address);
  const gohmBase = useToken(TokenName.WSTROOTS, address);

  const tokensByName = useMemo<Record<WrapPageToken, TokenWithBalance>>(
    () => ({
      [TokenName.ROOTS]: { ...ohmBase, price: RootsToken.price },
      [TokenName.STROOTS]: { ...sohmBase, price: RootsToken.price },
      [TokenName.WSTROOTS]: { ...gohmBase, price: GRootsToken.price },
    }),
    [ohmBase, sohmBase, gohmBase, RootsToken.price, GRootsToken.price],
  );

  const inputToken = tokensByName[sourceToken as WrapPageToken];
  const outputTokenName = WRAP_FLOWS[flow].output;
  const outputTok = tokensByName[outputTokenName as WrapPageToken];
  const sourceNames = SOURCE_TOKENS[mode] as readonly WrapPageToken[];
  const sourceOptions = sourceNames.map((name) => tokensByName[name]);
  const outputNames = getOutputTokens(mode, sourceToken) as readonly WrapPageToken[];
  const outputOptions = outputNames.map((name) => tokensByName[name]);

  const form = useForm<{ inputAmount: string; outputAmount: string }>({
    defaultValues: { inputAmount: "", outputAmount: "" },
  });

  useEffect(() => {
    form.setValue("inputAmount", inputAmount);
  }, [inputAmount, form]);

  useEffect(() => {
    form.setValue("outputAmount", outputAmount);
  }, [outputAmount, form]);

  const hasInsufficientBalance = useMemo(() => {
    if (!inputAmount || !inputToken.balance) return false;
    return parseTokenAmount(inputAmount, inputToken.decimals) > inputToken.balance;
  }, [inputAmount, inputToken.balance, inputToken.decimals]);

  const buttonState = useMemo(() => {
    if (!address) return { disabled: true, label: "Sign In" };
    if (!inputAmount || parseFloat(inputAmount) === 0)
      return { disabled: true, label: "Enter Amount" };
    if (hasInsufficientBalance) return { disabled: true, label: "Insufficient Balance" };
    return { disabled: false, label: copy.action };
  }, [address, inputAmount, hasInsufficientBalance, copy.action]);

  return (
    <div>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="inputAmount"
            render={({ field }) => (
              <FormItem>
                <TokenBigInput
                  label={copy.inputLabel}
                  token={inputToken}
                  tokenSelector={{
                    tokens: sourceOptions,
                    selectedToken: inputToken,
                    onTokenChange: (token) => {
                      const name = sourceNames.find((n) => tokensByName[n].symbol === token.symbol);
                      if (name) onSourceTokenChange(name);
                    },
                  }}
                  value={field.value}
                  onChange={(val) => {
                    field.onChange(val);
                    onInputAmountChange(val as string);
                  }}
                />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="outputAmount"
            render={({ field }) => (
              <FormItem>
                <TokenBigInput
                  label="Receive"
                  token={outputTok}
                  tokenSelector={
                    outputOptions.length > 1
                      ? {
                          tokens: outputOptions,
                          selectedToken: outputTok,
                          onTokenChange: (token) => {
                            const name = outputNames.find((n) => tokensByName[n].symbol === token.symbol);
                            if (name) onOutputTokenChange(name);
                          },
                        }
                      : undefined
                  }
                  value={field.value}
                  balanceLabel="Available:"
                />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={buttonState.disabled}>
            {buttonState.label}
          </Button>
        </form>
      </Form>
    </div>
  );
}

// ─── Wrap balance panel ───

type PanelToken = TokenName.ROOTS | TokenName.WSTROOTS | TokenName.STROOTS;
const PANEL_TOKENS: readonly PanelToken[] = [TokenName.ROOTS, TokenName.WSTROOTS, TokenName.STROOTS];

function BalanceRow({
  icon,
  symbol,
  label,
  before,
  after,
  decimals,
}: {
  icon: IconName;
  symbol: string;
  label: string;
  before: string;
  after?: number;
  decimals: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px]/[16px] font-normal text-secondary-t">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Icon name={icon} size={16} />
          <span className="text-[12px]/[16px] font-semibold text-primary-t">
            {before} {symbol}
          </span>
        </div>
        {after != null && (
          <>
            <RiArrowRightLine className="size-4 text-tertiary-t" />
            <div className="flex items-center gap-1">
              <Icon name={icon} size={16} />
              <span className="text-[12px]/[16px] font-semibold text-primary-t">
                {after.toFixed(decimals)} {symbol}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WrapBalancePanel({ flow, inputAmount, outputAmount }: { flow: WrapFlow; inputAmount: string; outputAmount: string }) {
  const { address, chainId } = useConnectedAddress();

  const rootsAddress = getTokenAddress(TokenName.ROOTS, chainId ?? 0);
  const srootsAddress = getTokenAddress(TokenName.STROOTS, chainId ?? 0);
  const grootsAddress = getTokenAddress(TokenName.WSTROOTS, chainId ?? 0);

  const { balance: rootsBalance } = useTokenBalance(rootsAddress, address);
  const { balance: srootsBalance } = useTokenBalance(srootsAddress, address);
  const { balance: grootsBalance } = useTokenBalance(grootsAddress, address);

  const balances: Record<PanelToken, number> = {
    [TokenName.ROOTS]:
      rootsBalance != null ? parseFloat(formatUnits(rootsBalance, TOKENS.ROOTS.decimals)) : 0,
    [TokenName.STROOTS]:
      srootsBalance != null ? parseFloat(formatUnits(srootsBalance, TOKENS.STROOTS.decimals)) : 0,
    [TokenName.WSTROOTS]:
      grootsBalance != null ? parseFloat(formatUnits(grootsBalance, TOKENS.WSTROOTS.decimals)) : 0,
  };

  const inputNum = parseFloat(inputAmount) || 0;
  const outputNum = parseFloat(outputAmount) || 0;
  const showAfter = inputNum > 0;

  const { input: inputTokenName, output: outputTokenName } = WRAP_FLOWS[flow];

  const afterFor = (name: PanelToken) => {
    if (name === inputTokenName) return balances[name] - inputNum;
    if (name === outputTokenName) return balances[name] + outputNum;
    return balances[name];
  };

  const rows = PANEL_TOKENS;

  return (
    <div className="rounded-2xl bg-surface-a3 px-4 py-4 border border-a3-b">
      <h3 className="mb-4 text-[14px]/[20px] font-semibold text-primary-t">My Balances</h3>

      <div>
        {rows.map((name, i) => {
          const { symbol, icon, decimals } = TOKENS[name];
          const displayDecimals = decimals === 18 ? 4 : 2;
          return (
            <Fragment key={name}>
              {i > 0 && <Separator className="my-2" />}
              <BalanceRow
                icon={icon}
                symbol={symbol}
                label={`${symbol} Balance`}
                before={balances[name].toFixed(displayDecimals)}
                after={showAfter ? afterFor(name) : undefined}
                decimals={displayDecimals}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Wrap page ───

export function WrapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode: WrapMode = searchParams.get("mode") === "unwrap" ? "unwrap" : "wrap";
  const [mode, setMode] = useState<WrapMode>(initialMode);
  const [sourceToken, setSourceToken] = useState<TokenName>(
    () =>
      parseSourceTokenParam(initialMode, searchParams.get("token")) ??
      defaultSourceToken(initialMode),
  );
  const [outputToken, setOutputToken] = useState<TokenName>(
    () => defaultOutputToken(initialMode, parseSourceTokenParam(initialMode, searchParams.get("token")) ?? defaultSourceToken(initialMode)),
  );
  const [inputAmount, setInputAmount] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const flow = getWrapFlow(mode, sourceToken, outputToken);

  const { outputAmount } = useWstRootsConversion(WRAP_FLOWS[flow].conversion, inputAmount);

  const syncUrl = (nextMode: WrapMode, nextSource: TokenName) => {
    const params: Record<string, string> = {};
    if (nextMode === "unwrap") params.mode = "unwrap";
    if (nextSource !== defaultSourceToken(nextMode)) params.token = TOKENS[nextSource].symbol;
    setSearchParams(params, { replace: true });
  };

  const handleModeChange = (newMode: WrapMode) => {
    const nextSource =
      parseSourceTokenParam(newMode, TOKENS[sourceToken].symbol) ?? defaultSourceToken(newMode);
    const nextOutput = defaultOutputToken(newMode, nextSource);
    setMode(newMode);
    setSourceToken(nextSource);
    setOutputToken(nextOutput);
    setInputAmount("");
    syncUrl(newMode, nextSource);
  };

  const handleSourceTokenChange = (token: TokenName) => {
    const nextOutput = defaultOutputToken(mode, token);
    setSourceToken(token);
    setOutputToken(nextOutput);
    setInputAmount("");
    syncUrl(mode, token);
  };

  const handleOutputTokenChange = (token: TokenName) => {
    setOutputToken(token);
    setInputAmount("");
  };

  const handleSubmit = () => {
    if (inputAmount && parseFloat(inputAmount) > 0) {
      setIsModalOpen(true);
    }
  };

  const panel = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <WrapForm
        mode={mode}
        sourceToken={sourceToken}
        onSourceTokenChange={handleSourceTokenChange}
        outputToken={outputToken}
        onOutputTokenChange={handleOutputTokenChange}
        inputAmount={inputAmount}
        onInputAmountChange={setInputAmount}
        outputAmount={outputAmount}
        onSubmit={handleSubmit}
      />
      <WrapBalancePanel flow={flow} inputAmount={inputAmount} outputAmount={outputAmount} />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <DashboardActions className="mb-6" />
      <WrapInfoCards />

      <Tabs
        onValueChange={(v) => handleModeChange(v as WrapMode)}
        value={mode}
        variant="primary"
        className="mt-8"
      >
        <TabsList variant="primary">
          <Tooltip
            title="Wrapping converts stROOTS (rebasing — your balance grows) into wstROOTS (non-rebasing — the exchange rate goes up instead). wstROOTS is needed to borrow USDC in the Cooler."
            contentProps={{ side: "bottom" }}
          >
            <TabsTrigger value="wrap" variant="primary">
              Wrap
            </TabsTrigger>
          </Tooltip>
          <Tooltip
            title="Unwrapping converts wstROOTS back into stROOTS. You can then unstake stROOTS to receive ROOTS at 1:1."
            contentProps={{ side: "bottom" }}
          >
            <TabsTrigger value="unwrap" variant="primary">
              Unwrap
            </TabsTrigger>
          </Tooltip>
        </TabsList>

        <TabsContent value="wrap" className="">
          <Card className="p-6">{panel}</Card>
        </TabsContent>
        <TabsContent value="unwrap" className="">
          <Card className="p-6">{panel}</Card>
        </TabsContent>
      </Tabs>

      <NetworkGuard>
        {isModalOpen && (
          <WrapRootsModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setInputAmount("");
            }}
            flow={flow}
            inputAmount={inputAmount}
            outputAmount={outputAmount}
          />
        )}
      </NetworkGuard>
    </div>
  );
}
