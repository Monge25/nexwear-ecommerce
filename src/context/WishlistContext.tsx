import React, { createContext, useContext, useState, useCallback } from "react";
import type { Product } from "@/types";

interface Ctx {
  items: Product[];
  count: number;
  isOpen: boolean;
  has: (id: string) => boolean;
  toggle: (p: Product) => void;
  openWishlist: () => void;
  closeWishlist: () => void;
}

const WishCtx = createContext<Ctx | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const has = useCallback(
    (id: string) => items.some((p) => p.id === id),
    [items]
  );

  const toggle = useCallback(
    (p: Product) =>
      setItems((prev) =>
        prev.some((x) => x.id === p.id)
          ? prev.filter((x) => x.id !== p.id)
          : [...prev, p]
      ),
    []
  );

  const openWishlist = () => setIsOpen(true);
  const closeWishlist = () => setIsOpen(false);

  return (
    <WishCtx.Provider
      value={{
        items,
        count: items.length,
        isOpen,
        has,
        toggle,
        openWishlist,
        closeWishlist,
      }}
    >
      {children}
    </WishCtx.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishCtx);
  if (!ctx) throw new Error("useWishlist outside WishlistProvider");
  return ctx;
};