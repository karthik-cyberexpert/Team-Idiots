import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = "light" | "dark" | "retro";
type FontSize = "sm" | "md" | "lg";
type FontFamily = "sans" | "serif" | "mono";
type MagicTheme = "none" | "refresh" | "click" | "gradient";

const magicThemeNames = [
  "theme-sunset", "theme-ocean", "theme-forest", "theme-lavender",
  "theme-rose", "theme-slate", "theme-coffee", "theme-matrix",
  "theme-cyberpunk", "theme-autumn", "theme-spring", "theme-monochrome"
];

interface ThemeProviderState {
  theme: Theme;
  fontSize: FontSize;
  fontFamily: FontFamily;
  magicTheme: MagicTheme;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  setFontFamily: (family: FontFamily) => void;
  setMagicTheme: (magicTheme: MagicTheme) => void;
}

const initialState: ThemeProviderState = {
  theme: "dark",
  fontSize: "md",
  fontFamily: "sans",
  magicTheme: "none",
  setTheme: () => null,
  setFontSize: () => null,
  setFontFamily: () => null,
  setMagicTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "dark");
  const [fontSize, setFontSizeState] = useState<FontSize>(() => (localStorage.getItem("font-size") as FontSize) || "md");
  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => (localStorage.getItem("font-family") as FontFamily) || "sans");
  const [magicTheme, setMagicThemeState] = useState<MagicTheme>(() => (localStorage.getItem("magic-theme") as MagicTheme) || "none");
  const [currentMagicThemeClass, setCurrentMagicThemeClass] = useState<string>('');

  // Handle theme application to the root element
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Clear all possible theme classes
    root.classList.remove("light", "dark", "retro", "magic-gradient-text", ...magicThemeNames);

    if (magicTheme === 'gradient') {
      root.classList.add(theme); // Apply base theme
      root.classList.add('magic-gradient-text');
    } else if (magicTheme === 'none') {
      root.classList.add(theme);
    } else {
      if (currentMagicThemeClass) {
        root.classList.add(currentMagicThemeClass);
      } else {
        // Fallback to base theme if magic theme class isn't set yet
        root.classList.add(theme);
      }
    }
  }, [theme, magicTheme, currentMagicThemeClass]);

  // Handle Magic Theme 1: Refresh
  useEffect(() => {
    if (magicTheme === 'refresh') {
      const currentIndex = parseInt(sessionStorage.getItem('magic-theme-index') || '-1');
      const nextIndex = (currentIndex + 1) % magicThemeNames.length;
      setCurrentMagicThemeClass(magicThemeNames[nextIndex]);
      sessionStorage.setItem('magic-theme-index', nextIndex.toString());
    }
  }, [magicTheme]); // Runs once when magicTheme is set to 'refresh'

  // Handle Magic Theme 2: Click
  useEffect(() => {
    if (magicTheme !== 'click') return;

    let currentIndex = -1;

    const handleClick = () => {
      currentIndex = (currentIndex + 1) % magicThemeNames.length;
      setCurrentMagicThemeClass(magicThemeNames[currentIndex]);
    };

    // Set initial theme for click mode
    handleClick();

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [magicTheme]);

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

  const value = {
    theme,
    fontSize,
    fontFamily,
    magicTheme,
    setTheme,
    setFontSize: setFontSizeState,
    setFontFamily: setFontFamilyState,
    setMagicTheme,
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