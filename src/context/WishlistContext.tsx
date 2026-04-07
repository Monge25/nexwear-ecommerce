import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";

import { useAuth } from "@/hooks/useAuth";
import type { Product } from "@/types";

// ── State ─────────────────────────────────────────────
interface WishlistState {
  items: Product[];
  isOpen: boolean;
}

const initialState: WishlistState = {
  items: [],
  isOpen: false,
};

// ── Actions ───────────────────────────────────────────
type WishlistAction =
  | { type: "TOGGLE"; payload: Product }
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "CLEAR" }
  | { type: "SET"; payload: WishlistState };

// ── Reducer ───────────────────────────────────────────
function wishlistReducer(
  state: WishlistState,
  action: WishlistAction,
): WishlistState {
  switch (action.type) {
    case "TOGGLE": {
      const exists = state.items.find((i) => i.id === action.payload.id);

      if (exists) {
        return {
          ...state,
          items: state.items.filter((i) => i.id !== action.payload.id),
        };
      }

      return {
        ...state,
        items: [...state.items, action.payload],
      };
    }

    case "SET":
      return action.payload;

    case "CLEAR":
      return {
        ...state,
        items: [],
      };

    case "OPEN":
      return {
        ...state,
        isOpen: true,
      };

    case "CLOSE":
      return {
        ...state,
        isOpen: false,
      };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────
interface WishlistContextValue extends WishlistState {
  count: number;

  toggle: (product: Product) => void;
  has: (id: string) => boolean;

  openWishlist: () => void;
  closeWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(
  undefined,
);

// ── Provider ──────────────────────────────────────────
export const WishlistProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const storageKey = user ? `wishlist_${user.id}` : "wishlist_guest";

  const [state, dispatch] = useReducer(wishlistReducer, initialState);

  // ── Load wishlist ─────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      dispatch({
        type: "SET",
        payload: JSON.parse(saved),
      });
    } else {
      dispatch({
        type: "SET",
        payload: initialState,
      });
    }
  }, [storageKey]);

  // ── Save wishlist ─────────────────────────────────
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  // ── Clear when logout ─────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: "CLEAR" });
    }
  }, [isAuthenticated]);

  // ── Helpers ───────────────────────────────────────
  const has = useCallback(
    (id: string) => state.items.some((p) => p.id === id),
    [state.items],
  );

  // ── Actions ───────────────────────────────────────
  const toggle = useCallback(
    (product: Product) =>
      dispatch({
        type: "TOGGLE",
        payload: product,
      }),
    [],
  );

  const openWishlist = useCallback(() => dispatch({ type: "OPEN" }), []);

  const closeWishlist = useCallback(() => dispatch({ type: "CLOSE" }), []);

  return (
    <WishlistContext.Provider
      value={{
        ...state,
        count: state.items.length,
        toggle,
        has,
        openWishlist,
        closeWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────
export const useWishlist = (): WishlistContextValue => {
  const ctx = useContext(WishlistContext);

  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");

  return ctx;
};
