import React, { createContext, useContext, useState, useMemo } from "react";
import { CartItem } from "../../types";
import { calcCartTotals } from "../../services/pricing";

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  hydrateCart: (items: CartItem[]) => void;
  // reactive computed values
  originalSubtotal: number;
  discountedSubtotal: number;
  discountTotal: number;
  shippingFee: number;
  total: number;
  freeShippingEligible: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    console.log('Adding to cart:', item);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      const stock = Math.max(0, Number((item as any).stock ?? existing?.stock ?? 0));
      if (stock <= 0) {
        console.warn('Cannot add item: out of stock', item.id);
        return prev;
      }
      if (existing) {
        // Prevent exceeding available stock.
        if (existing.quantity >= stock) {
          console.warn('Cannot add more: would exceed stock', item.id, existing.quantity, stock);
          return prev;
        }
        const newCart = prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
        console.log('Updated cart item quantity:', item.id, existing.quantity + 1);
        return newCart;
      }
      const newCart = [...prev, { ...item, quantity: 1 }];
      console.log('Added new item to cart:', item.id);
      return newCart;
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(1, Math.min(Math.floor(Number(quantity) || 1), Math.max(1, Number((item as any).stock || 1)))),
            }
          : item
      )
    );
  };

  const hydrateCart = (items: CartItem[]) => {
    console.log('Hydrating cart with items:', items.length);
    setCart(items);
  };

  const {
    originalSubtotal,
    discountedSubtotal,
    discountTotal,
    shippingFee,
    total,
    freeShippingEligible,
  } = useMemo(() => calcCartTotals(cart), [cart]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, hydrateCart, originalSubtotal, discountedSubtotal, discountTotal, shippingFee, total, freeShippingEligible }}>
      {children}
    </CartContext.Provider>
  );
};
