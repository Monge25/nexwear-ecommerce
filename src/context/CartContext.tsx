import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
} from "react";

import { useAuth } from "@/hooks/useAuth";
import cartService from "@/services/cartService";
import type { CartItem, Product, Size, ProductColor } from "@/types";
import { FREE_SHIPPING_THRESHOLD } from "@/utils/constants";

function getItemStock(item: CartItem): number {
  const variant = item.product.variants?.find(
    (v) => v.color === item.selectedColor.name && v.size === item.selectedSize,
  );
  return variant?.stock ?? item.product.stock ?? Infinity;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

const initialState: CartState = { items: [], isOpen: false };

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
  | { type: "SET_CART"; payload: CartState }
  // Acción para guardar el cartItemId del backend en un item existente
  | {
      type: "SET_CART_ITEM_ID";
      payload: {
        productId: string;
        size: Size;
        colorName: string;
        cartItemId: string;
      };
    };

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

    case "SET_CART_ITEM_ID": {
      const { productId, size, colorName, cartItemId } = action.payload;
      return {
        ...state,
        items: state.items.map((i) =>
          i.product.id === productId &&
          i.selectedSize === size &&
          i.selectedColor.name === colorName
            ? { ...i, cartItemId }
            : i,
        ),
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

interface CartContextValue extends CartState {
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
  removeOutOfStockItems: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const storageKey = user?.id ? `cart_${user.id}` : "cart_guest";
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    dispatch({
      type: "SET_CART",
      payload: saved ? { ...JSON.parse(saved), isOpen: false } : initialState,
    });
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: "CLEAR" });
      localStorage.removeItem("cart_guest");
    }
  }, [isAuthenticated]);

  const availableItems = useMemo(
    () => state.items.filter((i) => getItemStock(i) > 0),
    [state.items],
  );
  const outOfStockItems = useMemo(
    () => state.items.filter((i) => getItemStock(i) === 0),
    [state.items],
  );
  const hasOutOfStock = outOfStockItems.length > 0;
  const itemCount = availableItems.reduce((s, i) => s + i.quantity, 0);
  const subtotal = availableItems.reduce(
    (s, i) => s + i.product.price * i.quantity,
    0,
  );
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 9.99;
  const total = subtotal + shipping;
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  const addItem = useCallback(
    async (
      product: Product,
      quantity: number,
      selectedSize: Size,
      selectedColor: ProductColor,
      variantImage?: string,
    ) => {
      // 1. Actualizar estado local inmediatamente (optimistic update)
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

      // 2. Sincronizar con el backend
      try {
        const variant = product.variants?.find(
          (v) => v.color === selectedColor.name && v.size === selectedSize,
        );

        if (!variant) {
          console.warn(
            "No se encontró variante para sincronizar con el backend",
          );
          return;
        }

        const backendCart = await cartService.addItem({
          productId: product.id,
          variantId: variant.id,
          quantity,
        });

        // Guardar el cartItemId del backend en el item local
        // El backend devuelve todos los items del carrito — buscamos el que coincide
        const backendItem = backendCart.items.find(
          (i) => i.variantId === variant.id,
        );

        if (backendItem) {
          dispatch({
            type: "SET_CART_ITEM_ID",
            payload: {
              productId: product.id,
              size: selectedSize,
              colorName: selectedColor.name,
              cartItemId: backendItem.id,
            },
          });
        }
      } catch (err: any) {
        console.error(
          "Error sincronizando carrito con backend:",
          err.response?.data,
        );
      }
    },
    [],
  );

  // removeItem ahora llama al endpoint DELETE /Cart/items/{cartItemId}
  const removeItem = useCallback(
    async (productId: string, size: Size, colorName: string) => {
      // Buscar el cartItemId antes de eliminar del estado local
      const item = state.items.find(
        (i) =>
          i.product.id === productId &&
          i.selectedSize === size &&
          i.selectedColor.name === colorName,
      );

          console.log("ITEM A ELIMINAR:", item);
    console.log("cartItemId:", item?.cartItemId);
      // 1. Eliminar del estado local inmediatamente
      dispatch({
        type: "REMOVE_ITEM",
        payload: { productId, size, colorName },
      });

      // 2. Sincronizar con el backend si tenemos el cartItemId
      if (item?.cartItemId) {
        try {
          await cartService.removeItem(item.cartItemId);
        } catch (err: any) {
          console.error(
            "Error eliminando item del carrito en backend:",
            err.response?.data,
          );
        }
      } else {
        console.warn(
          "No se encontró cartItemId para eliminar del backend — solo se eliminó localmente",
        );
      }
    },
    [state.items],
  );

  // updateQuantity ahora llama al endpoint PUT /Cart/items/{cartItemId}
  const updateQuantity = useCallback(
    async (
      productId: string,
      size: Size,
      colorName: string,
      quantity: number,
    ) => {
      const item = state.items.find(
        (i) =>
          i.product.id === productId &&
          i.selectedSize === size &&
          i.selectedColor.name === colorName,
      );

      // 1. Actualizar estado local inmediatamente
      dispatch({
        type: "UPDATE_QTY",
        payload: { productId, size, colorName, quantity },
      });

      // 2. Sincronizar con el backend
      if (item?.cartItemId) {
        try {
          if (quantity <= 0) {
            await cartService.removeItem(item.cartItemId);
          } else {
            await cartService.updateItem(item.cartItemId, quantity);
          }
        } catch (err: any) {
          console.error(
            "Error actualizando cantidad en backend:",
            err.response?.data,
          );
        }
      } else {
        console.warn("No se encontró cartItemId para actualizar en el backend");
      }
    },
    [state.items],
  );

  const removeOutOfStockItems = useCallback(() => {
    outOfStockItems.forEach((item) => {
      removeItem(item.product.id, item.selectedSize, item.selectedColor.name);
    });
  }, [outOfStockItems, removeItem]);

  const clearCart = useCallback(async () => {
    dispatch({ type: "CLEAR" });
    try {
      await cartService.clearCart();
    } catch (err) {
      console.error("Error limpiando carrito en backend:", err);
    }
  }, []);

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
