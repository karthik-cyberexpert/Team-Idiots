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
  "linear-gradient(-45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8a2be2)",
  "linear-gradient(-45deg, #00c6ff, #0072ff)",
  "linear-gradient(-45deg, #f7971e, #ffd200)",
  "linear-gradient(-45deg, #ed213a, #93291e)",
  "linear-gradient(-45deg, #a8ff78, #78ffd6)",
  "linear-gradient(-45deg, #ff512f, #dd2476)",
  "linear-gradient(-45deg, #DA4453, #89216B)",
  "linear-gradient(-45deg, #3a6186, #89253e)",
  "linear-gradient(-45deg, #43C6AC, #191654)",
  "linear-gradient(-45deg, #FF416C, #FF4B2B)",
  "linear-gradient(-45deg, #00F260, #0575E6)",
  "linear-gradient(-45deg, #f953c6, #b91d73)",
  "linear-gradient(-45deg, #c33764, #1d2671)",
  "linear-gradient(-45deg, #36D1DC, #5B86E5)",
  "linear-gradient(-45deg, #e52d27, #b31217)",
  "linear-gradient(-45deg, #2193b0, #6dd5ed)",
  "linear-gradient(-45deg, #cc2b5e, #753a88)",
  "linear-gradient(-45deg, #42275a, #734b6d)",
  "linear-gradient(-45deg, #de6262, #ffb88c)",
  "linear-gradient(-45deg, #642B73, #C6426E)",
  "linear-gradient(-45deg, #C04848, #480048)",
  "linear-gradient(-45deg, #1f4037, #99f2c8)",
  "linear-gradient(-45deg, #F2C94C, #F2994A)",
  "linear-gradient(-45deg, #00b09b, #96c93d)",
  "linear-gradient(-45deg, #ff4e50, #f9d423)",
  "linear-gradient(-45deg, #e65c00, #f9d423)",
  "linear-gradient(-45deg, #2c3e50, #fd746c)",
  "linear-gradient(-45deg, #ff5f6d, #ffc371)",
  "linear-gradient(-45deg, #373B44, #4286f4)",
  "linear-gradient(-45deg, #4b6cb7, #182848)",
  "linear-gradient(-45deg, #7F00FF, #E100FF)",
  "linear-gradient(-45deg, #00bf8f, #001510)",
  "linear-gradient(-45deg, #FC466B, #3F5EFB)",
  "linear-gradient(-45deg, #00416A, #799F0C, #FFE000)",
  "linear-gradient(-45deg, #1A2980, #26D0CE)",
  "linear-gradient(-45deg, #FDBB2D, #22C1C3)",
  "linear-gradient(-45deg, #f857a6, #ff5858)",
  "linear-gradient(-45deg, #aa076b, #61045f)",
  "linear-gradient(-45deg, #20002c, #cbb4d4)",
  "linear-gradient(-45deg, #0052D4, #4364F7, #6FB1FC)",
  "linear-gradient(-45deg, #43e97b, #38f9d7)",
  "linear-gradient(-45deg, #5614B0, #dbd65c)",
  "linear-gradient(-45deg, #ff6a00, #ee0979)",
  "linear-gradient(-45deg, #11998e, #38ef7d)",
  "linear-gradient(-45deg, #1c92d2, #f2fcfe)",
  "linear-gradient(-45deg, #00dbde, #fc00ff)",
  "linear-gradient(-45deg, #00c9ff, #92fe9d)",
  "linear-gradient(-45deg, #ef32d9, #89fffd)",
  "linear-gradient(-45deg, #ffdde1, #ee9ca7)",
  "linear-gradient(-45deg, #f093fb, #f5576c)",
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