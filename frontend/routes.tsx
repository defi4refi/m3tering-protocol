import { lazy, Suspense } from "react";
import { createHashRouter, Navigate } from "react-router";
import AppLayout from "@/layouts/app-layout";
import { RouteErrorElement } from "@/components/route-error-element";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";

function retryLazy<T>(
  factory: () => Promise<T>,
  retries = 2,
): Promise<T> {
  return factory().catch((err) => {
    const msg = err?.message ?? "";
    if (msg.includes("Failed to fetch dynamically imported module") || msg.includes("Importing a module script failed")) {
      window.location.reload();
      return new Promise(() => {});
    }
    if (retries <= 0) throw err;
    return new Promise((resolve) => {
      setTimeout(() => resolve(retryLazy(factory, retries - 1)), 300);
    });
  });
}

const ProtocolOverviewPage = lazy(() =>
  retryLazy(() => import("@/modules/protocol-protocol-overview-page")).then((m) => ({
    default: m.ProtocolOverviewPage,
  })),
);
const ComingSoonPage = lazy(() =>
  retryLazy(() => import("@/modules/protocol-coming-soon-page")).then((m) => ({ default: m.ComingSoonPage })),
);
const ReferralPage = lazy(() =>
  retryLazy(() => import("@/modules/referral-referral-page")).then((m) => ({ default: m.ReferralPage })),
);
const ImpactClarityDashboard = lazy(() =>
  retryLazy(() => import("@/modules/impact-impact-clarity-dashboard")).then((m) => ({
    default: m.DashboardPage,
  })),
);
const OnboardingPage = lazy(() =>
  retryLazy(() => import("@/modules/impact-onboarding-page")).then((m) => ({ default: m.OnboardingPage })),
);
const ImpactTokensPage = lazy(() =>
  retryLazy(() => import("@/modules/impact-impact-tokens-page")).then((m) => ({
    default: m.ImpactTokensPage,
  })),
);
const ImpactLaunchPage = lazy(() =>
  retryLazy(() => import("@/modules/impact-impact-launch-page")).then((m) => ({
    default: m.ImpactLaunchPage,
  })),
);
const ImpactLeaderboardPage = lazy(() =>
  retryLazy(() => import("@/modules/impact-impact-leaderboard-page")).then((m) => ({
    default: m.ImpactLeaderboardPage,
  })),
);
const IzipayDashboardPage = lazy(() =>
  retryLazy(() => import("@/modules/izipay-izipay-dashboard-page")).then((m) => ({
    default: m.IzipayDashboardPage,
  })),
);
const IzipayCardsPage = lazy(() =>
  retryLazy(() => import("@/modules/izipay-izipay-cards-page")).then((m) => ({ default: m.IzipayCardsPage })),
);
const IzipayCardDetailPage = lazy(() =>
  retryLazy(() => import("@/modules/izipay-izipay-card-detail-page")).then((m) => ({
    default: m.IzipayCardDetailPage,
  })),
);
const IzipayVaultsPage = lazy(() =>
  retryLazy(() => import("@/modules/izipay-izipay-vaults-page")).then((m) => ({
    default: m.IzipayVaultsPage,
  })),
);
const IzipayCreateVaultPage = lazy(() =>
  retryLazy(() => import("@/modules/izipay-izipay-create-vault-page")).then((m) => ({
    default: m.IzipayCreateVaultPage,
  })),
);
const IzipayDepositPage = lazy(() =>
  retryLazy(() => import("@/modules/izipay-izipay-deposit-page")).then((m) => ({
    default: m.IzipayDepositPage,
  })),
);
const IzipayWithdrawPage = lazy(() =>
  retryLazy(() => import("@/modules/izipay-izipay-withdraw-page")).then((m) => ({
    default: m.IzipayWithdrawPage,
  })),
);
const IzipayClaimbackPage = lazy(() =>
  retryLazy(() => import("@/modules/izipay-izipay-claimback-page")).then((m) => ({
    default: m.IzipayClaimbackPage,
  })),
);
const AirdropPage = lazy(() =>
  retryLazy(() => import("@/modules/airdrop-airdrop-page")).then((m) => ({ default: m.AirdropPage })),
);
const MerchPage = lazy(() =>
  retryLazy(() => import("@/modules/merch-merch-page")).then((m) => ({ default: m.MerchPage })),
);
const VerifyPage = lazy(() =>
  retryLazy(() => import("@/modules/verify-verify-page")).then((m) => ({ default: m.VerifyPage })),
);
const ContractsPage = lazy(() =>
  retryLazy(() => import("@/modules/contracts-contracts-page")).then((m) => ({ default: m.ContractsPage })),
);
const TokenomicsLabPage = lazy(() =>
  retryLazy(() => import("@/modules/protocol-tokenomics-lab-page")).then((m) => ({ default: m.TokenomicsLabPage })),
);
const WhitepaperPage = lazy(() =>
  retryLazy(() => import("@/modules/protocol-whitepaper-page")).then((m) => ({ default: m.WhitepaperPage })),
);
const WhitelistPage = lazy(() =>
  retryLazy(() => import("@/modules/whitelist-whitelist-page")).then((m) => ({ default: m.WhitelistPage })),
);

