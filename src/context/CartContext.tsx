import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
} from "react";

import { useAuth } from "@/hooks/useAuth";
import type { CartItem, Product, Size, ProductColor } from "@/types";
import { FREE_SHIPPING_THRESHOLD } from "@/utils/constants";

// ── Helper: obtener stock de un item ─────────────────────────────────
function getItemStock(item: CartItem): number {
  const variant = item.product.variants?.find(
    (v) => v.color === item.selectedColor.name && v.size === item.selectedSize,
  );
  return variant?.stock ?? item.product.stock ?? Infinity;
}

// ── State ─────────────────────────────────────────────────────────────
interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

const initialState: CartState = { items: [], isOpen: false };

// ── Actions ───────────────────────────────────────────────────────────
type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | {
      type: "REMOVE_ITEM";
      payload: { productId: string; size: Size; colorName: string };
    }
  | {
      type: "UPDATE_QTY";
      payload: {
        productId: string;
        size: Size;
        colorName: string;
        quantity: number;
      };
    }
  | { type: "CLEAR" }
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "SET_CART"; payload: CartState };

// ── Reducer ───────────────────────────────────────────────────────────
function cartReducer(state: CartState, action: CartAction): CartState {
  const key = (item: CartItem) =>
    `${item.product.id}-${item.selectedSize}-${item.selectedColor.name}`;

  switch (action.type) {
    case "ADD_ITEM": {
      const newKey = key(action.payload);
      const existing = state.items.find((i) => key(i) === newKey);
      const maxStock = getItemStock(action.payload);

      if (existing) {
        const newQty = Math.min(
          existing.quantity + action.payload.quantity,
          maxStock,
        );
        return {
          ...state,
          items: state.items.map((i) =>
            key(i) === newKey
              ? {
                  ...i,
                  quantity: newQty,
                  variantImage: action.payload.variantImage ?? i.variantImage,
                }
              : i,
          ),
        };
      }

      const clampedQty = Math.min(action.payload.quantity, maxStock);
      if (clampedQty <= 0) return state;

      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: clampedQty }],
      };
    }

    case "REMOVE_ITEM": {
      const { productId, size, colorName } = action.payload;
      return {
        ...state,
        items: state.items.filter(
          (i) =>
            !(
              i.product.id === productId &&
              i.selectedSize === size &&
              i.selectedColor.name === colorName
            ),
        ),
      };
    }

    case "UPDATE_QTY": {
      const { productId, size, colorName, quantity } = action.payload;

      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (i) =>
              !(
                i.product.id === productId &&
                i.selectedSize === size &&
                i.selectedColor.name === colorName
              ),
          ),
        };
      }

      return {
        ...state,
        items: state.items.map((i) => {
          if (
            i.product.id === productId &&
            i.selectedSize === size &&
            i.selectedColor.name === colorName
          ) {
            const maxStock = getItemStock(i);
            return { ...i, quantity: Math.min(quantity, maxStock) };
          }
          return i;
        }),
      };
    }

    case "SET_CART":
      return action.payload;
    case "CLEAR":
      return { ...state, items: [] };
    case "OPEN":
      return { ...state, isOpen: true };
    case "CLOSE":
      return { ...state, isOpen: false };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────
interface CartContextValue extends CartState {
  // Items separados por disponibilidad
  availableItems: CartItem[];
  outOfStockItems: CartItem[];
  hasOutOfStock: boolean;

  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  freeShippingRemaining: number;

  addItem: (
    product: Product,
    qty: number,
    size: Size,
    color: ProductColor,
    variantImage?: string,
  ) => void;
  removeItem: (productId: string, size: Size, colorName: string) => void;
  updateQuantity: (
    productId: string,
    size: Size,
    colorName: string,
    quantity: number,
  ) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Elimina todos los productos agotados de una vez
  removeOutOfStockItems: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const storageKey = user ? `cart_${user.id}` : "cart_guest";

  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    dispatch({
      type: "SET_CART",
      payload: saved ? JSON.parse(saved) : initialState,
    });
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  useEffect(() => {
    if (!isAuthenticated) dispatch({ type: "CLEAR" });
  }, [isAuthenticated]);

  // Separar items disponibles de agotados
  const availableItems = useMemo(
    () => state.items.filter((i) => getItemStock(i) > 0),
    [state.items],
  );

  const outOfStockItems = useMemo(
    () => state.items.filter((i) => getItemStock(i) === 0),
    [state.items],
  );

  const hasOutOfStock = outOfStockItems.length > 0;

  // Totales calculados SOLO con items disponibles
  const itemCount = availableItems.reduce((s, i) => s + i.quantity, 0);
  const subtotal = availableItems.reduce(
    (s, i) => s + i.product.price * i.quantity,
    0,
  );
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 9.99;
  const total = subtotal + shipping;
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  const addItem = useCallback(
    (
      product: Product,
      quantity: number,
      selectedSize: Size,
      selectedColor: ProductColor,
      variantImage?: string,
    ) => {
      dispatch({
        type: "ADD_ITEM",
        payload: {
          product,
          quantity,
          selectedSize,
          selectedColor,
          variantImage,
        },
      });
      dispatch({ type: "OPEN" });
    },
    [],
  );

  const removeItem = useCallback(
    (productId: string, size: Size, colorName: string) =>
      dispatch({
        type: "REMOVE_ITEM",
        payload: { productId, size, colorName },
      }),
    [],
  );

  const updateQuantity = useCallback(
    (productId: string, size: Size, colorName: string, quantity: number) =>
      dispatch({
        type: "UPDATE_QTY",
        payload: { productId, size, colorName, quantity },
      }),
    [],
  );

  // Elimina todos los agotados de una vez
  const removeOutOfStockItems = useCallback(() => {
    outOfStockItems.forEach((item) => {
      dispatch({
        type: "REMOVE_ITEM",
        payload: {
          productId: item.product.id,
          size: item.selectedSize,
          colorName: item.selectedColor.name,
        },
      });
    });
  }, [outOfStockItems]);

  const clearCart = useCallback(() => dispatch({ type: "CLEAR" }), []);
  const openCart = useCallback(() => dispatch({ type: "OPEN" }), []);
  const closeCart = useCallback(() => dispatch({ type: "CLOSE" }), []);

  return (
    <CartContext.Provider
      value={{
        ...state,
        availableItems,
        outOfStockItems,
        hasOutOfStock,
        itemCount,
        subtotal,
        shipping,
        total,
        freeShippingRemaining,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        removeOutOfStockItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext must be used within CartProvider");
  return ctx;
};
