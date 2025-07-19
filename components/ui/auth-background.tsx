import { cn } from "@/lib/utils";
import React from "react";

export function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-dvh w-screen items-start pt-4 px-4 sd:pt-8 md:pt-16 lg:pt-32 justify-center bg-background">
      <Background />
      <div className="relative z-10 w-full max-w-xl">
        {children}
      </div>
    </div>
  );
}

const Background = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden [perspective:1000px] [transform-style:preserve-3d]">
      <Rectangles
        style={{ transform: "rotateX(45deg)" }}
        className="[mask-image:linear-gradient(to_top,white,transparent)]"
      />
      <Rectangles
        style={{ transform: "rotateX(-45deg)" }}
        className="[mask-image:linear-gradient(to_bottom,white,transparent)]"
      />
    </div>
  );
};

const Rectangles = ({
  className,
  ...props
}: {
  className?: string;
  style?: React.CSSProperties;
}) => {
  const rectangleSVGLight = `<svg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'><rect width='40' height='40' x='0' y='0' stroke='rgba(0,0,0,0.05)' fill='none' /></svg>`;
  const rectangleSVGDark = `<svg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'><rect width='40' height='40' x='0' y='0' stroke='rgba(255,255,255,0.1)' fill='none' /></svg>`;
  const encodedRectangleSVGLight = encodeURIComponent(rectangleSVGLight);
  const encodedRectangleSVGDark = encodeURIComponent(rectangleSVGDark);
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden",
        className,
      )}
      {...props}
    >
      <div
        className={cn("h-full w-full dark:hidden")}
        style={{
          backgroundImage: `url("data:image/svg+xml,${encodedRectangleSVGLight}")`,
          backgroundSize: "40px 40px",
          backgroundPosition: "center",
          backgroundRepeat: "repeat",
        }}
      />
      <div
        className={cn("hidden h-full w-full dark:block")}
        style={{
          backgroundImage: `url("data:image/svg+xml,${encodedRectangleSVGDark}")`,
          backgroundSize: "40px 40px",
          backgroundPosition: "center",
          backgroundRepeat: "repeat",
        }}
      />
    </div>
  );
};
