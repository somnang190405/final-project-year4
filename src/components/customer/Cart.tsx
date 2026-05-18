import React from 'react';
import { CartItem, User } from '../../types';
import { ShoppingBag, CheckCircle, Trash2, Minus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calcCartTotals, calcDiscountedUnitPrice, formatPromotionPercentBadge, normalizePromotionPercent, SHIPPING_THRESHOLD } from '../../services/pricing';

type Props = {
  cart: CartItem[];
  updateCartQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  user: User | null;
  setView: (view: string) => void;
  notify?: (msg: string, type: 'success' | 'error') => void;
};

const Cart = ({ cart, updateCartQty, removeFromCart, user, setView, notify }: Props) => {
  const navigate = useNavigate();
  const {
    originalSubtotal,
    discountedSubtotal,
    discountTotal,
    shippingFee,
    total,
    freeShippingEligible,
  } = calcCartTotals(cart);
  const amountUntilFreeShipping = Math.max(0, SHIPPING_THRESHOLD - discountedSubtotal);

  const handleCheckout = async () => {
    if (!user) {
      if (notify) notify('Please login to checkout', 'error');
      return;
    }
    navigate('/payment');
  };

  if (cart.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12 bg-slate-50">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <ShoppingBag size={32} className="text-slate-400" />
      </div>
      <h2 className="text-2xl font-semibold mb-2 text-slate-900">Your cart is empty</h2>
      <p className="text-sm text-slate-500 mb-8 text-center max-w-md">Looks like you haven't added anything yet. Add your favorite items to see them here.</p>
      <button onClick={() => setView('shop')} className="rounded-3xl bg-slate-900 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 hover:-translate-y-0.5">
        Start Shopping
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
        <section className="flex-1">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-indigo-600 font-semibold mb-2">Shopping Cart</p>
              <h1 className="text-4xl font-semibold text-slate-900">Your bag</h1>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              {cart.length} item{cart.length === 1 ? '' : 's'} selected
            </div>
          </div>

          <div className="space-y-4">
            {cart.map(item => (
              <div key={item.id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr] items-start">
                  <div className="flex items-start gap-5">
                    <div className="h-28 w-28 overflow-hidden rounded-3xl bg-slate-100 flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/112x112?text=Image'; }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold text-slate-900 truncate">{item.name}</h2>
                      <p className="mt-2 text-sm text-slate-500">{item.category} · {item.subcategory || 'Standard'}</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <span className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700">Size: S</span>
                        <span className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700">Color: {item.colors && item.colors.length > 0 ? item.colors[0] : 'Default'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-700">
                        <button
                          onClick={() => updateCartQty(item.id, Math.max(1, item.quantity - 1))}
                          className="rounded-full p-2 hover:bg-slate-200 transition-all"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="min-w-[2rem] text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQty(item.id, Math.max(1, item.quantity + 1))}
                          className="rounded-full p-2 hover:bg-slate-200 transition-all"
                          aria-label="Increase quantity"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>

                    <div className="text-right">
                      {(() => {
                        const promo = normalizePromotionPercent((item as any).promotionPercent);
                        const hasPromo = promo > 0;
                        const unit = calcDiscountedUnitPrice(item.price, promo);
                        const line = unit * item.quantity;
                        const originalLine = item.price * item.quantity;
                        return (
                          <>
                            <p className="text-lg font-semibold text-slate-900">${line.toFixed(2)}</p>
                            <p className="text-sm text-slate-500">Unit ${unit.toFixed(2)}</p>
                            {hasPromo && (
                              <div className="mt-2 flex items-center justify-end gap-2 text-xs text-slate-500">
                                <span className="rounded-full bg-rose-600 px-2 py-1 text-white font-semibold">-{formatPromotionPercentBadge(promo)}%</span>
                                <span className="line-through">${originalLine.toFixed(2)}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="lg:w-[400px] flex-shrink-0">
          <div className="sticky top-8 space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-500">Order summary</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Total estimate</h2>
                </div>
                <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">Free delivery</div>
              </div>

              <div className="space-y-4 text-sm text-slate-600 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">${originalSubtotal.toFixed(2)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span className="font-semibold text-rose-600">-${discountTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className={`font-semibold ${freeShippingEligible ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {shippingFee === 0 ? 'Free' : `$${shippingFee.toFixed(2)}`}
                  </span>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between text-xl font-semibold text-slate-900">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                {!freeShippingEligible && (
                  <p className="mt-4 text-sm text-slate-600">
                    Add <span className="font-semibold text-slate-900">${amountUntilFreeShipping.toFixed(2)}</span> more to unlock free delivery on orders over $100.
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full rounded-3xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white shadow-xl shadow-slate-900/15 transition-all hover:bg-slate-800 hover:-translate-y-0.5"
            >
              Proceed to Checkout
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
