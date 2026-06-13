import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type MobileNavContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const noop = () => {};

const MobileNavContext = createContext<MobileNavContextValue>({
  isOpen: false,
  open: noop,
  close: noop,
  toggle: noop,
});

/**
 * Provides the open/closed state for the mobile sidebar drawer.
 * The Topbar hamburger toggles it; the Sidebar reads it to slide in/out.
 * On desktop (lg+) the sidebar is always visible and this state is ignored.
 */
export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<MobileNavContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
    }),
    [isOpen],
  );

  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}
