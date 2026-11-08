"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

/**
 * next-themes@0.4.6 creates a <script> element in the React tree.
 * Next 16 / React 19 warns when a copy of that executable script is
 * client-rendered. Keep the SSR copy executable (prevents theme flash),
 * but make any client-rendered copy inert.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const scriptProps =
    typeof window === "undefined"
      ? undefined
      : ({ type: "application/json" } as const);

  return (
    <NextThemesProvider {...props} scriptProps={scriptProps}>
      {children}
    </NextThemesProvider>
  );
}
