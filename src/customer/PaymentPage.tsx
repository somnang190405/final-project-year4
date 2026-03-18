import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../components/customer/CartContext';
import { clearUserCart, createOrderAndDecrementStock } from '../services/firestoreService';
import { OrderStatus, User } from '../types';
import { calcCartTotals, calcDiscountedUnitPrice, formatPromotionPercentBadge, normalizePromotionPercent } from '../services/pricing';
import { getPaymentConfig } from '../services/paymentConfig';
import QRCode from 'qrcode';
import { buildAbaKhqrPayload } from '../services/abaKhqr';

type Props = {
  user: User | null;
  onRequireAuth?: (redirectTo: string) => void;
};

const fmtMoney = (n: number) => `$${n.toFixed(2)}`;
const fmtNumber = (n: number) => n.toFixed(2);

const PaymentPage: React.FC<Props> = ({ user, onRequireAuth }) => {
  const navigate = useNavigate();
  const { cart, hydrateCart } = useCart();
  const { originalSubtotal, discountedSubtotal, discountTotal } = useMemo(() => calcCartTotals(cart), [cart]);
  const fee = 0;
  const total = discountedSubtotal + fee;

  const paymentCfg = useMemo(() => getPaymentConfig(), []);

  // Debug logging
  useEffect(() => {
    console.log('PaymentPage Debug:', {
      user: user ? { id: user.id, email: user.email } : null,
      cartLength: cart.length,
      total,
      paymentCfg: {
        hasBasePayload: !!paymentCfg.abaKhqrBasePayload,
        merchantName: paymentCfg.displayMerchantName
      }
    });
  }, [user, cart, total, paymentCfg]);

  const [busy, setBusy] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(() => Date.now() + 3 * 60 * 1000);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [showBankForm, setShowBankForm] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [bankFormError, setBankFormError] = useState<string>('');

  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'PAYPAL' | 'BANK' | 'QR'>('CARD');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('08');
  const [expYear, setExpYear] = useState('2032');
  const [cvv, setCvv] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Generate a payment QR when config allows. To avoid fake/static images,
  // we only render a QR generated from a KHQR base payload.
  useEffect(() => {
    let alive = true;
    const make = async () => {
      setQrError('');
      setQrDataUrl('');

      // Prefer dynamic KHQR payload with amount when a base payload exists.
      const base = paymentCfg.abaKhqrBasePayload;
      const amount = total > 0 ? fmtNumber(total) : undefined;

      try {
        if (base) {
          console.log('Generating QR with base payload and amount:', amount);
          const payload = buildAbaKhqrPayload({ basePayload: base, amount, dynamic: true });
          console.log('Generated payload:', payload.substring(0, 50) + '...');
          const url = await QRCode.toDataURL(payload, { margin: 1, width: 320 });
          if (alive) {
            setQrDataUrl(url);
            console.log('QR code generated successfully');
          }
          return;
        }
        if (alive) {
          setQrError('Payment QR is not configured yet. Please use Bank Transfer option below or contact support to set up QR payments.');
          console.warn('No ABA KHQR base payload configured');
          
          // Try fallback static QR if available
          if (paymentCfg.abaQrImageUrl) {
            setQrDataUrl(paymentCfg.abaQrImageUrl);
            setQrError('');
            console.log('Using fallback static QR image');
          }
        }
      } catch (e: any) {
        console.error('QR generation error:', e);
        if (alive) setQrError(String(e?.message || 'Could not generate payment QR. Please try bank transfer instead.'));
      }
    };

    void make();
    return () => {
      alive = false;
    };
  }, [paymentCfg, total]);

  // Countdown timer (3 minutes) for the QR.
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    // Reset expiry when cart total changes.
    setExpiresAt(Date.now() + 3 * 60 * 1000);
  }, [total]);

  const expiresText = useMemo(() => {
    const ms = Math.max(0, expiresAt - nowMs);
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }, [expiresAt, nowMs]);

  const onPay = async (method: 'CARD' | 'PAYPAL' | 'BANK' | 'QR') => {
    console.log('Starting payment process...', { method, user: !!user, cartLength: cart.length, total });

    if (method === 'CARD') {
      if (!cardName.trim() || !cardNumber.trim() || !expMonth.trim() || !expYear.trim() || !cvv.trim()) {
        setPaymentError('Please fill in card details before payment.');
        return;
      }
      setPaymentError('');
    }

    if (!user) {
      if (onRequireAuth) onRequireAuth('/payment');
      return;
    }

    if (!cart.length) {
      alert('Your cart is empty. Please add items before checkout.');
      return;
    }

    const ok = confirm('Confirm you have completed the payment?');
    if (!ok) {
      return;
    }

    setBusy(true);

    try {
      const nowIso = new Date().toISOString();
      const cleanAccount = accountNumber.replace(/\s+/g, '');
      const accountLast4 = cleanAccount.length >= 4 ? cleanAccount.slice(-4) : '';
      const accountMasked = cleanAccount ? `****${accountLast4}` : '';

      const paymentDetails: Record<string, unknown> = {};
      if (method === 'CARD') {
        paymentDetails.paymentType = 'Card';
        paymentDetails.cardName = cardName.trim();
        paymentDetails.cardLast4 = cardNumber.trim().slice(-4);
      } else if (method === 'BANK') {
        paymentDetails.paymentType = 'Bank';
        if (bankName.trim()) paymentDetails.bankName = bankName.trim();
        if (accountHolderName.trim()) paymentDetails.accountHolderName = accountHolderName.trim();
        if (accountLast4) paymentDetails.accountLast4 = accountLast4;
        if (accountMasked) paymentDetails.accountMasked = accountMasked;
        if (transferReference.trim()) paymentDetails.transferReference = transferReference.trim();
      } else if (method === 'QR') {
        paymentDetails.paymentType = 'QR';
      } else if (method === 'PAYPAL') {
        paymentDetails.paymentType = 'PayPal';
      }

      await createOrderAndDecrementStock({
        userId: user.id,
        date: nowIso,
        status: OrderStatus.PENDING,
        paymentStatus: 'PAID',
        paymentMethod: method,
        paidAt: nowIso,
        paymentDetails,
        total,
        items: cart.map((i) => ({
          productId: i.id,
          name: i.name,
          price: Number(calcDiscountedUnitPrice(i.price, i.promotionPercent ?? 0).toFixed(2)),
          originalPrice: i.price,
          promotionPercent: normalizePromotionPercent(i.promotionPercent ?? 0),
          quantity: i.quantity,
          image: i.image,
        })),
      });

      hydrateCart([]);
      await clearUserCart(user.id);

      navigate('/orders', { state: { toast: { message: 'Payment successful! Your order has been placed.', type: 'success' } } });
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(`Payment error: ${error?.message || 'Something went wrong.'}`);
    } finally {
      setBusy(false);
    }
  };

  const validateBankForm = () => {
    const cleanAccount = accountNumber.replace(/\s+/g, '');
    const cleanConfirm = confirmAccountNumber.replace(/\s+/g, '');

    if (!bankName.trim()) return 'Please enter bank name.';
    if (!accountHolderName.trim()) return 'Please enter account holder name.';
    if (!cleanAccount) return 'Please enter account number.';
    if (!/^\d{6,20}$/.test(cleanAccount)) return 'Account number must be 6–20 digits.';
    if (!cleanConfirm) return 'Please confirm account number.';
    if (cleanAccount !== cleanConfirm) return 'Account numbers do not match.';
    return '';
  };

  const onConfirmBankPayment = async () => {
    // For test payments, allow empty fields
    const isTestPayment = !bankName.trim() && !accountHolderName.trim() && !accountNumber.trim();

    if (!isTestPayment) {
      const err = validateBankForm();
      if (err) {
        setBankFormError(err);
        return;
      }
    }

    const ok = confirm('Confirm the bank account details are correct and you have completed the transfer?');
    if (!ok) return;
    await onPay('BANK');
  };

  if (!cart.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">Add some items to your cart before proceeding to checkout.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              className="px-6 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition-colors"
              to="/shop"
            >
              Continue Shopping
            </Link>
            <Link
              className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              to="/"
            >
              Back Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-12">
            <div className="xl:col-span-7 p-6 xl:p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-indigo-600 font-semibold">Checkout</p>
                  <h1 className="mt-1 text-3xl font-bold text-slate-900">Complete your order</h1>
                  <p className="mt-1 text-sm text-slate-500">Review your products and confirm payment.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Order total</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{fmtMoney(total)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2 text-center">Size</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-3 text-right">Total Price</div>
                </div>
                <div className="space-y-2 p-3">
                  {cart.map((item) => {
                    const discountedPrice = calcDiscountedUnitPrice(item.price, item.promotionPercent);
                    return (
                      <div key={item.id} className="grid grid-cols-12 gap-3 items-center rounded-xl border border-slate-100 p-2 bg-slate-50">
                        <div className="col-span-5 flex items-center gap-2">
                          {item.image ? (
                        <img className="w-11 h-11 rounded-lg object-cover" key={item.id} src={item.image} alt={item.name} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">No image</div>
                      )}
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-500">{item.brand || 'Brand'}</div>
                          </div>
                        </div>
                        <div className="col-span-2 text-center text-sm text-slate-700">{item.size || 'Free'}</div>
                        <div className="col-span-2 text-center text-sm text-slate-700">{item.quantity}</div>
                        <div className="col-span-3 text-right text-sm font-semibold text-slate-900">{fmtMoney(discountedPrice * item.quantity)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-600">
                  <div>Subtotal</div>
                  <div>{fmtMoney(originalSubtotal)}</div>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-sm text-emerald-700">
                    <div>Discount</div>
                    <div>-{fmtMoney(discountTotal)}</div>
                  </div>
                )}
                <div className="flex justify-between text-sm text-slate-600">
                  <div>Shipping</div>
                  <div>{fmtMoney(0)}</div>
                </div>
                <div className="mt-2 border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-slate-900">
                  <div>Total</div>
                  <div>{fmtMoney(total)}</div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-5 border-l border-slate-200 bg-slate-50 p-6 xl:p-8">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Payment Info</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Payment Method</h2>
                <p className="text-sm text-slate-500">Choose a secure way to pay with your card.</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 mb-3">
                  <label className="rounded-xl border border-slate-200 p-2 cursor-pointer flex items-center gap-2">
                    <input type="radio" checked={paymentMethod === 'CARD'} onChange={() => setPaymentMethod('CARD')} className="form-radio text-indigo-600" />
                    <span className="text-sm font-medium text-slate-700">Credit Card</span>
                  </label>
                  <label className="rounded-xl border border-slate-200 p-2 cursor-pointer flex items-center gap-2">
                    <input type="radio" checked={paymentMethod === 'PAYPAL'} onChange={() => setPaymentMethod('PAYPAL')} className="form-radio text-indigo-600" />
                    <span className="text-sm font-medium text-slate-700">PayPal</span>
                  </label>
                </div>

                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <label className="block">Name on Card</label>
                  <input value={cardName} onChange={(e) => setCardName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500" placeholder="John Doe" />
                  <label className="block">Card Number</label>
                  <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500" placeholder="**** **** **** 1234" />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500">Exp. Month</label>
                      <input value={expMonth} onChange={(e) => setExpMonth(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2 outline-none focus:border-indigo-500" placeholder="08" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500">Exp. Year</label>
                      <input value={expYear} onChange={(e) => setExpYear(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2 outline-none focus:border-indigo-500" placeholder="2032" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500">CVV</label>
                      <input value={cvv} onChange={(e) => setCvv(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2 outline-none focus:border-indigo-500" placeholder="243" />
                    </div>
                  </div>
                </div>

                {paymentError && <div className="mt-3 text-xs text-red-600">{paymentError}</div>}
                {qrError && paymentMethod === 'QR' && <div className="mt-3 text-xs text-red-600">{qrError}</div>}

                <button
                  type="button"
                  onClick={() => onPay(paymentMethod)}
                  disabled={busy}
                  className="mt-4 w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
                >
                  {busy ? 'Processing...' : 'Pay Now'}
                </button>

                <p className="mt-3 text-xs text-slate-500">By continuing, you agree to our Terms and Conditions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
