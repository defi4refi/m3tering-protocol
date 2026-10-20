import { cn } from "@/lib/utils";

export function RootedLogo({ className }: { className?: string }) {
  return (
    <img
      src="/pictures/rooted/rootednew-removebg-preview.png"
      alt="Rooted Finance Logo"
      className={cn("object-contain", className)}
    />
  );
}
