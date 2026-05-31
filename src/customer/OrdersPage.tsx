import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listenOrdersByUser, requestOrderReturn } from '../services/firestoreService';
import { Order, OrderStatus, User } from '../types';
import { useCart } from '../components/customer/CartContext';
import { ShoppingBag, ChevronRight, Check, ShieldCheck, RotateCcw, Package, Truck, ClipboardList, RefreshCw, ArrowRight, CreditCard, Gift } from 'lucide-react';

type Props = {
  user: User | null;
  onRequireAuth?: (redirectTo: string) => void;
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

const formatDate = (raw: any) => {
  if (!raw) return '';
  const s = String(raw);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }
  return s;
};

const statusBadge = (s: string) => {
  switch (s) {
    case 'Pending': return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Processing' };
    case 'Shipped': return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', label: 'Shipped' };
    case 'Delivered': return { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', label: 'Delivered' };
    case 'Cancelled': return { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', label: 'Cancelled' };
    default: return { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200', label: s };
  }
};

const returnStatusBadge = (s: string) => {
  switch (s) {
    case 'Requested': return { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' };
    case 'Approved': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
    case 'Declined': return { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' };
    case 'Completed': return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
  }
};

const returnTimelineSteps = [
  { key: 'Requested', label: 'Return Requested' },
  { key: 'DroppedOff', label: 'Package Dropped Off' },
  { key: 'Inspected', label: 'Inspected & Approved' },
  { key: 'Completed', label: 'Refund Processed' },
];

const getReturnTimelineIdx = (status?: string): number => {
  if (!status) return -1;
  if (status === 'Completed') return 3;
  if (status === 'Approved') return 2;
  if (status === 'Requested') return 0;
  return -1;
};

const returnReasons = [
  { value: 'wrong_size', label: 'Wrong Size' },
  { value: 'defective', label: 'Defective / Damaged' },
  { value: 'not_as_described', label: 'Not as Described' },
  { value: 'changed_mind', label: 'Changed Mind' },
  { value: 'other', label: 'Other' },
];

const resolutionOptions = [
  { value: 'refund', label: 'Refund to Original Payment', icon: CreditCard, desc: 'Money will be returned within 5-10 business days' },
  { value: 'store_credit', label: 'Store Credit / Gift Card', icon: Gift, desc: 'Credit applied instantly for your next purchase' },
];

const OrdersPage: React.FC<Props> = ({ user, onRequireAuth }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [tab, setTab] = useState<'history' | 'return'>('history');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Return wizard state
  const [wizardStep, setWizardStep] = useState(0);
  const [activeReturnOrder, setActiveReturnOrder] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnDetail, setReturnDetail] = useState('');
  const [returnResolution, setReturnResolution] = useState('');
  const [returnError, setReturnError] = useState('');
  const [returnBusy, setReturnBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsub = listenOrdersByUser(
      user.id,
      (data) => {
        setOrders(data);
        setLoading(false);
      },
      (error) => {
        console.error('Order listener error:', error);
        setOrders([]);
        setLoading(false);
      }
    );

    return () => {
      window.clearTimeout(timer);
      try { unsub && unsub(); } catch {}
    };
  }, [user?.id]);

  const rows = useMemo(() => {
    if (tab === 'return') {
      return orders.filter((order) => {
        const returned = Boolean(order.returnRequest?.status);
        const delivered = String(order.status) === OrderStatus.DELIVERED;
        return delivered || returned;
      });
    }
    return orders;
  }, [orders, tab]);

  const pendingReturnOrders = useMemo(() => orders.filter((order) => order.returnRequest?.status === 'Requested'), [orders]);
  const eligibleReturnOrders = useMemo(
    () => orders.filter((order) => String(order.status) === OrderStatus.DELIVERED && !order.returnRequest),
    [orders]
  );

  const resetWizard = () => {
    setWizardStep(0);
    setActiveReturnOrder(null);
    setSelectedItems([]);
    setReturnReason('');
    setReturnDetail('');
    setReturnResolution('');
    setReturnError('');
  };

  const handleStartReturn = (orderId: string) => {
    setActiveReturnOrder(orderId);
    setWizardStep(1);
    setSelectedItems([]);
    setReturnReason('');
    setReturnDetail('');
    setReturnResolution('');
    setReturnError('');
  };

  const handleSubmitReturn = async () => {
    if (selectedItems.length === 0) {
      setReturnError('Please select at least one item to return.');
      return;
    }
    if (!returnReason) {
      setReturnError('Please select a reason for the return.');
      return;
    }
    if (!returnResolution) {
      setReturnError('Please choose a resolution.');
      return;
    }

    const comment = `Items: ${selectedItems.join(', ')} | Reason: ${returnReason} | Detail: ${returnDetail} | Resolution: ${returnResolution}`;

    setReturnBusy(true);
    setReturnError('');
    try {
      await requestOrderReturn(activeReturnOrder!, comment);
      resetWizard();
    } catch (err: any) {
      console.error('Return request failed', err);
      setReturnError('Could not submit the return request. Please try again.');
    } finally {
      setReturnBusy(false);
    }
  };

  const activeOrder = useMemo(
    () => orders.find((o) => o.id === activeReturnOrder),
    [orders, activeReturnOrder]
  );

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-center text-3xl font-bold mb-4">My Orders</h1>
        <p className="text-center text-gray-500 mb-8">Sign in to view your order history and manage returns.</p>
        <div className="flex justify-center gap-4">
          <button
            className="px-6 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition"
            onClick={() => {
              if (onRequireAuth) onRequireAuth('/orders');
              else navigate('/');
            }}
          >
            Sign In
          </button>
          <Link className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition" to="/">Back Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black">My Orders</h1>
          <p className="text-gray-500 mt-2">Track, manage, and return your purchases</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white rounded-2xl border border-gray-200 p-1.5 shadow-sm">
            <button
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === 'history' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setTab('history')}
            >
              <ClipboardList size={16} className="inline mr-2 -mt-0.5" />
              Order History
            </button>
            <button
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === 'return' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-black shadow-lg shadow-indigo-200' : 'text-black hover:text-gray-900'
              }`}
              onClick={() => setTab('return')}
            >
              <RotateCcw size={16} className="inline mr-2 -mt-0.5" />
              Return Product
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : tab === 'return' ? (
          /* ==================== RETURN CENTER ==================== */
          <div className="space-y-6">

            {/* Return Policy Callout Box */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Return Policy</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    We accept returns within <strong>14 days</strong> of delivery. Items must be unworn, unwashed, and in original condition with tags attached. 
                    Refunds are processed within 5-10 business days after inspection. For store credit, credit is applied instantly upon approval.
                  </p>
                </div>
              </div>
            </div>

            {/* Active wizard */}
            {activeReturnOrder && activeOrder && wizardStep > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                {/* Wizard Step Indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {[1, 2, 3].map((step) => (
                    <React.Fragment key={step}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        wizardStep >= step ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {wizardStep > step ? <Check size={14} /> : step}
                      </div>
                      {step < 3 && (
                        <div className={`h-0.5 w-12 transition-colors ${wizardStep > step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex justify-between text-xs font-medium text-gray-500 mb-6 px-4">
                  <span className={wizardStep >= 1 ? 'text-indigo-600' : ''}>Select Items</span>
                  <span className={wizardStep >= 2 ? 'text-indigo-600' : ''}>Choose Reason</span>
                  <span className={wizardStep >= 3 ? 'text-indigo-600' : ''}>Resolution</span>
                </div>

                {/* Step 1: Select Items */}
                {wizardStep === 1 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4">Select Item(s) to Return</h3>
                    <div className="space-y-3">
                      {(activeOrder.items || []).map((item) => (
                        <label
                          key={item.productId}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedItems.includes(item.productId)
                              ? 'border-indigo-600 bg-indigo-50/50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.productId)}
                            onChange={() => {
                              setSelectedItems((prev) =>
                                prev.includes(item.productId)
                                  ? prev.filter((id) => id !== item.productId)
                                  : [...prev, item.productId]
                              );
                            }}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <span className="text-gray-400 text-xs flex items-center justify-center w-full h-full">No img</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                          </div>
                          <div className="text-sm font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</div>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => resetWizard()}
                        className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (selectedItems.length === 0) {
                            setReturnError('Please select at least one item.');
                            return;
                          }
                          setReturnError('');
                          setWizardStep(2);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-black font-semibold text-sm hover:shadow-lg hover:shadow-indigo-200 transition flex items-center gap-2"
                      >
                        Continue <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Choose Reason */}
                {wizardStep === 2 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4">Why are you returning this item?</h3>
                    <div className="space-y-2 mb-4">
                      {returnReasons.map((reason) => (
                        <label
                          key={reason.value}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            returnReason === reason.value
                              ? 'border-indigo-600 bg-indigo-50/50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="returnReason"
                            value={reason.value}
                            checked={returnReason === reason.value}
                            onChange={() => setReturnReason(reason.value)}
                            className="w-5 h-5 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium text-gray-900">{reason.label}</span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Details (optional)</label>
                      <textarea
                        value={returnDetail}
                        onChange={(e) => setReturnDetail(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                        placeholder="Tell us more about the issue..."
                      />
                    </div>
                    {returnError && <p className="text-sm text-red-600 mt-3">{returnError}</p>}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => { setWizardStep(1); setReturnError(''); }}
                        className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          if (!returnReason) {
                            setReturnError('Please select a reason.');
                            return;
                          }
                          setReturnError('');
                          setWizardStep(3);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-black font-semibold text-sm hover:shadow-lg hover:shadow-indigo-200 transition flex items-center gap-2"
                      >
                        Continue <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Choose Resolution */}
                {wizardStep === 3 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4">How would you like to resolve this?</h3>
                    <div className="space-y-3 mb-4">
                      {resolutionOptions.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <label
                            key={opt.value}
                            className={`flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                              returnResolution === opt.value
                                ? 'border-indigo-600 bg-indigo-50/50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="resolution"
                              value={opt.value}
                              checked={returnResolution === opt.value}
                              onChange={() => setReturnResolution(opt.value)}
                              className="mt-1 w-5 h-5 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                              <Icon size={20} className="text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{opt.label}</p>
                              <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {returnError && <p className="text-sm text-red-600 mt-3">{returnError}</p>}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => { setWizardStep(2); setReturnError(''); }}
                        className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmitReturn}
                        disabled={returnBusy}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-black font-semibold text-sm hover:shadow-lg hover:shadow-indigo-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {returnBusy ? 'Submitting...' : 'Submit Return Request'} {!returnBusy && <Check size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pending return requests */}
            {pendingReturnOrders.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Pending Return Requests</h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{pendingReturnOrders.length} open</span>
                </div>
                {pendingReturnOrders.map((order) => {
                  const orderNo = formatOrderId(order.id);
                  const badge = returnStatusBadge(order.returnRequest?.status || 'Requested');
                  const currentStepIdx = getReturnTimelineIdx(order.returnRequest?.status);

                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                        <div>
                          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Return for Order</div>
                          <div className="text-base font-bold text-gray-900">{orderNo}</div>
                        </div>
                        <span className={`${badge.bg} ${badge.text} px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {order.returnRequest?.status}
                        </span>
                      </div>

                      {/* Return Status Timeline */}
                      <div className="mb-5">
                        <div className="flex items-center">
                          {returnTimelineSteps.map((step, idx) => (
                            <React.Fragment key={step.key}>
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                  idx <= currentStepIdx ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-400'
                                }`}>
                                  {idx < currentStepIdx ? <Check size={14} /> : idx + 1}
                                </div>
                                <span className={`text-[10px] mt-1.5 font-medium text-center whitespace-nowrap ${
                                  idx <= currentStepIdx ? 'text-indigo-600' : 'text-gray-400'
                                }`}>
                                  {step.label}
                                </span>
                              </div>
                              {idx < returnTimelineSteps.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 mt-[-1.5rem] ${idx < currentStepIdx ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {order.returnRequest?.customerComment && (
                        <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your Note</p>
                          <p className="text-sm text-gray-700">{order.returnRequest.customerComment}</p>
                        </div>
                      )}
                      {order.returnRequest?.adminComment && (
                        <div className="rounded-xl bg-blue-50 p-4 border border-blue-200 mt-3">
                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Store Response</p>
                          <p className="text-sm text-blue-800">{order.returnRequest.adminComment}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Eligible orders for return */}
            {eligibleReturnOrders.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Delivered Orders — Eligible for Return</h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{eligibleReturnOrders.length} available</span>
                </div>
                {eligibleReturnOrders.map((order) => {
                  const orderNo = formatOrderId(order.id);
                  const date = formatDate(order.date || (order as any).createdAt || '');
                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Delivered Order</div>
                          <div className="text-base font-bold text-gray-900">{orderNo}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">{date}</span>
                          <button
                            onClick={() => handleStartReturn(order.id)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-black text-sm font-semibold hover:shadow-lg hover:shadow-indigo-200 transition flex items-center gap-2"
                          >
                            <RotateCcw size={14} />
                            Request Return
                          </button>
                        </div>
                      </div>
                      {/* Item thumbnails row */}
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {(order.items || []).map((item) => (
                          <div key={item.productId} className="flex items-center gap-2 shrink-0 bg-gray-50 rounded-xl p-2 border border-gray-200">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <span className="text-gray-400 text-[10px] flex items-center justify-center w-full h-full">Img</span>
                              )}
                            </div>
                            <div className="text-xs">
                              <p className="font-semibold text-gray-900 truncate max-w-[100px]">{item.name}</p>
                              <p className="text-gray-500">×{item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No returns available */}
            {pendingReturnOrders.length === 0 && eligibleReturnOrders.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                <div className="w-20 h-20 mx-auto mb-6 bg-indigo-50 rounded-full flex items-center justify-center">
                  <RotateCcw size={36} className="text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">No Returns Yet</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  You can request a return for any delivered order within 14 days. Once an order is delivered, it will appear here.
                </p>
                <Link to="/shop" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-200 transition">
                  <ShoppingBag size={18} />
                  Continue Shopping
                </Link>
              </div>
            )}
          </div>
        ) : rows.length === 0 ? (
          /* ==================== EMPTY STATE ==================== */
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full flex items-center justify-center">
              <Package size={40} className="text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No orders yet</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
              Your next favorite outfit is waiting! Start exploring our collection and discover something amazing.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-base hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
            >
              <ShoppingBag size={20} />
              Start Shopping
            </button>
          </div>
        ) : (
          /* ==================== ORDER HISTORY CARDS ==================== */
          <div className="space-y-6">
            {rows.map((order) => {
              const paid = String((order as any).paymentStatus || '').toUpperCase() === 'PAID' || !!(order as any).paidAt;
              const status = String(order.status || 'Pending');
              const date = formatDate((order as any).date || (order as any).createdAt || '');
              const total = Number(order.total || 0);
              const orderNo = formatOrderId(order.id);
              const badge = statusBadge(status);

              const progressSteps = [
                { label: 'Ordered', active: true },
                { label: 'Shipped', active: status === 'Shipped' || status === 'Delivered' },
                { label: 'Delivered', active: status === 'Delivered' },
              ];

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className="border-b border-gray-100">
                    <div className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Order Number</div>
                          <div className="text-lg font-bold text-gray-900 mt-0.5">{orderNo}</div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`${badge.bg} ${badge.text} border ${badge.border} px-3 py-1 rounded-full text-xs font-semibold`}>
                            {badge.label}
                          </span>
                          {paid && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
                              Paid
                            </span>
                          )}
                          <span className="text-gray-400 text-sm">{date}</span>
                        </div>
                      </div>

                      {/* Progress bar for in-transit orders */}
                      {status !== 'Delivered' && status !== 'Cancelled' && (
                        <div className="mt-5">
                          <div className="flex justify-between mb-2">
                            {progressSteps.map((step, idx) => (
                              <div key={step.label} className="text-center flex-1">
                                <div className={`text-xs font-medium ${step.active ? 'text-indigo-600' : 'text-gray-400'}`}>{step.label}</div>
                              </div>
                            ))}
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-1.5 rounded-full transition-all ${
                              status === 'Pending' ? 'bg-amber-400 w-1/3' :
                              status === 'Shipped' ? 'bg-blue-500 w-2/3' :
                              'bg-emerald-500 w-full'
                            }`} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item Summary — Horizontal Thumbnails */}
                  <div className="p-5">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Items ({order.items?.length || 0})
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1.5 shrink-0">
                          <div className="relative w-16 h-16 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <span className="text-gray-400 text-[10px] flex items-center justify-center w-full h-full">Img</span>
                            )}
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                              {item.quantity}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-600 font-medium text-center truncate max-w-[72px] leading-tight">
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Return status section */}
                  {order.returnRequest?.status && (
                    <div className={`mx-5 mb-3 rounded-xl p-4 border ${
                      order.returnRequest.status === 'Requested' ? 'bg-yellow-50 border-yellow-200' :
                      order.returnRequest.status === 'Approved' ? 'bg-blue-50 border-blue-200' :
                      order.returnRequest.status === 'Declined' ? 'bg-rose-50 border-rose-200' :
                      'bg-emerald-50 border-emerald-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">Return {order.returnRequest.status}</span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          order.returnRequest.status === 'Requested' ? 'bg-yellow-200 text-yellow-800' :
                          order.returnRequest.status === 'Approved' ? 'bg-blue-200 text-blue-800' :
                          order.returnRequest.status === 'Declined' ? 'bg-rose-200 text-rose-800' :
                          'bg-emerald-200 text-emerald-800'
                        }`}>
                          {order.returnRequest.status}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Card Footer: Total + Quick Actions */}
                  <div className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-gray-500 font-medium">Order Total</span>
                        <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/order/${order.id}`)}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-indigo-200 transition flex items-center gap-1.5"
                        >
                          <Truck size={15} />
                          {status === 'Shipped' ? 'Track Package' : 'View Details'}
                        </button>
                        <button
                          onClick={() => {
                            (order.items || []).forEach((item) => {
                              addToCart({
                                id: item.productId,
                                name: item.name,
                                price: item.price,
                                image: item.image,
                                quantity: 1,
                                category: '',
                                subcategory: '',
                                description: '',
                                stock: 999,
                                rating: 0,
                              } as any);
                            });
                            navigate('/cart');
                          }}
                          className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-white hover:border-gray-400 transition flex items-center gap-1.5"
                        >
                          <RefreshCw size={15} />
                          Buy It Again
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
