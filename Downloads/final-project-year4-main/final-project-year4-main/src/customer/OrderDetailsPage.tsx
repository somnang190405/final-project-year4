import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listenOrders } from '../services/firestoreService';
import { Order, OrderStatus, User } from '../types';

type Props = {
  user: User | null;
  onRequireAuth?: (redirectTo: string) => void;
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

const createdAtToText = (createdAt: unknown) => {
  const ts: any = createdAt as any;
  const ms = typeof ts?.toMillis === 'function' ? ts.toMillis() : null;
  if (typeof ms === 'number' && Number.isFinite(ms)) return formatDate(new Date(ms).toISOString());
  return '';
};

const statusRank = (s: OrderStatus | string | undefined | null) => {
  const status = String(s || '').toLowerCase();
  if (status === String(OrderStatus.CANCELLED).toLowerCase()) return -1;
  if (status === String(OrderStatus.DELIVERED).toLowerCase()) return 3;
  if (status === String(OrderStatus.SHIPPED).toLowerCase()) return 2;
  if (status === String(OrderStatus.PENDING).toLowerCase()) return 1;
  return 0;
};

const OrderDetailsPage: React.FC<Props> = ({ user, onRequireAuth }) => {
  const navigate = useNavigate();
  const params = useParams();
  const orderId = String(params.id || '').trim();

  const [order, setOrder] = React.useState<Order | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      setError('Order not found.');
      return;
    }
    if (!user?.id) {
      setOrder(null);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    const timeout = window.setTimeout(() => setLoading(false), 5000);

    const unsub = listenOrders((orders) => {
      const foundOrder = orders.find(o => o.id === orderId);
      if (foundOrder) {
        setOrder(foundOrder);
        setLoading(false);
        window.clearTimeout(timeout);
      }
    });

    return () => {
      try { unsub && unsub(); } catch {}
      window.clearTimeout(timeout);
    };
  }, [orderId, user?.id]);

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-center text-2xl font-semibold mb-6">Order details</h1>
        <p className="text-center text-gray-600 mb-6">You need to sign in to view your order.</p>
        <div className="flex justify-center gap-3">
          <button
            className="px-4 py-2 rounded-lg bg-black text-white"
            onClick={() => {
              if (onRequireAuth) onRequireAuth(`/orders/${encodeURIComponent(orderId)}`);
              else navigate('/');
            }}
          >
            Sign In
          </button>
          <Link className="px-4 py-2 rounded-lg border border-gray-200" to="/orders">Back to orders</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link to="/orders" className="text-sm text-gray-600 hover:text-gray-900">← Back to orders</Link>
        </div>
        <div className="text-center text-gray-600">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link to="/orders" className="text-sm text-gray-600 hover:text-gray-900">← Back to orders</Link>
        </div>
        <div className="text-center text-gray-500">{error}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link to="/orders" className="text-sm text-gray-600 hover:text-gray-900">← Back to orders</Link>
        </div>
        <div className="text-center text-gray-500">Order not found.</div>
      </div>
    );
  }

  if (order.userId && user.id && order.userId !== user.id) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link to="/orders" className="text-sm text-gray-600 hover:text-gray-900">← Back to orders</Link>
        </div>
        <div className="text-center text-gray-500">You don’t have access to this order.</div>
      </div>
    );
  }

  const orderNo = `#${String(order.id).slice(0, 10)}`;
  const date = formatDate(order.date || '');
  const paid = String(order.paymentStatus || '').toUpperCase() === 'PAID' || !!order.paidAt;
  const qty = (order.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);
  const total = Number(order.total || 0);
  const fulfillment = String(order.status || 'Pending');

  const sRank = statusRank(order.status);
  const isCancelled = String(order.status || '').toLowerCase() === String(OrderStatus.CANCELLED).toLowerCase();

  const steps = isCancelled
    ? [{ key: 'cancelled', title: 'Cancelled', done: true }]
    : [
        { key: 'pending', title: 'Order placed', done: sRank >= 1 },
        { key: 'shipped', title: 'Shipped', done: sRank >= 2 },
        { key: 'delivered', title: 'Delivered', done: sRank >= 3 },
      ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/orders" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to orders
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
          <p className="text-gray-600 mt-2">Order {orderNo}</p>
        </div>

        {/* Order Status Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    paid
                      ? fulfillment.toLowerCase() === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : fulfillment.toLowerCase() === 'shipped'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {paid ? `Paid • ${fulfillment}` : `Unpaid • ${fulfillment}`}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500 mb-1">Order Date</div>
                    <div className="font-semibold text-gray-900">{date}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500 mb-1">Total Amount</div>
                    <div className="font-semibold text-gray-900 text-xl">${total.toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500 mb-1">Items</div>
                    <div className="font-semibold text-gray-900">{qty} item{qty !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Status Timeline */}
          <div className="px-8 pb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Order Status</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {steps.map((st, idx) => (
                <div key={st.key} className="flex items-center gap-4 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      st.done
                        ? 'bg-black text-white shadow-lg'
                        : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                    }`}
                  >
                    {st.done ? '✓' : idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold text-lg ${st.done ? 'text-gray-900' : 'text-gray-500'}`}>
                      {st.title}
                    </div>
                    {!isCancelled && st.done && (
                      <div className="text-sm text-gray-500 mt-1">
                        {st.key === 'pending' && "We've received your order"}
                        {st.key === 'shipped' && "Your package is on the way"}
                        {st.key === 'delivered' && "Delivered to your address"}
                      </div>
                    )}
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`hidden sm:block w-12 h-0.5 ${st.done ? 'bg-black' : 'bg-gray-200'}`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100">
            <h3 className="text-2xl font-semibold text-gray-900">Order Items</h3>
          </div>

          <div className="divide-y divide-gray-100">
            {(order.items || []).map((it) => {
              const lineTotal = Number(it.price || 0) * Math.max(1, Number(it.quantity || 1));
              return (
                <div key={`${it.productId}-${it.name}`} className="p-8 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                      {it.image ? (
                        <img
                          src={it.image}
                          alt={it.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                          }}
                        />
                      ) : (
                        <div className="text-gray-300 text-sm flex items-center justify-center h-full">No image</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${encodeURIComponent(it.productId)}`}
                        className="text-lg font-semibold text-gray-900 hover:text-black transition-colors block mb-2"
                      >
                        {it.name}
                      </Link>
                      <div className="text-gray-600">
                        Quantity: <span className="font-medium">{it.quantity}</span> × <span className="font-medium">${Number(it.price || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">${lineTotal.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Total */}
          <div className="p-8 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-semibold text-gray-900">Order Total</span>
              <span className="text-3xl font-bold text-gray-900">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
