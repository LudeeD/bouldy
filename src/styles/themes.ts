import { Theme } from "../types";

export const themes: Record<string, Theme> = {
  midnight: {
    name: "Midnight",
    previewColors: {
      bg: "oklch(0.15 0.025 264)",
      primary: "oklch(0.76 0.1 264)",
    },
  },
  dawn: {
    name: "Dawn",
    previewColors: {
      bg: "oklch(0.95 0.02 252)",
      primary: "oklch(0.5 0.15 252)",
    },
  },
  forest: {
    name: "Forest",
    previewColors: {
      bg: "oklch(0.14 0.04 150)",
      primary: "oklch(0.7 0.12 150)",
    },
  },
  sunset: {
    name: "Sunset",
    previewColors: {
      bg: "oklch(0.16 0.05 320)",
      primary: "oklch(0.7 0.18 340)",
    },
  },
  clean: {
    name: "Clean",
    previewColors: {
      bg: "oklch(1 0 0)",
      primary: "oklch(0.2 0.015 252)",
    },
  },
};
