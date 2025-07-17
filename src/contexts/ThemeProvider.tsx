import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = "light" | "dark" | "retro";
type FontSize = "sm" | "md" | "lg";
type FontFamily = "sans" | "serif" | "mono";

interface ThemeProviderState {
  theme: Theme;
  fontSize: FontSize;
  fontFamily: FontFamily;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  setFontFamily: (family: FontFamily) => void;
}

const initialState: ThemeProviderState = {
  theme: "light",
  fontSize: "md",
  fontFamily: "sans",
  setTheme: () => null,
  setFontSize: () => null,
  setFontFamily: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "light");
  const [fontSize, setFontSizeState] = useState<FontSize>(() => (localStorage.getItem("font-size") as FontSize) || "md");
  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => (localStorage.getItem("font-family") as FontFamily) || "sans");

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove("light", "dark", "retro");
    
    if (theme === 'light') {
        // The default is light, no class needed unless you want to be explicit
    } else {
        root.classList.add(theme);
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.style.setProperty('--font-size-multiplier', 
      fontSize === 'sm' ? '0.875' : fontSize === 'lg' ? '1.125' : '1'
    );

    localStorage.setItem("font-size", fontSize);
  }, [fontSize]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove("font-sans", "font-serif", "font-mono");
    root.classList.add(`font-${fontFamily}`);

    localStorage.setItem("font-family", fontFamily);
  }, [fontFamily]);

  const value = {
    theme,
    fontSize,
    fontFamily,
    setTheme: setThemeState,
    setFontSize: setFontSizeState,
    setFontFamily: setFontFamilyState,
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