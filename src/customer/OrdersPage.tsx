import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listenOrdersByUser } from '../services/firestoreService';
import { Order, User } from '../types';

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
      // TODO: Implement return orders logic if needed
      return [] as Order[];
    }
    // 'history' tab shows all orders
    return orders;
  }, [orders, tab]);

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

      <div className="flex justify-center gap-8 text-base mb-8">
        <button
          className={`px-3 py-1 rounded-full transition ${tab === 'history' ? 'bg-black text-white font-semibold shadow' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setTab('history')}
        >
          Order History
        </button>
        <button
          className={`px-3 py-1 rounded-full transition ${tab === 'return' ? 'bg-black text-white font-semibold shadow' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setTab('return')}
        >
          Return
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-600">Loading…</div>
      ) : tab === 'return' ? (
        <div className="text-center text-gray-500">No return orders yet.</div>
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
