// Legacy Rooted Finance v1 wrapped sROOTS (wsROOTS, 0xCa76543Cf381ebBB277bE79574059e32108e3E65).
// Minimal ABI: unwrap wsROOTS → sROOTS v1 (no approval needed — burns the caller's own wsROOTS).
export default [
  {
    inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
    name: "unwrap",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    // wsROOTS (18 decimals) → sROOTS v1 (9 decimals). Not 1:1 — scaled by the gROOTS index.
    inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
    name: "wROOTSTosROOTS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
