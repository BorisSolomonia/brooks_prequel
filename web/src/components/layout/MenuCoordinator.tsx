'use client';

// BOR-47: shared coordinator so the app's primary menus are MUTUALLY EXCLUSIVE.
// Today the Navbar's mobile "Menu" dropdown (the "upper menu") and the map's
// right-side drawer (the "burger menu") live in different components with no
// shared awareness, so both can be open at once and overlap.
//
// This holds a single `openMenuId`. Opening one menu sets it as the active id;
// every other menu watches the id and closes itself when it's no longer the
// active one. Closing only clears the id if it still belongs to the closer, so
// the reactive closes can't fight each other (no update loops).

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type MenuId = 'upper' | 'burger';

interface MenuCoordinatorValue {
  openMenuId: MenuId | null;
  openMenu: (id: MenuId) => void;
  closeMenu: (id: MenuId) => void;
}

const MenuCoordinatorContext = createContext<MenuCoordinatorValue | null>(null);

export function MenuCoordinatorProvider({ children }: { children: React.ReactNode }) {
  const [openMenuId, setOpenMenuId] = useState<MenuId | null>(null);

  const openMenu = useCallback((id: MenuId) => setOpenMenuId(id), []);
  const closeMenu = useCallback(
    (id: MenuId) => setOpenMenuId((current) => (current === id ? null : current)),
    [],
  );

  const value = useMemo(() => ({ openMenuId, openMenu, closeMenu }), [openMenuId, openMenu, closeMenu]);
  return <MenuCoordinatorContext.Provider value={value}>{children}</MenuCoordinatorContext.Provider>;
}

// Safe to call outside the provider (returns a no-op) so components that render
// in both provided and bare contexts don't crash.
export function useMenuCoordinator(): MenuCoordinatorValue {
  return (
    useContext(MenuCoordinatorContext) ?? {
      openMenuId: null,
      openMenu: () => {},
      closeMenu: () => {},
    }
  );
}
