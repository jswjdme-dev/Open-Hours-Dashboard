import React, { createContext, useContext, ReactNode } from 'react';
import { PortalTheme, DEFAULT_OPEN_HOURS_THEME } from '../lib/branding.ts';

interface PortalThemeContextValue {
  theme: PortalTheme;
}

const PortalThemeContext = createContext<PortalThemeContextValue>({
  theme: DEFAULT_OPEN_HOURS_THEME,
});

export const usePortalTheme = (): PortalTheme => {
  const context = useContext(PortalThemeContext);
  return context.theme;
};

interface PortalThemeProviderProps {
  theme: PortalTheme;
  children: ReactNode;
}

export const PortalThemeProvider: React.FC<PortalThemeProviderProps> = ({ theme, children }) => {
  return (
    <PortalThemeContext.Provider value={{ theme }}>
      {children}
    </PortalThemeContext.Provider>
  );
};
