import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../components/customer/CartContext';
import { clearUserCart, createOrderAndDecrementStock } from '../services/firestoreService';
import { OrderStatus, User } from '../types';
import { calcCartTotals, calcDiscountedUnitPrice, normalizePromotionPercent, SHIPPING_THRESHOLD } from '../services/pricing';
import { Check, CreditCard, ShieldCheck, MapPin, Truck, X, Loader2 } from 'lucide-react';

type Props = { user: User | null; onRequireAuth?: (redirectTo: string) => void };

const fmtMoney = (n: number) => `$${n.toFixed(2)}`;

const CAMBODIA_PROVINCES = [
  'Phnom Penh', 'Banteay Meanchey', 'Battambang', 'Kampong Cham', 'Kampong Chhnang',
  'Kampong Speu', 'Kampong Thom', 'Kampot', 'Kandal', 'Kep', 'Koh Kong', 'Kratie',
  'Mondulkiri', 'Oddar Meanchey', 'Pailin', 'Preah Sihanouk', 'Preah Vihear', 'Prey Veng',
  'Pursat', 'Ratanakiri', 'Siem Reap', 'Stung Treng', 'Svay Rieng', 'Takeo', 'Tboung Khmum',
];

type PaymentMethod = 'card' | 'cod';

const formatCardNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const formatExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const formatOrderId = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  const num = (Math.abs(hash) % 9999) + 1;
  return `ID-${String(num).padStart(4, '0')}`;
};

