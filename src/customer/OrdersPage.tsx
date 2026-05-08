import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listenOrdersByUser, requestOrderReturn } from '../services/firestoreService';
import { Order, OrderStatus, User } from '../types';

type Props = {
  user: User | null;
  onRequireAuth?: (redirectTo: string) => void;
};

const formatDate = (raw: any) => {
  if (!raw) return '';
  const s = String(raw);
  // If already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // ISO date
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }
  return s;
};

const OrdersPage: React.FC<Props> = ({ user, onRequireAuth }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'history' | 'return'>('history');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReturnOrder, setActiveReturnOrder] = useState<string | null>(null);
  const [returnComment, setReturnComment] = useState('');
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

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-center text-2xl font-semibold mb-6">My orders</h1>
        <p className="text-center text-gray-600 mb-6">You need to sign in to view your order history.</p>
        <div className="flex justify-center gap-3">
          <button
            className="px-4 py-2 rounded-lg bg-black text-white"
            onClick={() => {
              if (onRequireAuth) onRequireAuth('/orders');
              else navigate('/');
            }}
          >
            Sign In
          </button>
          <Link className="px-4 py-2 rounded-lg border border-gray-200" to="/">Back Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-center text-2xl font-bold mb-8">My Orders</h1>

      <div className="flex flex-col sm:flex-row justify-center gap-4 text-base mb-8">
        <button
          className={`px-4 py-2 rounded-full transition ${tab === 'history' ? 'bg-black text-white font-semibold shadow-lg' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setTab('history')}
        >
          Order History
        </button>
        <button
          className={`px-4 py-2 rounded-full transition ${tab === 'return' ? 'bg-black text-white font-semibold shadow-lg' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setTab('return')}
        >
          Return Center
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-600">Loading…</div>
      ) : tab === 'return' ? (
        <div className="space-y-8">
          <div className="rounded-3xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Return Center</h2>
            <p className="text-gray-600 leading-7">
              You can request a return for delivered orders and leave a short note so our team can review the product condition. Your return request will be tracked here and updated by the store.
            </p>
          </div>

          {pendingReturnOrders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Pending return requests</h3>
                <span className="text-sm text-gray-500">{pendingReturnOrders.length} open</span>
              </div>
              <div className="space-y-4">
                {pendingReturnOrders.map((order) => {
                  const orderNo = `#${String(order.id).slice(0, 10)}`;
                  const date = formatDate(order.date || (order as any).createdAt || '');
                  const comment = order.returnRequest?.customerComment || 'No note provided.';
                  return (
                    <div key={order.id} className="rounded-3xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <div className="text-sm text-gray-500">Return requested for</div>
                          <div className="text-base font-semibold text-gray-900">{orderNo}</div>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
                          Return requested
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3 text-sm text-gray-700 mb-4">
                        <div>
                          <span className="block font-semibold">Total</span>
                          <span>${Number(order.total || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block font-semibold">Ordered</span>
                          <span>{date}</span>
                        </div>
                        <div>
                          <span className="block font-semibold">Status</span>
                          <span className="text-gray-900">{order.returnRequest?.status}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white p-4 border border-gray-200">
                        <p className="text-sm font-semibold text-gray-900 mb-2">Return comment</p>
                        <p className="text-sm text-gray-700 leading-6">{comment}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {eligibleReturnOrders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Delivered orders eligible for return</h3>
                <span className="text-sm text-gray-500">{eligibleReturnOrders.length} available</span>
              </div>
              <div className="space-y-4">
                {eligibleReturnOrders.map((order) => {
                  const orderNo = `#${String(order.id).slice(0, 10)}`;
                  const date = formatDate(order.date || (order as any).createdAt || '');
                  const showingForm = activeReturnOrder === order.id;
                  return (
                    <div key={order.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <div className="text-sm text-gray-500">Delivered order</div>
                          <div className="text-base font-semibold text-gray-900">{orderNo}</div>
                        </div>
                        <button
                          type="button"
                          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-gray-400 transition"
                          onClick={() => {
                            setActiveReturnOrder(showingForm ? null : order.id);
                            setReturnComment(order.returnRequest?.customerComment || '');
                            setReturnError('');
                          }}
                        >
                          {showingForm ? 'Cancel' : 'Request return'}
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3 text-sm text-gray-700 mb-4">
                        <div>
                          <span className="block font-semibold">Total</span>
                          <span>${Number(order.total || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block font-semibold">Delivered</span>
                          <span>{date}</span>
                        </div>
                        <div>
                          <span className="block font-semibold">Items</span>
                          <span>{(order.items || []).length}</span>
                        </div>
                      </div>
                      {showingForm ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Tell us about the return</label>
                            <textarea
                              value={returnComment}
                              onChange={(e) => setReturnComment(e.target.value)}
                              rows={4}
                              className="w-full min-h-[120px] rounded-3xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                              placeholder="Describe why you want to return this item and any condition notes."
                            />
                          </div>
                          {returnError && <p className="text-sm text-red-600">{returnError}</p>}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!returnComment.trim()) {
                                  setReturnError('Please describe why you want to return this order.');
                                  return;
                                }
                                setReturnBusy(true);
                                setReturnError('');
                                try {
                                  await requestOrderReturn(order.id, returnComment);
                                  setActiveReturnOrder(null);
                                  setReturnComment('');
                                } catch (err: any) {
                                  console.error('Return request failed', err);
                                  setReturnError('Could not submit the return request. Please try again.');
                                } finally {
                                  setReturnBusy(false);
                                }
                              }}
                              disabled={returnBusy}
                              className="rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-indigo-400/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {returnBusy ? 'Submitting...' : 'Submit return request'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReturnOrder(null);
                                setReturnComment('');
                                setReturnError('');
                              }}
                              className="rounded-3xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="rounded-3xl bg-gray-50 p-4 text-sm text-gray-600 border border-gray-200">
                            Please make sure the product is in the same condition as delivered and include any details that will help our team review your return request.
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">Request a return if this item does not match expectations or arrived damaged.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pendingReturnOrders.length === 0 && eligibleReturnOrders.length === 0 && (
            <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">No returns available</h3>
              <p className="text-gray-600 mb-6">You can submit a return request once an order is marked as delivered.</p>
              <Link to="/shop" className="inline-flex items-center justify-center rounded-3xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-900 transition">
                Continue shopping
              </Link>
            </div>
          )}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500">No order history yet.</div>
      ) : (
        <div className="flex flex-col gap-8">
          {rows.map((order) => {
            const paid = String((order as any).paymentStatus || '').toUpperCase() === 'PAID' || !!(order as any).paidAt;
            const status = String(order.status || 'Pending');
            const statusColor = status === 'Delivered' ? 'bg-green-100 text-green-700' : status === 'Shipped' ? 'bg-blue-100 text-blue-700' : status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-700';
            const date = formatDate((order as any).date || (order as any).createdAt || '');
            const total = Number(order.total || 0);
            const orderNo = `#${String(order.id).slice(0, 10)}`;

            return (
              <div key={order.id} className="rounded-xl border border-gray-200 shadow-sm bg-white p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono text-xs text-gray-500">{orderNo}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>{status}</span>
                    {paid && <span className="px-2 py-1 rounded text-xs bg-black text-white">Paid</span>}
                    <span className="text-gray-500 text-xs">{date}</span>
                  </div>
                  <div className="text-right font-bold text-lg text-gray-900">US ${total.toFixed(2)}</div>
                </div>

                {/* Progress bar for in-progress orders */}
                {status !== 'Delivered' && status !== 'Cancelled' && (
                  <div className="w-full h-2 bg-gray-100 rounded mb-4">
                    <div className={`h-2 rounded ${status === 'Pending' ? 'bg-yellow-400 w-1/3' : status === 'Shipped' ? 'bg-blue-500 w-2/3' : 'bg-green-500 w-full'}`}></div>
                  </div>
                )}

                {order.returnRequest?.status && (
                  <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200 mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-gray-900">Return status</span>
                      <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                        {order.returnRequest.status}
                      </span>
                    </div>
                    {order.returnRequest.customerComment && (
                      <p className="mt-3 text-sm text-gray-700">Customer note: {order.returnRequest.customerComment}</p>
                    )}
                    {order.returnRequest.adminComment && (
                      <p className="mt-2 text-sm text-gray-600">Store note: {order.returnRequest.adminComment}</p>
                    )}
                  </div>
                )}

                {/* Products in this order */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b">
                        <th className="py-2 text-left">Product</th>
                        <th className="py-2 text-left">Name</th>
                        <th className="py-2 text-center">Qty</th>
                        <th className="py-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items || []).map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-2 pr-2">
                            <div className="w-14 h-14 bg-gray-50 rounded overflow-hidden flex items-center justify-center">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" decoding="async" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.visibility='hidden';}} />
                              ) : (
                                <div className="text-gray-300 text-xs">No image</div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 pr-2 font-medium text-gray-900">{item.name}</td>
                          <td className="py-2 text-center">{item.quantity}</td>
                          <td className="py-2 text-right">${item.price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
