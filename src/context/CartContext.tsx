import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";

import { useAuth } from "@/hooks/useAuth";
import type { CartItem, Product, Size, ProductColor } from "@/types";
import { FREE_SHIPPING_THRESHOLD } from "@/utils/constants";

// ── State ─────────────────────────────────────────────────────────────
interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

const initialState: CartState = {
  items: [],
  isOpen: false,
};

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

      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            key(i) === newKey
              ? {
                  ...i,
                  quantity: i.quantity + action.payload.quantity,
                  // ✅ Actualiza la imagen si viene una nueva
                  variantImage: action.payload.variantImage ?? i.variantImage,
                }
              : i,
          ),
        };
      }

      return {
        ...state,
        items: [...state.items, action.payload],
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
        items: state.items.map((i) =>
          i.product.id === productId &&
          i.selectedSize === size &&
          i.selectedColor.name === colorName
            ? { ...i, quantity }
            : i,
        ),
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
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  freeShippingRemaining: number;

  // ✅ variantImage agregado como parámetro opcional
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
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const storageKey = user ? `cart_${user.id}` : "cart_guest";

  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Cargar carrito al iniciar sesión
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    dispatch({
      type: "SET_CART",
      payload: saved ? JSON.parse(saved) : initialState,
    });
  }, [storageKey]);

  // Guardar carrito
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  // Limpiar al cerrar sesión
  useEffect(() => {
    if (!isAuthenticated) dispatch({ type: "CLEAR" });
  }, [isAuthenticated]);

  // Totales
  const itemCount = state.items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = state.items.reduce(
    (s, i) => s + i.product.price * i.quantity,
    0,
  );
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 9.99;
  const total = subtotal + shipping;
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // ✅ addItem ahora acepta variantImage y la guarda en el CartItem
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
          variantImage, // ✅ se guarda en el item
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

  const clearCart = useCallback(() => dispatch({ type: "CLEAR" }), []);
  const openCart = useCallback(() => dispatch({ type: "OPEN" }), []);
  const closeCart = useCallback(() => dispatch({ type: "CLOSE" }), []);

  return (
    <CartContext.Provider
      value={{
        ...state,
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────────────────────
export const useCartContext = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext must be used within CartProvider");
  return ctx;
};
