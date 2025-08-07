import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = "light" | "dark" | "retro";
type FontSize = "sm" | "md" | "lg";
type FontFamily = "sans" | "serif" | "mono";
type MagicTheme = "none" | "refresh" | "click" | "gradient";
type GradientScope = "headings" | "full";

const lightMagicThemeNames = [
  "theme-sunset", "theme-ocean", "theme-forest", "theme-lavender",
  "theme-rose", "theme-slate", "theme-coffee", "theme-sandstone",
  "theme-mint", "theme-autumn", "theme-spring", "theme-monochrome"
];

const darkMagicThemeNames = [
  "theme-matrix", "theme-cyberpunk", "theme-tokyo-night", "theme-dracula",
  "theme-gruvbox-dark", "theme-nord-dark", "theme-synthwave", "theme-volcano",
  "theme-deep-space", "theme-gotham", "theme-emerald-night", "theme-crimson-dark"
];

const allMagicThemes = [...lightMagicThemeNames, ...darkMagicThemeNames];

const VIBGYOR_GRADIENT = "linear-gradient(-45deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3)";

interface ThemeProviderState {
  theme: Theme;
  fontSize: FontSize;
  fontFamily: FontFamily;
  magicTheme: MagicTheme;
  gradientScope: GradientScope;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  setFontFamily: (family: FontFamily) => void;
  setMagicTheme: (magicTheme: MagicTheme) => void;
  setGradientScope: (scope: GradientScope) => void;
}

const initialState: ThemeProviderState = {
  theme: "dark",
  fontSize: "md",
  fontFamily: "sans",
  magicTheme: "none",
  gradientScope: "headings",
  setTheme: () => null,
  setFontSize: () => null,
  setFontFamily: () => null,
  setMagicTheme: () => null,
  setGradientScope: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "dark");
  const [fontSize, setFontSizeState] = useState<FontSize>(() => (localStorage.getItem("font-size") as FontSize) || "md");
  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => (localStorage.getItem("font-family") as FontFamily) || "sans");
  const [magicTheme, setMagicThemeState] = useState<MagicTheme>(() => (localStorage.getItem("magic-theme") as MagicTheme) || "none");
  const [gradientScope, setGradientScopeState] = useState<GradientScope>(() => (localStorage.getItem("gradient-scope") as GradientScope) || "headings");
  const [currentMagicThemeClass, setCurrentMagicThemeClass] = useState<string>('');

  // Handle theme application to the root element
  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove("light", "dark", "retro", "magic-gradient-text", "gradient-scope-full", ...allMagicThemes);
    root.style.removeProperty('--magic-gradient');

    if (magicTheme === 'gradient') {
      root.classList.add('magic-gradient-text');
      if (gradientScope === 'full') {
        root.classList.add('gradient-scope-full');
      }
      root.style.setProperty('--magic-gradient', VIBGYOR_GRADIENT);
    }
    
    if (magicTheme === 'none') {
      root.classList.add(theme);
    } else if (magicTheme !== 'gradient') {
      if (currentMagicThemeClass) {
        root.classList.add(currentMagicThemeClass);
        if (lightMagicThemeNames.includes(currentMagicThemeClass)) {
          root.classList.add('light');
        } else {
          root.classList.add('dark');
        }
      } else {
        root.classList.add(theme);
      }
    } else {
      root.classList.add(theme);
    }
  }, [theme, magicTheme, gradientScope, currentMagicThemeClass]);

  // Handle Magic Theme 1: Refresh
  useEffect(() => {
    if (magicTheme === 'refresh') {
      const themeList = theme === 'dark' ? darkMagicThemeNames : lightMagicThemeNames;
      const storageKey = `magic-theme-index-${theme}`;
      const currentIndex = parseInt(sessionStorage.getItem(storageKey) || '-1');
      const nextIndex = (currentIndex + 1) % themeList.length;
      setCurrentMagicThemeClass(themeList[nextIndex]);
      sessionStorage.setItem(storageKey, nextIndex.toString());
    }
  }, [magicTheme, theme]);

  // Handle Magic Theme 2: Click
  useEffect(() => {
    if (magicTheme !== 'click') return;

    const themeList = theme === 'dark' ? darkMagicThemeNames : lightMagicThemeNames;
    let currentIndex = -1;

    const handleClick = () => {
      currentIndex = (currentIndex + 1) % themeList.length;
      setCurrentMagicThemeClass(themeList[currentIndex]);
    };

    handleClick(); // Set initial theme

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [magicTheme, theme]);

  // Handle font size and family
  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty('--font-size-multiplier', fontSize === 'sm' ? '0.875' : fontSize === 'lg' ? '1.125' : '1');
    localStorage.setItem("font-size", fontSize);
  }, [fontSize]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("font-sans", "font-serif", "font-mono");
    root.classList.add(`font-${fontFamily}`);
    localStorage.setItem("font-family", fontFamily);
  }, [fontFamily]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem("theme", newTheme);
    setThemeState(newTheme);
  };

  const setMagicTheme = (newMagicTheme: MagicTheme) => {
    localStorage.setItem("magic-theme", newMagicTheme);
    setMagicThemeState(newMagicTheme);
  };

  const setGradientScope = (newScope: GradientScope) => {
    localStorage.setItem("gradient-scope", newScope);
    setGradientScopeState(newScope);
  };

  const value = {
    theme,
    fontSize,
    fontFamily,
    magicTheme,
    gradientScope,
    setTheme,
    setFontSize: setFontSizeState,
    setFontFamily: setFontFamilyState,
    setMagicTheme,
    setGradientScope,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};