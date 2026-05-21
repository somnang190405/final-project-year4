import React, { useMemo, useState, useEffect } from "react";
import { getSalesReports, getAllUsers } from "../services/firestoreService";
import { Order, OrderStatus } from "../types";
import { formatOrderId } from '../utils/formatIds';

const SalesReports: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayISO = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [fromISO, setFromISO] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [toISO, setToISO] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [usersMap, setUsersMap] = useState<Record<string,string>>({});

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const [fetched, users] = await Promise.all([getSalesReports(), getAllUsers()]);
        setOrders((Array.isArray(fetched) ? fetched : []) as Order[]);
        const map: Record<string,string> = {};
        users.forEach(u => { map[u.id] = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.id; });
        setUsersMap(map);
      } catch (e: any) {
        setError(e?.message || 'Failed to load sales reports');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const parseOrderDate = (o: Order): number | null => {
    const raw = (o.paidAt || o.date || '').toString();
    if (!raw) return null;
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : null;
  };

  const range = useMemo(() => {
    const from = Date.parse(`${fromISO}T00:00:00`);
    const to = Date.parse(`${toISO}T23:59:59`);
    return {
      from: Number.isFinite(from) ? from : null,
      to: Number.isFinite(to) ? to : null,
    };
  }, [fromISO, toISO]);

  const filteredOrders = useMemo(() => {
    return orders
      .map((o) => ({ o, t: parseOrderDate(o) }))
      .filter(({ t }) => {
        if (t == null) return false;
        if (range.from != null && t < range.from) return false;
        if (range.to != null && t > range.to) return false;
        return true;
      })
      .map(({ o }) => o)
      .sort((a, b) => {
        const ta = parseOrderDate(a) ?? 0;
        const tb = parseOrderDate(b) ?? 0;
        return tb - ta;
      });
  }, [orders, range]);

  const stats = useMemo(() => {
    const nonCancelled = filteredOrders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const paid = filteredOrders.filter((o) => (o.paymentStatus ? o.paymentStatus === 'PAID' : o.status !== OrderStatus.CANCELLED));
    const sum = (arr: Order[]) => arr.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const items = (arr: Order[]) => arr.reduce((acc, o) => acc + (Array.isArray(o.items) ? o.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0), 0);
    return {
      totalOrders: filteredOrders.length,
      totalItems: items(filteredOrders),
      grossRevenue: sum(nonCancelled),
      paidRevenue: sum(paid),
      paidOrders: paid.length,
      cancelledOrders: filteredOrders.length - nonCancelled.length,
    };
  }, [filteredOrders]);

  const money = (n: number) => {
    const v = Number.isFinite(n) ? n : 0;
    return `$${v.toFixed(2)}`;
  };

  const mapOrderStatusToBadge = (status: string) => {
    const s = String(status).toLowerCase();
    if (s.includes('cancel') || s.includes('declin')) return 'declined';
    if (s.includes('deliver') || s.includes('complete') || s.includes('approved')) return 'approved';
    return 'requested';
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Sales Reports</h1>
          <p className="mt-2 text-sm text-slate-600">Summary metrics and recent order trends for your store.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">From</span>
            <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" type="date" value={fromISO} max={toISO || todayISO} onChange={(e) => setFromISO(e.target.value)} />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">To</span>
            <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" type="date" value={toISO} min={fromISO} max={todayISO} onChange={(e) => setToISO(e.target.value)} />
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 mb-6">
          <div className="font-semibold text-rose-700">Could not load reports</div>
          <div className="mt-2 text-sm text-rose-700">{error}</div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 mb-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Orders</div>
          <div className="mt-4 text-3xl font-semibold text-slate-900">{stats.totalOrders}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Items Sold</div>
          <div className="mt-4 text-3xl font-semibold text-slate-900">{stats.totalItems}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Gross Revenue</div>
          <div className="mt-4 text-3xl font-semibold text-slate-900">{money(stats.grossRevenue)}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Paid Revenue</div>
          <div className="mt-4 text-3xl font-semibold text-slate-900">{money(stats.paidRevenue)}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Cancelled Orders</div>
          <div className="mt-4 text-3xl font-semibold text-slate-900">{stats.cancelledOrders}</div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Revenue Trend</h2>
            <p className="text-sm text-slate-600">A quick glance at recent order activity and growth.</p>
          </div>
          <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">Data is live</div>
        </div>
        <div className="mt-6 h-40 overflow-hidden rounded-[1.5rem] bg-slate-50 p-4">
          <svg viewBox="0 0 100 40" className="h-full w-full">
            <path d="M0,30 C15,24 25,18 35,20 C45,22 55,12 65,16 C75,20 85,10 100,8" stroke="#4f46e5" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="0" cy="30" r="1.8" fill="#4f46e5" />
            <circle cx="35" cy="20" r="1.8" fill="#4f46e5" />
            <circle cx="65" cy="16" r="1.8" fill="#4f46e5" />
            <circle cx="100" cy="8" r="1.8" fill="#4f46e5" />
          </svg>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[1.6fr_1.2fr_1.2fr_1fr_1fr] gap-0 border-b border-slate-200 bg-slate-100 px-6 py-4 text-sm uppercase tracking-[0.24em] text-slate-600">
            <span>Order ID</span>
            <span>Date</span>
            <span>Customer</span>
            <span>Status</span>
            <span>Total</span>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-sm text-slate-500">Loading…</div>
          ) : filteredOrders.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-500">No orders in the selected date range.</div>
          ) : (
            filteredOrders.slice(0, 50).map((o, idx) => {
              const dt = parseOrderDate(o);
              const dateText = dt ? new Date(dt).toLocaleString() : (o.date || '—');
              return (
                <div key={o.id} className={`grid grid-cols-[1.6fr_1.2fr_1.2fr_1fr_1fr] gap-0 px-6 py-4 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                  <span className="font-semibold text-slate-900">{formatOrderId(idx)}</span>
                  <span className="text-slate-700">{dateText}</span>
                  <span className="text-slate-700">{usersMap[String(o.userId)] || (o.userId ? String(o.userId).slice(0,8) : 'guest')}</span>
                  <span className="text-slate-700"><span className={`status-badge ${mapOrderStatusToBadge(o.status)}`}>{o.status}</span>{o.paymentStatus ? ` / ${o.paymentStatus}` : ''}</span>
                  <span className="font-semibold text-slate-900">{money(Number(o.total) || 0)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {!loading && filteredOrders.length > 50 && (
        <div className="mt-4 px-4 text-sm text-slate-500">Showing latest 50 orders (filtered).</div>
      )}
    </div>
  );
};

export default SalesReports;
