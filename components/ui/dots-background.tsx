import { cn } from "@/lib/utils";

export function DotsBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-0 h-full w-full",
        "bg-[radial-gradient(circle_at_0.5px_0.5px,rgba(0,0,0,0.1)_0.5px,transparent_0)]",
        "dark:bg-[radial-gradient(circle_at_0.5px_0.5px,rgba(255,255,255,0.1)_0.5px,transparent_0)]",
        "bg-repeat",
        "[background-size:12px_12px]",
        className
      )}
    />
  );
}
