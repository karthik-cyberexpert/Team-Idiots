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

const gradients = [
  "linear-gradient(-45deg, #ff0000, #00ff00, #0000ff, #ffff00)",
  "linear-gradient(-45deg, #ffff00, #a52a2a, #ffd700, #ffc0cb)",
  "linear-gradient(-45deg, #8a2be2, #00ffff, #ff7f50, #dc143c)",
  "linear-gradient(-45deg, #ff6347, #ffd700, #adff2f, #40e0d0)",
  "linear-gradient(-45deg, #4158D0, #C850C0, #FFCC70)",
  "linear-gradient(-45deg, #FA8BFF, #2BD2FF, #2BFF88)",
  "linear-gradient(-45deg, #FF3CAC, #784BA0, #2B86C5)",
  "linear-gradient(-45deg, #FEE140, #FA709A)",
  "linear-gradient(-45deg, #A9C9FF, #FFBBEC)",
  "linear-gradient(-45deg, #00DBDE, #FC00FF)",
  "linear-gradient(-45deg, #08AEEA, #2AF598)",
  "linear-gradient(-45deg, #F4D03F, #16A085)",
  "linear-gradient(-45deg, #D4145A, #FBB03B)",
  "linear-gradient(-45deg, #662D8C, #ED1E79)",
  "linear-gradient(-45deg, #EEAD92, #6018DC)",
  "linear-gradient(-45deg, #FBAB7E, #F7CE68)",
  "linear-gradient(-45deg, #85FFBD, #FFFB7D)",
  "linear-gradient(-45deg, #3EECAC, #EE74E1)",
  "linear-gradient(-45deg, #EA00FF, #0098F0, #00FF9D)",
  "linear-gradient(-45deg, #FF3E9D, #0E1F40, #0098F0)",
  "linear-gradient(-45deg, #FF0000, #FF7F00, #FFFF00)",
  "linear-gradient(-45deg, #00FF00, #00FFFF, #0000FF)",
  "linear-gradient(-45deg, #8A2BE2, #FF00FF, #FF1493)",
  "linear-gradient(-45deg, #FFD700, #FFA500, #FF4500)",
  "linear-gradient(-45deg, #ADFF2F, #7FFF00, #32CD32)",
  "linear-gradient(-45deg, #40E0D0, #20B2AA, #008080)",
  "linear-gradient(-45deg, #FF69B4, #FF1493, #C71585)",
  "linear-gradient(-45deg, #1E90FF, #4169E1, #0000CD)",
  "linear-gradient(-45deg, #F08080, #CD5C5C, #A52A2A)",
  "linear-gradient(-45deg, #9370DB, #8A2BE2, #4B0082)",
  "linear-gradient(-45deg, #3CB371, #2E8B57, #006400)",
  "linear-gradient(-45deg, #FFA07A, #FF7F50, #FF6347)",
  "linear-gradient(-45deg, #B0C4DE, #778899, #708090)",
  "linear-gradient(-45deg, #FFC0CB, #FFB6C1, #FF69B4)",
  "linear-gradient(-45deg, #FFE4B5, #FFDAB9, #FFDEAD)",
  "linear-gradient(-45deg, #98FB98, #90EE90, #3CB371)",
  "linear-gradient(-45deg, #ADD8E6, #87CEEB, #87CEFA)",
  "linear-gradient(-45deg, #F0E68C, #EEE8AA, #BDB76B)",
  "linear-gradient(-45deg, #E6E6FA, #D8BFD8, #DDA0DD)",
  "linear-gradient(-45deg, #FFFACD, #FAFAD2, #FFFFE0)",
  "linear-gradient(-45deg, #00FA9A, #00FF7F, #32CD32)",
  "linear-gradient(-45deg, #48D1CC, #40E0D0, #20B2AA)",
  "linear-gradient(-45deg, #C71585, #DB7093, #FF1493)",
  "linear-gradient(-45deg, #6495ED, #4169E1, #1E90FF)",
  "linear-gradient(-45deg, #DC143C, #B22222, #8B0000)",
  "linear-gradient(-45deg, #FF8C00, #FFA500, #FFD700)",
  "linear-gradient(-45deg, #228B22, #008000, #006400)",
  "linear-gradient(-45deg, #4682B4, #5F9EA0, #66CDAA)",
  "linear-gradient(-45deg, #BA55D3, #9932CC, #8A2BE2)",
  "linear-gradient(-45deg, #CD853F, #D2691E, #A0522D)",
];

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
      const randomIndex = Math.floor(Math.random() * gradients.length);
      root.style.setProperty('--magic-gradient', gradients[randomIndex]);
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