import React, { useState, useEffect } from "react";
import { getAllOrders, updateOrderStatus, updateOrderReturnRequest, getAllUsers } from "../services/firestoreService";
import { Order, OrderStatus } from "../types";
import { formatOrderId } from '../utils/formatIds';
import Modal from '../components/Modal';
import './OrderManagement.css';

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string,string>>({});
  const [activeTab, setActiveTab] = useState<'orders' | 'returns'>('orders');
  const [returnComment, setReturnComment] = useState('');
  const [activeReturnOrder, setActiveReturnOrder] = useState<string | null>(null);
  const [returnBusy, setReturnBusy] = useState(false);
  const [pendingReturnAction, setPendingReturnAction] = useState<{ orderId: string; status: 'Approved' | 'Declined' } | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const fetchedOrders = await getAllOrders();
      setOrders(fetchedOrders);
      try {
        const users = await getAllUsers();
        const map: Record<string,string> = {};
        users.forEach(u => { map[u.id] = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.id; });
        setUsersMap(map);
      } catch (e) {
        console.warn('Failed to load users for order display', e);
      }
    };
    fetchAll();
  }, []);

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    await updateOrderStatus(id, status);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const handleUpdateReturnRequest = async (orderId: string, status: 'Approved' | 'Declined' | 'Completed', adminComment?: string) => {
    setReturnBusy(true);
    try {
      await updateOrderReturnRequest(orderId, status, adminComment);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? {
        ...o,
        returnRequest: {
          ...o.returnRequest,
          status,
          adminComment: adminComment || o.returnRequest?.adminComment,
          updatedAt: new Date().toISOString()
        }
      } : o)));
      setActiveReturnOrder(null);
      setReturnComment('');
    } catch (error) {
      console.error('Failed to update return request:', error);
      alert('Failed to update return request. Please try again.');
    } finally {
      setReturnBusy(false);
    }
  };

  const confirmPendingReturnAction = async () => {
    if (!pendingReturnAction) return;
    await handleUpdateReturnRequest(pendingReturnAction.orderId, pendingReturnAction.status, returnComment);
    setPendingReturnAction(null);
  };

  const mapOrderStatusToBadge = (status: string) => {
    const s = String(status).toLowerCase();
    if (s.includes('cancel') || s.includes('declin')) return 'declined';
    if (s.includes('deliver') || s.includes('complete') || s.includes('approved')) return 'approved';
    // shipped, pending, requested
    return 'requested';
  };

  const ordersWithReturns = orders.filter(order => order.returnRequest?.status);
  const regularOrders = orders.filter(order => !order.returnRequest?.status);

  return (
    <div className="order-management-container">
      <div className="tabs mb-6">
        <button
          className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders ({regularOrders.length})
        </button>
        <button
          className={`tab ${activeTab === 'returns' ? 'active' : ''}`}
          onClick={() => setActiveTab('returns')}
        >
          Returns ({ordersWithReturns.length})
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="om-table card">
          <div className="om-row om-header">
            <span>Order ID</span>
            <span>Date</span>
            <span>Customer</span>
            <span>Total</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {regularOrders.map((order, idx) => {
            const canShip = order.status === OrderStatus.PENDING;
            const canDeliver = order.status === OrderStatus.SHIPPED;
            const canCancel = order.status === OrderStatus.PENDING;
            const totalText = typeof (order as any).total === 'number' ? `$${(order as any).total.toFixed(2)}` : '$0.00';
            const displayId = formatOrderId(idx);
            const customerName = usersMap[String(order.userId)] || (order.userId ? String(order.userId).slice(0,8) : 'guest');
            return (
              <div className="om-row hover:bg-gray-50" key={order.id}>
                <span className="om-cell id">{displayId}</span>
                <span className="om-cell date">{order.date}</span>
                <span className="om-cell customer">{customerName}</span>
                <span className="om-cell total">{totalText}</span>
                <span className="om-cell status">
                  <span className={`status-badge ${mapOrderStatusToBadge(order.status)}`}>{order.status}</span>
                </span>
                <span className="om-cell actions">
                  {canDeliver && (
                    <button className="px-3 py-1 rounded-md bg-emerald-600 text-white text-sm mr-2" onClick={() => handleUpdateStatus(order.id, OrderStatus.DELIVERED)}>✓ Mark Delivered</button>
                  )}
                  {canShip && (
                    <button className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm mr-2" onClick={() => handleUpdateStatus(order.id, OrderStatus.SHIPPED)}>📦 Mark Shipped</button>
                  )}
                  {canCancel && (
                    <button className="px-3 py-1 rounded-md bg-rose-600 text-white text-sm" onClick={() => handleUpdateStatus(order.id, OrderStatus.CANCELLED)}>✕ Cancel</button>
                  )}
                  {!canShip && !canDeliver && !canCancel && (
                    <span className="om-muted">No actions available</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'returns' && (
        <div className="returns-section">
          <h3 className="section-title">Return Requests Management</h3>
          {ordersWithReturns.length === 0 ? (
            <div className="empty-state">
              <p>No return requests at this time.</p>
            </div>
          ) : (
            <div className="returns-list">
              {ordersWithReturns.map((order, idx) => {
                const returnReq = order.returnRequest!;
                const canApprove = returnReq.status === 'Requested';
                const canComplete = returnReq.status === 'Approved';
                const totalText = typeof (order as any).total === 'number' ? `$${(order as any).total.toFixed(2)}` : '$0.00';

                return (
                  <div className="return-card card" key={order.id}>
                    <div className="return-header">
                      <div className="return-info">
                        <h4>{formatOrderId(idx)}</h4>
                        <p className="return-date">Requested: {new Date(returnReq.requestedAt || '').toLocaleDateString()}</p>
                        <p className="return-customer">Customer: {usersMap[String(order.userId)] || (order.userId ? String(order.userId).slice(0, 8) : 'guest')}</p>
                        <p className="return-total">Total: {totalText}</p>
                      </div>
                      <div className="return-status">
                        <span className={`status-badge ${mapOrderStatusToBadge(returnReq.status)}`}>{returnReq.status}</span>
                      </div>
                    </div>

                    <div className="return-details">
                      <div className="customer-comment">
                        <h5>Customer Comment:</h5>
                        <p>{returnReq.customerComment || 'No comment provided'}</p>
                      </div>

                      {returnReq.adminComment && (
                        <div className="admin-comment">
                          <h5>Admin Comment:</h5>
                          <p>{returnReq.adminComment}</p>
                        </div>
                      )}
                    </div>

                    {activeReturnOrder === order.id && (
                      <div className="return-actions-form">
                        <textarea
                          placeholder="Add admin comment (optional)"
                          value={returnComment}
                          onChange={(e) => setReturnComment(e.target.value)}
                          className="comment-input"
                          rows={3}
                        />
                        <div className="form-actions">
                          <button
                            className="btn success"
                            onClick={() => setPendingReturnAction({ orderId: order.id, status: 'Approved' })}
                            disabled={returnBusy}
                          >
                            {returnBusy ? 'Processing...' : '✓ Approve Return'}
                          </button>
                          <button
                            className="btn danger"
                            onClick={() => setPendingReturnAction({ orderId: order.id, status: 'Declined' })}
                            disabled={returnBusy}
                          >
                            {returnBusy ? 'Processing...' : '✕ Decline Return'}
                          </button>
                          <button
                            className="btn secondary"
                            onClick={() => {
                              setActiveReturnOrder(null);
                              setReturnComment('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="return-actions">
                      {canApprove && (
                        <button
                          className="btn primary"
                          onClick={() => setActiveReturnOrder(order.id)}
                        >
                          Review Request
                        </button>
                      )}
                      {canComplete && (
                        <button
                          className="btn success"
                          onClick={() => handleUpdateReturnRequest(order.id, 'Completed')}
                          disabled={returnBusy}
                        >
                          {returnBusy ? 'Processing...' : '✓ Mark Completed'}
                        </button>
                      )}
                      {returnReq.status === 'Declined' && (
                        <span className="om-muted">Return declined</span>
                      )}
                      {returnReq.status === 'Completed' && (
                        <span className="om-muted">Return completed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal
        open={Boolean(pendingReturnAction)}
        title={pendingReturnAction ? (pendingReturnAction.status === 'Approved' ? 'Approve Return' : 'Decline Return') : undefined}
        variant={pendingReturnAction ? (pendingReturnAction.status === 'Approved' ? 'success' : 'danger') : 'neutral'}
        confirmLabel={'Yes, Confirm'}
        confirmDisabled={returnBusy}
        onClose={() => setPendingReturnAction(null)}
        onConfirm={confirmPendingReturnAction}
      >
        <p>
          Are you sure you want to {pendingReturnAction?.status === 'Approved' ? 'approve' : 'decline'} this return request? This action will update the order return status immediately.
        </p>
      </Modal>
    </div>
  );
};

export default OrderManagement;