const TreasuryNowPage = lazy(() =>
  retryLazy(() => import("@/modules/treasury-treasury-now-page")).then((m) => ({
    default: m.TreasuryNowPage,
  })),
);

const DocsPage = lazy(() =>
  retryLazy(() => import("@/modules/protocol-docs-page")).then((m) => ({ default: m.DocsPage })),
);

const BugBountyPage = lazy(() =>
  retryLazy(() => import("@/modules/protocol-bug-bounty-page")).then((m) => ({
    default: m.BugBountyPage,
  })),
);

const DashboardPage = lazy(() =>
  retryLazy(() => import("@/modules/protocol-dashboard-page")).then((m) => ({
    default: m.DashboardPage,
  })),
);

const FaucetPage = lazy(() =>
  retryLazy(() => import("@/modules/protocol-faucet-page")).then((m) => ({
    default: m.FaucetPage,
  })),
);

const BondPage = lazy(() =>
  retryLazy(() => import("@/modules/bonds-bond-page")).then((m) => ({
    default: m.BondPage,
  })),
);

const WrapPage = lazy(() =>
  retryLazy(() => import("@/modules/roots-wrap-page")).then((m) => ({
    default: m.WrapPage,
  })),
);

const CoolerBorrowPage = lazy(() =>
  retryLazy(() => import("@/modules/cooler-borrow-page")).then((m) => ({
    default: m.CoolerBorrowPage,
  })),
);

const RBSPage = lazy(() =>
  retryLazy(() => import("@/modules/rbs-rbs-page")).then((m) => ({
    default: m.RBSPage,
  })),
);

const UnifiedDashboardPage = lazy(() =>
  retryLazy(() => import("@/modules/protocol-unified-dashboard-page")).then((m) => ({
    default: m.UnifiedDashboardPage,
  })),
);

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>
);

export const router = createHashRouter([
  {
    path: "/",
    Component: AppLayout,
    errorElement: <RouteErrorElement />,
    children: [
      { index: true, element: withSuspense(<ProtocolOverviewPage />) },
      { path: "verify", element: withSuspense(<VerifyPage />) },
      { path: "impact-clarity", element: withSuspense(<ImpactClarityDashboard />) },
      { path: "onboard", element: withSuspense(<OnboardingPage />) },
      { path: "impact", element: withSuspense(<ImpactTokensPage />) },
      { path: "impact-launch", element: withSuspense(<ImpactLaunchPage />) },
      { path: "impact-leaderboard", element: withSuspense(<ImpactLeaderboardPage />) },
      { path: "coming-soon", element: withSuspense(<ComingSoonPage />) },
      { path: "referral", element: withSuspense(<ReferralPage />) },
      { path: "airdrop", element: withSuspense(<AirdropPage />) },
      { path: "merch", element: withSuspense(<MerchPage />) },
      { path: "contracts", element: withSuspense(<ContractsPage />) },
      { path: "tokenomics", element: withSuspense(<TokenomicsLabPage />) },
      { path: "whitepaper", element: withSuspense(<WhitepaperPage />) },
      { path: "treasury", element: withSuspense(<TreasuryNowPage />) },
      { path: "docs/:docId", element: withSuspense(<DocsPage />) },
      { path: "bug-bounty", element: withSuspense(<BugBountyPage />) },
      { path: "whitelist", element: withSuspense(<WhitelistPage />) },
      { path: "izipay", element: withSuspense(<IzipayDashboardPage />) },
      { path: "izipay/cards", element: withSuspense(<IzipayCardsPage />) },
      { path: "izipay/cards/:cardId", element: withSuspense(<IzipayCardDetailPage />) },
      { path: "izipay/vaults", element: withSuspense(<IzipayVaultsPage />) },
      { path: "izipay/vaults/create", element: withSuspense(<IzipayCreateVaultPage />) },
      { path: "izipay/vaults/deposit", element: withSuspense(<IzipayDepositPage />) },
      { path: "izipay/vaults/withdraw", element: withSuspense(<IzipayWithdrawPage />) },
      { path: "izipay/vaults/claimback", element: withSuspense(<IzipayClaimbackPage />) },
      { path: "dashboard", element: withSuspense(<DashboardPage />) },
      { path: "faucet", element: withSuspense(<FaucetPage />) },
      { path: "bonds", element: withSuspense(<BondPage />) },
      { path: "stake-wrap", element: withSuspense(<WrapPage />) },
      { path: "borrow", element: withSuspense(<CoolerBorrowPage />) },
      { path: "rbs", element: withSuspense(<RBSPage />) },
      { path: "dashboards", element: withSuspense(<UnifiedDashboardPage />) },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
