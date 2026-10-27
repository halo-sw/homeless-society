import { neutralTheme } from "@astryxdesign/theme-neutral/built";
export const themes = { neutral: neutralTheme };
export type ThemeSlug = keyof typeof themes;
export const defaultThemeSlug: ThemeSlug = "neutral";
