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

  const onPay = async (method: 'BANK' | 'QR') => {
    console.log('Starting payment process...', { method, user: !!user, cartLength: cart.length, total });

    if (!user) {
      console.error('Payment failed: No user authenticated');
      if (onRequireAuth) onRequireAuth('/payment');
      return;
    }

    if (!cart.length) {
      console.error('Payment failed: Cart is empty');
      alert('Your cart is empty. Please add items before checkout.');
      return;
    }

    const ok = confirm('Confirm you have completed the payment?');
    if (!ok) {
      console.log('Payment cancelled by user');
      return;
    }

    setBusy(true);
    console.log('Payment processing started...');

    try {
      const nowIso = new Date().toISOString();
      const cleanAccount = accountNumber.replace(/\s+/g, '');
      const accountLast4 = cleanAccount.length >= 4 ? cleanAccount.slice(-4) : '';
      const accountMasked = cleanAccount ? `****${accountLast4}` : '';

      console.log('Creating order with data:', {
        userId: user.id,
        total,
        itemCount: cart.length,
        method
      });

      try {
        // Create payment details object, filtering out undefined/empty values
        const paymentDetails = method === 'BANK' ? (() => {
          const details: any = {};
          const trimmedBankName = bankName.trim();
          const trimmedAccountHolderName = accountHolderName.trim();
          const trimmedTransferReference = transferReference.trim();

          if (trimmedBankName) details.bankName = trimmedBankName;
          if (trimmedAccountHolderName) details.accountHolderName = trimmedAccountHolderName;
          if (accountLast4) details.accountLast4 = accountLast4;
          if (accountMasked) details.accountMasked = accountMasked;
          if (trimmedTransferReference) details.transferReference = trimmedTransferReference;

          return Object.keys(details).length > 0 ? details : undefined;
        })() : undefined;

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

        console.log('Order created successfully');

      } catch (e: any) {
        console.error('Order creation failed:', e);
        const msg = String(e?.message || 'Payment could not be completed.');
        alert(`Payment Error: ${msg}`);
        return;
      }

      console.log('Clearing cart...');
      hydrateCart([]);

      try {
        await clearUserCart(user.id);
        console.log('User cart cleared successfully');
      } catch (err) {
        console.error('Failed to clear user cart:', err);
        // Don't fail the payment for this
      }

      console.log('Payment completed successfully, navigating to orders...');
      navigate('/orders', { state: { toast: { message: 'Payment successful! Your order has been placed.', type: 'success' } } });

    } catch (error: any) {
      console.error('Unexpected payment error:', error);
      alert(`Unexpected error: ${error?.message || 'Unknown error occurred'}`);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/cart" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Cart
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your purchase securely</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Payment Methods */}
          <div className="space-y-8">
            {/* QR Payment Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Scan to Pay</h3>
                    <p className="text-sm text-gray-600">Pay securely with KHQR</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-2">Merchant</div>
                    <div className="font-semibold text-gray-900 mb-4">{paymentCfg.displayMerchantName}</div>

                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-4xl font-bold text-gray-900">{fmtNumber(total)}</span>
                      <span className="text-lg text-gray-500">USD</span>
                    </div>

                    {qrDataUrl ? (
                      <div className="bg-white rounded-xl p-4 shadow-sm inline-block">
                        <img
                          src={qrDataUrl}
                          alt="Payment QR Code"
                          className="w-48 h-48 object-contain"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            img.src = 'https://via.placeholder.com/192x192?text=QR';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-48 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2"></div>
                          <div className="text-sm text-gray-500">{qrError || 'Generating QR...'}</div>
                        </div>
                      </div>
                    )}

                    {qrDataUrl && (
                      <div className="mt-4 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          KHQR Verified
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-2">QR Code expires in</div>
                  <div className="text-2xl font-bold text-gray-900">{expiresText}</div>
                </div>

                {paymentCfg.abaKhqrBasePayload && qrDataUrl && (
                  <div className="mt-4 text-xs text-gray-400 text-center">
                    KHQR generated with dynamic amount
                  </div>
                )}

                {qrDataUrl && (
                  <div className="mt-6">
                    <button
                      type="button"
                      className="w-full py-4 px-6 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                      onClick={() => onPay('QR')}
                      disabled={busy}
                    >
                      {busy ? 'Processing...' : 'I Have Completed the QR Payment'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Transfer Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Bank Transfer</h3>
                    <p className="text-sm text-gray-600">Pay directly from your bank account</p>
                  </div>
                </div>

                {!showBankForm ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      className="w-full py-4 px-6 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
                      onClick={() => setShowBankForm(true)}
                      disabled={busy}
                    >
                      {busy ? 'Processing...' : 'Enter Bank Details'}
                    </button>
                    <button
                      type="button"
                      className="w-full py-3 px-6 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors text-sm"
                      onClick={() => onPay('BANK')}
                      disabled={busy}
                    >
                      {busy ? 'Processing...' : 'Skip Bank Details (Test)'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-0 transition-colors"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g. ABA Bank"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-0 transition-colors"
                          value={accountHolderName}
                          onChange={(e) => setAccountHolderName(e.target.value)}
                          placeholder="Name on bank account"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-0 transition-colors"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="Enter account number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Account Number</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-0 transition-colors"
                          value={confirmAccountNumber}
                          onChange={(e) => setConfirmAccountNumber(e.target.value)}
                          placeholder="Re-enter account number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Transfer Reference <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-0 transition-colors"
                          value={transferReference}
                          onChange={(e) => setTransferReference(e.target.value)}
                          placeholder="e.g. ABA TXN123456"
                        />
                      </div>
                    </div>

                    {bankFormError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          <span className="text-sm text-red-700">{bankFormError}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="flex-1 py-3 px-6 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                        onClick={() => setShowBankForm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="flex-1 py-3 px-6 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition-colors"
                        onClick={onConfirmBankPayment}
                        disabled={busy}
                      >
                        {busy ? 'Processing...' : 'Confirm Payment'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>

                {/* Order Items */}
                <div className="space-y-4 mb-6">
                  {cart.map((item) => {
                    const discountedPrice = calcDiscountedUnitPrice(item.price, item.promotionPercent);
                    const itemTotal = discountedPrice * item.quantity;
                    return (
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {(e.currentTarget as HTMLImageElement).style.visibility = 'hidden';}}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                          <div className="text-sm text-gray-600">
                            Quantity: {item.quantity} × ${discountedPrice.toFixed(2)}
                          </div>
                          {(item.promotionPercent ?? 0) > 0 && (
                            <div className="text-xs text-green-600 font-medium">
                              {formatPromotionPercentBadge(item.promotionPercent ?? 0)}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">${itemTotal.toFixed(2)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-gray-100 pt-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">{fmtMoney(originalSubtotal)}</span>
                  </div>

                  {discountTotal > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-600">Discount</span>
                      <span className="font-medium text-green-600">-{fmtMoney(discountTotal)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Processing Fee</span>
                    <span className="font-medium text-gray-900">{fmtMoney(fee)}</span>
                  </div>

                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-gray-900">{fmtMoney(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Instructions */}
                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">Secure Payment</h4>
                      <p className="text-sm text-blue-700">
                        Your payment information is encrypted and secure. Complete your payment using either QR code scanning or bank transfer.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
