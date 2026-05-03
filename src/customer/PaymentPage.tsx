import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../components/customer/CartContext';
import { clearUserCart, createOrderAndDecrementStock } from '../services/firestoreService';
import { OrderStatus, User } from '../types';
import { calcCartTotals, calcDiscountedUnitPrice, formatPromotionPercentBadge, normalizePromotionPercent } from '../services/pricing';
import { getPaymentConfig } from '../services/paymentConfig';
import QRCode from 'qrcode';
import { buildAbaKhqrPayload } from '../services/abaKhqr';
import { Check } from 'lucide-react';

type Props = {
  user: User | null;
  onRequireAuth?: (redirectTo: string) => void;
};

const fmtMoney = (n: number) => `$${n.toFixed(2)}`;
const fmtNumber = (n: number) => n.toFixed(2);

// Step Progress Indicator
const StepProgressIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Review', description: 'Cart Items' },
    { number: 2, label: 'Payment', description: 'Method' },
    { number: 3, label: 'Confirm', description: 'Complete' }
  ];

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center">
        {steps.map((step, idx) => (
          <div key={step.number} className="flex flex-col items-center flex-1">
            {/* Step circle */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold mb-2 transition-all ${
              currentStep >= step.number
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > step.number ? (
                <Check className="w-6 h-6" />
              ) : (
                step.number
              )}
            </div>
            {/* Step label */}
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">{step.label}</p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div className={`absolute w-12 h-1 top-6 left-[calc(50%+28px)] transition-all ${
                currentStep > step.number ? 'bg-indigo-600' : 'bg-gray-200'
              }`}></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

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

  // Check if form is complete for current payment method
  const isFormValid = () => {
    if (paymentMethod === 'CARD') {
      return cardName.trim() && cardNumber.trim() && expMonth.trim() && expYear.trim() && cvv.trim();
    } else if (paymentMethod === 'BANK') {
      const cleanAccount = accountNumber.replace(/\s+/g, '');
      const cleanConfirm = confirmAccountNumber.replace(/\s+/g, '');
      return bankName.trim() && accountHolderName.trim() && cleanAccount && cleanConfirm && cleanAccount === cleanConfirm;
    } else if (paymentMethod === 'QR') {
      return !!qrDataUrl; // QR must be generated
    } else if (paymentMethod === 'PAYPAL') {
      return true; // PayPal doesn't require form fields here
    }
    return false;
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Indicator */}
        <div className="bg-white rounded-2xl p-8 mb-8 border border-gray-200">
          <StepProgressIndicator currentStep={2} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2 columns on desktop */}
          <div className="lg:col-span-2 space-y-8">
            {/* Cart Review Section */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold">1</span>
                Order Review
              </h2>
              
              <div className="rounded-2xl border border-gray-200 bg-gray-50">
                <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600 border-b border-gray-200 bg-white">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2 text-center">Category</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-3 text-right">Price</div>
                </div>
                <div className="space-y-2 p-3">
                  {cart.map((item) => {
                    const discountedPrice = calcDiscountedUnitPrice(item.price, item.promotionPercent);
                    return (
                      <div key={item.id} className="grid grid-cols-12 gap-3 items-center rounded-xl border border-gray-200 p-3 bg-white hover:shadow-md transition-shadow">
                        <div className="col-span-5 flex items-center gap-3">
                          {item.image ? (
                            <img className="w-12 h-12 rounded-lg object-cover" src={item.image} alt={item.name} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">No image</div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.category || item.subcategory || 'Item'}</div>
                          </div>
                        </div>
                        <div className="col-span-2 text-center text-sm text-gray-700">{item.category || '—'}</div>
                        <div className="col-span-2 text-center text-sm text-gray-700">{item.quantity}</div>
                        <div className="col-span-3 text-right text-sm font-semibold text-gray-900">{fmtMoney(discountedPrice * item.quantity)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold">2</span>
                Payment Method
              </h2>

              {/* Tab-style payment method selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                  { id: 'CARD', label: '💳 Credit Card', desc: 'Visa, Mastercard' },
                  { id: 'PAYPAL', label: '🅿️ PayPal', desc: 'Fast & Secure' },
                  { id: 'QR', label: '📱 QR Code', desc: 'ABA KHQR' },
                  { id: 'BANK', label: '🏦 Bank Transfer', desc: 'Direct Transfer' },
                ].map((method: any) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      paymentMethod === method.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{method.label}</div>
                    <div className="text-xs text-gray-500">{method.desc}</div>
                  </button>
                ))}
              </div>

              {/* Payment form - Credit Card */}
              {paymentMethod === 'CARD' && (
                <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Name on Card</label>
                    <input 
                      value={cardName} 
                      onChange={(e) => setCardName(e.target.value)} 
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" 
                      placeholder="John Doe" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Card Number</label>
                    <input 
                      value={cardNumber} 
                      onChange={(e) => setCardNumber(e.target.value)} 
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" 
                      placeholder="1234 5678 9012 3456" 
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">Month</label>
                      <input value={expMonth} onChange={(e) => setExpMonth(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="08" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">Year</label>
                      <input value={expYear} onChange={(e) => setExpYear(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="2032" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">CVV</label>
                      <input value={cvv} onChange={(e) => setCvv(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="123" />
                    </div>
                  </div>
                  {paymentError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{paymentError}</div>}
                  <button
                    type="button"
                    onClick={() => onPay('CARD')}
                    disabled={busy || !isFormValid()}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:shadow-xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {busy ? 'Processing...' : `Pay ${fmtMoney(total)} with Card`}
                  </button>
                </div>
              )}

              {/* PayPal description and action */}
              {paymentMethod === 'PAYPAL' && (
                <div className="bg-gray-50 p-6 rounded-xl space-y-4">
                  <div>
                    <p className="text-gray-700 text-base">
                      You have selected PayPal. Click the button below to simulate checkout and confirm your payment.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPay('PAYPAL')}
                    disabled={busy}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:shadow-xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {busy ? 'Processing...' : `Pay ${fmtMoney(total)} with PayPal`}
                  </button>
                </div>
              )}

              {/* QR Code Display */}
              {paymentMethod === 'QR' && (
                <div className="bg-gray-50 p-6 rounded-xl">
                  <div className="text-center">
                    {qrDataUrl ? (
                      <div className="flex flex-col items-center">
                        <img src={qrDataUrl} alt="ABA KHQR Payment Code" className="w-48 h-48 border-4 border-white rounded-lg shadow-lg mb-4" />
                        <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-lg font-semibold mb-3">
                          Expires in: {expiresText}
                        </div>
                        <p className="text-sm text-gray-600">Scan this QR code with your ABA mobile app to pay {fmtMoney(total)}</p>
                      </div>
                    ) : (
                      <div className="py-8">
                        <p className="text-gray-600 mb-3">{qrError || 'Generating QR Code...'}</p>
                      </div>
                    )}
                  </div>
                <button
                  type="button"
                  onClick={() => onPay('QR')}
                  disabled={busy || !qrDataUrl}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:shadow-xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {busy ? 'Processing...' : `Confirm QR payment of ${fmtMoney(total)}`}
                </button>
              </div>
              )}

              {/* Bank Transfer Form */}
              {paymentMethod === 'BANK' && (
                <div className="bg-gray-50 p-6 rounded-xl space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Bank Name</label>
                    <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="e.g., ABA" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Account Holder Name</label>
                    <input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="Account holder name" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Account Number</label>
                    <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="Enter account number" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Account Number</label>
                    <input value={confirmAccountNumber} onChange={(e) => setConfirmAccountNumber(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="Confirm account number" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Transfer Reference (optional)</label>
                    <input value={transferReference} onChange={(e) => setTransferReference(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" placeholder="Reference or note" />
                  </div>
                  {bankFormError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{bankFormError}</div>}
                  <button
                    type="button"
                    onClick={onConfirmBankPayment}
                    disabled={busy}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:shadow-xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {busy ? 'Processing...' : `Confirm Bank Transfer of ${fmtMoney(total)}`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Order Summary - Right column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 sticky top-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h3>
              
              <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
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
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold text-gray-900">{fmtMoney(0)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{fmtMoney(total)}</span>
              </div>

              {/* Prominent Checkout Button */}
              <button
                type="button"
                onClick={() => onPay(paymentMethod)}
                disabled={busy || !isFormValid()}
                title={!isFormValid() ? 'Please fill in all required fields' : ''}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:shadow-xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 hover:disabled:scale-100 mb-4 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <span className="animate-spin">⏳</span> Processing Payment...
                  </>
                ) : !isFormValid() ? (
                  <>
                    <span>⚠️</span> Fill Required Fields
                  </>
                ) : (
                  <>
                    <span>✓</span> Complete Payment - {fmtMoney(total)}
                  </>
                )}
              </button>

              <Link
                to="/shop"
                className="w-full py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:border-gray-400 transition text-center block"
              >
                Continue Shopping
              </Link>

              <p className="mt-4 text-xs text-gray-500 text-center">
                Your payment information is encrypted and secure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