const PaymentPage: React.FC<Props> = ({ user, onRequireAuth }) => {
  const navigate = useNavigate();
  const { cart, hydrateCart } = useCart();
  const { originalSubtotal, discountedSubtotal, discountTotal, shippingFee, total, freeShippingEligible } = useMemo(
    () => calcCartTotals(cart), [cart]
  );
  const remainingForFreeDelivery = Math.max(0, SHIPPING_THRESHOLD - discountedSubtotal);
  const [busy, setBusy] = useState(false);

  // --- Address (Cambodia format) ---
  const [contactName, setContactName] = useState(user?.name || '');
  const [contactPhone, setContactPhone] = useState(user?.phoneNumber || '');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [commune, setCommune] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [addressNote, setAddressNote] = useState('');
  const [addressError, setAddressError] = useState('');

  // --- Payment ---
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [paymentError, setPaymentError] = useState('');

  // --- Card Form ---
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  // --- Confirmation Modal ---
  const [showConfirm, setShowConfirm] = useState(false);

  const validateAddress = (): string => {
    if (!contactName.trim()) return 'Please enter your name.';
    if (!contactPhone.trim()) return 'Please enter your phone number.';
    if (!/^0\d{8,9}$/.test(contactPhone.trim())) return 'Enter a valid Cambodian phone number (e.g., 012345678).';
    if (!province) return 'Please select a province.';
    if (!streetAddress.trim()) return 'Please enter your street/house number.';
    return '';
  };

  const shippingAddress = useMemo(() => {
    const parts = [streetAddress.trim(), commune.trim(), district.trim(), province].filter(Boolean);
    return parts.join(', ');
  }, [streetAddress, commune, district, province]);

  const handlePlaceOrderClick = () => {
    const addrErr = validateAddress();
    if (addrErr) { setAddressError(addrErr); return; }
    setAddressError('');

    if (!user) { if (onRequireAuth) onRequireAuth('/payment'); return; }
    if (!cart.length) { alert('Cart is empty.'); return; }

    setShowConfirm(true);
  };

  const handleConfirmOrder = async () => {
    setBusy(true);
    try {
      const nowIso = new Date().toISOString();
      const paymentDetails: Record<string, unknown> = {
        address: { contactName: contactName.trim(), contactPhone: contactPhone.trim(), province, district, commune, street: streetAddress.trim(), note: addressNote.trim() },
      };

      let paymentStatus: 'PAID' | 'UNPAID' = 'UNPAID';
      let paidAt: string | null = null;
      let method: string;

      if (paymentMethod === 'card') {
        paymentStatus = 'PAID';
        paidAt = nowIso;
        method = 'CARD';
        paymentDetails.paymentType = 'Card';
      } else {
        paymentStatus = 'UNPAID';
        method = 'COD';
        paymentDetails.paymentType = 'COD';
      }

      await createOrderAndDecrementStock({
        userId: user!.id,
        date: nowIso,
        status: OrderStatus.PENDING,
        paymentStatus,
        paymentMethod: method as any,
        paidAt: paidAt || null,
        paymentDetails,
        total,
        items: cart.map((i) => ({
          productId: i.id, name: i.name, price: Number(calcDiscountedUnitPrice(i.price, i.promotionPercent ?? 0).toFixed(2)),
          originalPrice: i.price, promotionPercent: normalizePromotionPercent(i.promotionPercent ?? 0), quantity: i.quantity, image: i.image,
        })),
      });

      hydrateCart([]);
      await clearUserCart(user!.id);
      setShowConfirm(false);
      navigate('/', { state: { toast: { message: `Order placed! ${paymentMethod === 'cod' ? 'Pay on delivery.' : 'Payment confirmed.'}`, type: 'success' } } });
    } catch (error: any) {
      alert(`Error: ${error?.message || 'Something went wrong.'}`);
    } finally { setBusy(false); }
  };

  if (!cart.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Truck className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">Add items before checking out.</p>
          <Link to="/shop" className="px-6 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition-colors">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ===== LEFT: 3 columns ===== */}
          <div className="lg:col-span-3 space-y-6">

            {/* --- Section 1: Contact & Address (Cambodia) --- */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-indigo-600" />
                Delivery Address
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                  <input value={contactName} onChange={e => { setContactName(e.target.value); setAddressError(''); }} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="e.g., Chan Dara" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <input value={contactPhone} onChange={e => { setContactPhone(e.target.value); setAddressError(''); }} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="e.g., 012345678" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Province / City *</label>
                  <select value={province} onChange={e => { setProvince(e.target.value); setAddressError(''); }} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition bg-white">
                    <option value="">Select province</option>
                    {CAMBODIA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Khan / District</label>
                  <input value={district} onChange={e => setDistrict(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="e.g., Khan Daun Penh" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sangkat / Commune</label>
                  <input value={commune} onChange={e => setCommune(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="e.g., Sangkat Phsar Thmei" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">House / Street No. *</label>
                  <input value={streetAddress} onChange={e => { setStreetAddress(e.target.value); setAddressError(''); }} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="e.g., #123, Street 51" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Delivery Note (optional)</label>
                  <input value={addressNote} onChange={e => setAddressNote(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="Landmark, instructions for driver..." />
                </div>
              </div>
              {addressError && <div className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{addressError}</div>}
            </div>

            {/* --- Section 2: Payment Method --- */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-indigo-600" />
                Payment Method
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <label
                  className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'card'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="sr-only"
                  />
                  {paymentMethod === 'card' && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      paymentMethod === 'card' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-base">Debit / Credit Card</div>
                      <div className="text-sm text-gray-500 mt-0.5">Pay securely with your card</div>
                    </div>
                  </div>
                </label>

                <label
                  className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="sr-only"
                  />
                  {paymentMethod === 'cod' && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      paymentMethod === 'cod' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Truck size={24} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-base">Cash on Delivery</div>
                      <div className="text-sm text-gray-500 mt-0.5">Pay when you receive</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Card Panel — Inline Payment Form */}
              {paymentMethod === 'card' && (
                <div className="bg-white rounded-2xl border border-indigo-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-4 border-b border-indigo-100">
                    <div className="flex items-center gap-3">
                      <CreditCard size={20} className="text-indigo-600" />
                      <span className="font-semibold text-gray-900 text-sm">Enter card details</span>
                    </div>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cardholder Name</label>
                        <input
                          value={cardholderName}
                          onChange={e => setCardholderName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                          placeholder="e.g., CHAN DARA"
                          autoComplete="cc-name"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Card Number</label>
                        <input
                          value={cardNumber}
                          onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition font-mono tracking-wider"
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          inputMode="numeric"
                          autoComplete="cc-number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expiry Date</label>
                        <input
                          value={expiryDate}
                          onChange={e => setExpiryDate(formatExpiry(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                          placeholder="MM/YY"
                          maxLength={5}
                          inputMode="numeric"
                          autoComplete="cc-exp"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">CVV / CVC</label>
                        <input
                          type="password"
                          value={cvv}
                          onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                          placeholder="•••"
                          maxLength={4}
                          inputMode="numeric"
                          autoComplete="cc-csc"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                      <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                      <span>256-bit SSL encrypted • PCI compliant — your card info is safe</span>
                    </div>
                  </div>
                </div>
              )}

              {/* COD Panel */}
              {paymentMethod === 'cod' && (
                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 border border-emerald-100">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <Truck size={24} className="text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Cash on Delivery</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Pay in cash when your order arrives at your doorstep. No extra fees, no hidden charges.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {paymentError && <div className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{paymentError}</div>}
            </div>

            {/* --- Section 3: Order Items Review (compact) --- */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Items in Order ({cart.length})</h2>
              <div className="space-y-3">
                {cart.map((item) => {
                  const dp = calcDiscountedUnitPrice(item.price, item.promotionPercent);
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                      {item.image ? (
                        <img className="w-14 h-14 rounded-lg object-cover" src={item.image} alt={item.name} onError={e => { (e.currentTarget).style.display = 'none'; }} />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-500">No img</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{item.name}</div>
                        <div className="text-xs text-gray-500">Qty: {item.quantity} × {fmtMoney(dp)}</div>
                      </div>
                      <div className="text-sm font-bold text-gray-900">{fmtMoney(dp * item.quantity)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile sticky CTA */}
            <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 p-4 bg-white border-t border-gray-200 shadow-xl">
              <button onClick={handlePlaceOrderClick} disabled={busy}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {busy ? 'Processing...' : `Place Order — ${fmtMoney(total)}`}
              </button>
            </div>
          </div>

          {/* ===== RIGHT: 2 columns — Order Summary Sticky ===== */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 mb-5">Order Summary</h3>

              <div className="space-y-3 mb-5 pb-5 border-b border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">{fmtMoney(originalSubtotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600">Discount</span>
                    <span className="font-semibold text-emerald-600">-{fmtMoney(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery</span>
                  <span className={`font-semibold ${freeShippingEligible ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {shippingFee === 0 ? 'Free' : fmtMoney(shippingFee)}
                  </span>
                </div>
                {!freeShippingEligible && (
                  <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
                    Add {fmtMoney(remainingForFreeDelivery)} more for free delivery.
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{fmtMoney(total)}</span>
              </div>

              <button onClick={handlePlaceOrderClick} disabled={busy}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-black font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
              >
                {busy ? (
                  'Processing...'
                ) : (
                  <>{paymentMethod === 'cod' ? 'Place Order (COD)' : 'Pay Now'} — {fmtMoney(total)}</>
                )}
              </button>

              <Link to="/shop" className="block w-full text-center mt-3 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold hover:border-gray-300 transition text-sm">
                Continue Shopping
              </Link>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                <ShieldCheck size={14} />
                Secure checkout
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONFIRMATION MODAL ===== */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Confirm Your Order</h2>
              <button
                onClick={() => { if (!busy) setShowConfirm(false); }}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-black hover:bg-white/30 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Total */}
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-5 border border-indigo-100 text-center">
                <p className="text-sm text-gray-500 font-medium mb-1">Total Amount Due</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {fmtMoney(total)}
                </p>
              </div>

              {/* Payment Method */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  paymentMethod === 'card' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {paymentMethod === 'card' ? <CreditCard size={20} /> : <Truck size={20} />}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Payment Method</p>
                  <p className="text-sm font-bold text-gray-900">
                    {paymentMethod === 'card' ? 'Debit / Credit Card' : 'Cash on Delivery'}
                  </p>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <MapPin size={20} className="text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Shipping Address</p>
                  <p className="text-sm font-semibold text-gray-900">{contactName}</p>
                  <p className="text-sm text-gray-600">{contactPhone}</p>
                  <p className="text-sm text-gray-600">{shippingAddress}</p>
                </div>
              </div>

              {/* Items count */}
              <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                <span>Items ({cart.length})</span>
                <span className="font-semibold text-gray-900">{fmtMoney(total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex flex-col gap-3">
              <button
                onClick={handleConfirmOrder}
                disabled={busy}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-black font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <><Loader2 size={20} className="animate-spin" /> Processing...</>
                ) : (
                  <><Check size={20} /> {paymentMethod === 'cod' ? 'Confirm Order' : 'Confirm & Pay'} — {fmtMoney(total)}</>
                )}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={busy}
                className="w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
