import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isEveningTime } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'auto',
  isDark: false,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'auto';
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateDark = () => {
      let shouldBeDark = false;
      if (theme === 'dark') shouldBeDark = true;
      else if (theme === 'light') shouldBeDark = false;
      else shouldBeDark = isEveningTime();

      setIsDark(shouldBeDark);
      document.documentElement.classList.toggle('dark', shouldBeDark);
    };

    updateDark();

    if (theme === 'auto') {
      const interval = setInterval(updateDark, 60000);
      return () => clearInterval(interval);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
