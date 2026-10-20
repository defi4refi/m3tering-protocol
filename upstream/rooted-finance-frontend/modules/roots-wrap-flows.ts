import { TOKENS, TokenName } from "@/lib/tokens";

/** Tab on the Wrap page. */
export type WrapMode = "wrap" | "unwrap";

/**
 * A concrete conversion path on the Wrap page: the tab plus the selected source
 * token. Each flow maps to a distinct contract call sequence (see useWrapFlowSequence):
 * - wrap-roots:            stake(to, amt, false, false) + unwrap(to, wstAmt)   ROOTS → wstROOTS → stROOTS
 * - wrap-roots-to-wstroots: stake(to, amt, false, false)                       ROOTS → wstROOTS
 * - wrap-stroots:          wrap(amt) on wstROOTS contract                      stROOTS → wstROOTS
 * - unwrap-wstroots:      unwrap(amt) on wstROOTS contract                     wstROOTS → stROOTS
 * - unwrap-wstroots-to-roots: unstake(to, amt, false, false)                   wstROOTS → ROOTS
 * - unstake-stroots:     wrap(amt) + unstake(to, wstAmt, false, false)        stROOTS → wstROOTS → ROOTS
 */
export type WrapFlow = "wrap-roots" | "wrap-roots-to-wstroots" | "wrap-stroots" | "unwrap-wstroots" | "unwrap-wstroots-to-roots" | "unstake-stroots";

/** Selectable source tokens per tab. The output token is determined by the flow. */
export const SOURCE_TOKENS: Record<WrapMode, readonly TokenName[]> = {
  wrap: [TokenName.ROOTS, TokenName.STROOTS],
  unwrap: [TokenName.WSTROOTS, TokenName.STROOTS],
};

export function defaultSourceToken(mode: WrapMode): TokenName {
  return mode === "wrap" ? TokenName.ROOTS : TokenName.WSTROOTS;
}

/** Resolve a `?token=` query value (matched by symbol, e.g. "stROOTS") to a valid source for the tab. */
export function parseSourceTokenParam(mode: WrapMode, value: string | null): TokenName | undefined {
  if (!value) return undefined;
  return SOURCE_TOKENS[mode].find(
    (name) => TOKENS[name].symbol.toLowerCase() === value.toLowerCase(),
  );
}

/** Available output tokens for a given source token in wrap mode. */
export function getOutputTokens(mode: WrapMode, sourceToken: TokenName): readonly TokenName[] {
  if (mode === "wrap") {
    if (sourceToken === TokenName.ROOTS) return [TokenName.STROOTS, TokenName.WSTROOTS];
    if (sourceToken === TokenName.STROOTS) return [TokenName.WSTROOTS];
  } else {
    if (sourceToken === TokenName.WSTROOTS) return [TokenName.STROOTS, TokenName.ROOTS];
    if (sourceToken === TokenName.STROOTS) return [TokenName.ROOTS];
  }
  return [];
}

export function defaultOutputToken(mode: WrapMode, sourceToken: TokenName): TokenName {
  const outputs = getOutputTokens(mode, sourceToken);
  return outputs[0] ?? sourceToken;
}

export function getWrapFlow(mode: WrapMode, sourceToken: TokenName, outputToken: TokenName): WrapFlow {
  if (mode === "wrap") {
    if (sourceToken === TokenName.ROOTS) {
      return outputToken === TokenName.WSTROOTS ? "wrap-roots-to-wstroots" : "wrap-roots";
    }
    if (sourceToken === TokenName.STROOTS) return "wrap-stroots";
    return "wrap-roots";
  }
  return sourceToken === TokenName.STROOTS ? "unstake-stroots" : outputToken === TokenName.ROOTS ? "unwrap-wstroots-to-roots" : "unwrap-wstroots";
}

type FlowSpec = {
  input: TokenName;
  output: TokenName;
  /** How the output amount is derived: wstROOTS-index conversion, or 1:1 identity. */
  conversion: "wrap" | "unwrap" | "identity";
  /** User-facing copy, shared by the form button, modal, and toasts. */
  copy: {
    /** Header of the amount input, e.g. "Wrap" / "Unstake". */
    inputLabel: string;
    /** Modal title, e.g. "Wrap sROOTS". */
    title: string;
    /** Submit/execute button label, e.g. "Wrap sROOTS to wstROOTS". */
    action: string;
    /** Approval step label, e.g. "Approve Wrapping". */
    approve: string;
  };
  /** Verb forms for transaction toasts. */
  toast: { progressive: string; past: string; noun: string };
  /** Analytics action slug. */
  analyticsAction: string;
};

export const WRAP_FLOWS: Record<WrapFlow, FlowSpec> = {
  "wrap-roots": {
    input: TokenName.ROOTS,
    output: TokenName.STROOTS,
    conversion: "identity",
    copy: {
      inputLabel: "Stake",
      title: "Stake ROOTS",
      action: "Stake ROOTS to stROOTS",
      approve: "Approve Staking",
    },
    toast: { progressive: "Staking", past: "Staked", noun: "Stake" },
    analyticsAction: "wrap",
  },
  "wrap-roots-to-wstroots": {
    input: TokenName.ROOTS,
    output: TokenName.WSTROOTS,
    conversion: "wrap",
    copy: {
      inputLabel: "Stake & Wrap",
      title: "Stake ROOTS to wstROOTS",
      action: "Stake ROOTS to wstROOTS",
      approve: "Approve Staking",
    },
    toast: { progressive: "Staking", past: "Staked", noun: "Stake" },
    analyticsAction: "wrap_to_wstroots",
  },
  "wrap-stroots": {
    input: TokenName.STROOTS,
    output: TokenName.WSTROOTS,
    conversion: "wrap",
    copy: {
      inputLabel: "Wrap",
      title: "Wrap stROOTS",
      action: "Wrap stROOTS to wstROOTS",
      approve: "Approve Wrapping",
    },
    toast: { progressive: "Wrapping", past: "Wrapped", noun: "Wrap" },
    analyticsAction: "wrap_sohm",
  },
  "unwrap-wstroots": {
    input: TokenName.WSTROOTS,
    output: TokenName.STROOTS,
    conversion: "unwrap",
    copy: {
      inputLabel: "Unwrap",
      title: "Unwrap wstROOTS",
      action: "Unwrap wstROOTS to stROOTS",
      approve: "Approve Unwrapping",
    },
    toast: { progressive: "Unwrapping", past: "Unwrapped", noun: "Unwrap" },
    analyticsAction: "unwrap",
  },
  "unwrap-wstroots-to-roots": {
    input: TokenName.WSTROOTS,
    output: TokenName.ROOTS,
    conversion: "unwrap",
    copy: {
      inputLabel: "Unwrap & Unstake",
      title: "Unwrap wstROOTS to ROOTS",
      action: "Unwrap & Unstake wstROOTS to ROOTS",
      approve: "Approve Unwrapping",
    },
    toast: { progressive: "Unwrapping", past: "Unwrapped", noun: "Unwrap" },
    analyticsAction: "unwrap_to_roots",
  },
  "unstake-stroots": {
    input: TokenName.STROOTS,
    output: TokenName.ROOTS,
    conversion: "identity",
    copy: {
      inputLabel: "Unstake",
      title: "Unstake stROOTS",
      action: "Unstake stROOTS to ROOTS",
      approve: "Approve Unstaking",
    },
    toast: { progressive: "Unstaking", past: "Unstaked", noun: "Unstake" },
    analyticsAction: "unstake_sohm",
  },
};
