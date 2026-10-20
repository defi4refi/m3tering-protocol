import { isValidElement, type ComponentType, type ReactNode } from "react";
import {
  TreeDeciduous,
  CircleDollarSign,
  LayoutDashboard,
  Landmark,
  FlaskConical,
  ShoppingBag,
  CreditCard,
  Gift,
  Users,
  Clock,
  Sprout,
} from "lucide-react";
import { LottieIcon } from "@/components/lottie-icon";

import pulseAnimation from "@/icons/anim-pulse.json";
import { isTestnetMode } from "@/lib/chains";

export type NavItem = {
  label: string;
  section: string;
  external?: boolean;
  exact?: boolean;
  requiresMultisig?: boolean;
};

export type AnimatedIconProps = { isHovered: boolean; isActive: boolean };

export type NavSection = {
  id: string;
  label: string;
  sidebarTitle: string;
  icon: ReactNode | ComponentType<AnimatedIconProps> | ComponentType<{ className?: string }>;
  section: string;
  items: NavItem[];
  isNew?: boolean;
  hideNavIfNotMultisig?: boolean;
  isComingSoon?: boolean;
  route?: string;
};

export function isAnimatedIcon(
  icon: ReactNode | ComponentType<AnimatedIconProps> | ComponentType<{ className?: string }>,
): icon is ComponentType<AnimatedIconProps> {
  return typeof icon === "function" && (icon as any).__lottie === true;
}

function isIconComponent(
  icon: unknown,
): icon is ComponentType<{ className?: string }> {
  if (typeof icon === "function") return true;
  if (icon && typeof icon === "object" && !isValidElement(icon)) {
    const typeSymbol = (icon as any).$$typeof;
    return (
      typeSymbol === Symbol.for("react.forward_ref") ||
      typeSymbol === Symbol.for("react.memo")
    );
  }
  return false;
}

export function renderNavIcon(
  icon: NavSection["icon"],
  { isActive, isHovered, className }: { isActive?: boolean; isHovered?: boolean; className?: string } = {},
): ReactNode {
  if (isAnimatedIcon(icon)) {
    const AnimatedIcon = icon;
    return <AnimatedIcon isHovered={isHovered ?? false} isActive={isActive ?? false} />;
  }
  if (isIconComponent(icon)) {
    const Comp = icon;
    return <Comp className={className} />;
  }
  if (isValidElement(icon)) {
    return icon;
  }
  return null;
}

function lottieIcon(animationData: unknown): ComponentType<AnimatedIconProps> & { __lottie?: boolean } {
  const Comp = ({ isHovered, isActive }: AnimatedIconProps) => (
    <LottieIcon animationData={animationData} isHovered={isHovered} isActive={isActive} />
  );
  Comp.__lottie = true;
  return Comp;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "overview",
    label: "Home",
    sidebarTitle: "Overview",
    icon: lottieIcon(pulseAnimation),
    section: "overview",
    items: [
      { label: "Hero", section: "overview" },
      { label: "Plain English", section: "plain" },
      { label: "How it works", section: "how" },
    ],
  },
  {
    id: "products",
    label: "ROOTS",
    sidebarTitle: "ROOTS",
    icon: CircleDollarSign,
    section: "products",
    items: [
      { label: "ROOTS", section: "products" },
    ],
  },
  ...(isTestnetMode
    ? [
        {
          id: "faucet",
          label: "Faucet",
          sidebarTitle: "Faucet",
          icon: FlaskConical,
          section: "faucet",
          route: "faucet",
          items: [],
        } as NavSection,
      ]
    : []),
  {
    id: "dashboard",
    label: "Dashboard",
    sidebarTitle: "Grow & Borrow",
    icon: LayoutDashboard,
    section: "dashboard",
    route: "dashboard",
    items: [
      { label: "Balances", section: "dashboard" },
      { label: "Stake", section: "dashboard" },
      { label: "Bonds", section: "dashboard" },
      { label: "Borrow", section: "dashboard" },
    ],
  },
  {
    id: "markets",
    label: "Treasury",
    sidebarTitle: "Treasury Ops",
    icon: Landmark,
    section: "markets",
    route: "treasury",
    items: [
      { label: "Range Stability", section: "markets" },
      { label: "Protocol-Owned Liquidity", section: "markets" },
      { label: "Analytics", section: "dashboards" },
    ],
  },
  {
    id: "impact",
    label: "Impact",
    sidebarTitle: "Impact Tokens",
    icon: TreeDeciduous,
    section: "impact",
    route: "impact",
    items: [
      { label: "Impact Clarity Map", section: "impact-clarity" },
      { label: "Token Registry", section: "impact" },
      { label: "Launch Status", section: "impact-launch" },
      { label: "Climate Leaderboard", section: "impact-leaderboard" },
      { label: "Onboard a Project", section: "onboard" },
    ],
  },
  {
    id: "tokenomics",
    label: "Sim",
    sidebarTitle: "Sim",
    icon: Sprout,
    section: "tokenomics",
    route: "tokenomics",
    items: [
      { label: "Sim", section: "tokenomics" },
    ],
  },
  {
    id: "coming-soon",
    label: "Soon",
    sidebarTitle: "Coming Soon",
    icon: Clock,
    section: "coming-soon",
    route: "coming-soon",
    items: [
      { label: "Stablecoin, Perps & more", section: "coming-soon" },
    ],
  },
  {
    id: "referral",
    label: "Referral",
    sidebarTitle: "Referral Program",
    icon: Users,
    section: "referral",
    route: "referral",
    items: [
      { label: "Referral Program", section: "referral" },
    ],
  },
  {
    id: "airdrop",
    label: "Airdrop",
    sidebarTitle: "Airdrop Eligibility",
    icon: Gift,
    section: "airdrop",
    route: "airdrop",
    isNew: true,
    items: [
      { label: "Airdrop Eligibility", section: "airdrop" },
    ],
  },
  {
    id: "merch",
    label: "Merch",
    sidebarTitle: "Merch",
    icon: ShoppingBag,
    section: "merch",
    route: "merch",
    items: [
      { label: "Merch that plants mangroves", section: "merch" },
    ],
  },
  {
    id: "izipay",
    label: "Pay",
    sidebarTitle: "RootedPay Cards",
    icon: CreditCard,
    section: "izipay",
    route: "izipay",
    items: [
      { label: "Dashboard", section: "izipay" },
      { label: "Cards", section: "izipay/cards" },
      { label: "Vaults", section: "izipay/vaults" },
    ],
  },
];

export function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
