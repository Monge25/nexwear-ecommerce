import React, { createContext, useContext, useState, useCallback } from "react";
import type { Product } from "@/types";

interface Ctx {
  items: Product[];
  count: number;
  has: (id: number) => boolean;
  toggle: (p: Product) => void;
}
const WishCtx = createContext<Ctx | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<Product[]>([]);
  const has = useCallback(
    (id: number) => items.some((p) => p.id === id),
    [items],
  );
  const toggle = useCallback(
    (p: Product) =>
      setItems((prev) =>
        prev.some((x) => x.id === p.id)
          ? prev.filter((x) => x.id !== p.id)
          : [...prev, p],
      ),
    [],
  );
  return (
    <WishCtx.Provider value={{ items, count: items.length, has, toggle }}>
      {children}
    </WishCtx.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishCtx);
  if (!ctx) throw new Error("useWishlist outside WishlistProvider");
  return ctx;
};

// ─── AuthModal ────────────────────────────────────────────────────────────────
interface ModalState {
  open: boolean;
  reason?: string;
  onSuccess?: () => void;
}
interface ModalCtx {
  state: ModalState;
  openModal: (reason?: string, onSuccess?: () => void) => void;
  closeModal: () => void;
}
const ModalCtx = createContext<ModalCtx | undefined>(undefined);

export const AuthModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<ModalState>({ open: false });
  const openModal = useCallback(
    (reason?: string, onSuccess?: () => void) =>
      setState({ open: true, reason, onSuccess }),
    [],
  );
  const closeModal = useCallback(() => setState({ open: false }), []);
  return (
    <ModalCtx.Provider value={{ state, openModal, closeModal }}>
      {children}
    </ModalCtx.Provider>
  );
};

export const useAuthModal = () => {
  const ctx = useContext(ModalCtx);
  if (!ctx) throw new Error("useAuthModal outside AuthModalProvider");
  return ctx;
};
