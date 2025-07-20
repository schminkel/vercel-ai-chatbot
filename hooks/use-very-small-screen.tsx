import * as React from 'react';

const VERY_SMALL_BREAKPOINT = 400; // iPhone SE and similar small devices

export function useIsVerySmallScreen() {
  const [isVerySmall, setIsVerySmall] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${VERY_SMALL_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsVerySmall(window.innerWidth < VERY_SMALL_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    setIsVerySmall(window.innerWidth < VERY_SMALL_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isVerySmall;
}
