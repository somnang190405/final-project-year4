import React, { useState, useEffect } from "react";
import { getAllOrders, updateOrderStatus, updateOrderReturnRequest } from "../services/firestoreService";
import { Order, OrderStatus } from "../types";
import './OrderManagement.css';

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'returns'>('orders');
  const [returnComment, setReturnComment] = useState('');
  const [activeReturnOrder, setActiveReturnOrder] = useState<string | null>(null);
  const [returnBusy, setReturnBusy] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      const fetchedOrders = await getAllOrders();
      setOrders(fetchedOrders);
    };
    fetchOrders();
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
          {regularOrders.map((order) => {
            const canShip = order.status === OrderStatus.PENDING;
            const canDeliver = order.status === OrderStatus.SHIPPED;
            const canCancel = order.status === OrderStatus.PENDING;
            const totalText = typeof (order as any).total === 'number' ? `$${(order as any).total.toFixed(2)}` : '$0.00';
            return (
              <div className="om-row" key={order.id}>
                <span className="om-cell id">{order.id}</span>
                <span className="om-cell date">{order.date}</span>
                <span className="om-cell customer">{order.userId || 'guest'}</span>
                <span className="om-cell total">{totalText}</span>
                <span className="om-cell status">
                  <span className={`status-badge ${String(order.status).toLowerCase()}`}>{order.status}</span>
                </span>
                <span className="om-cell actions">
                  {canDeliver && (
                    <button className="btn success" onClick={() => handleUpdateStatus(order.id, OrderStatus.DELIVERED)}>✓ Mark Delivered</button>
                  )}
                  {canShip && (
                    <button className="btn primary" onClick={() => handleUpdateStatus(order.id, OrderStatus.SHIPPED)}>📦 Mark Shipped</button>
                  )}
                  {canCancel && (
                    <button className="btn danger" onClick={() => handleUpdateStatus(order.id, OrderStatus.CANCELLED)}>✕ Cancel</button>
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
              {ordersWithReturns.map((order) => {
                const returnReq = order.returnRequest!;
                const canApprove = returnReq.status === 'Requested';
                const canComplete = returnReq.status === 'Approved';
                const totalText = typeof (order as any).total === 'number' ? `$${(order as any).total.toFixed(2)}` : '$0.00';

                return (
                  <div className="return-card card" key={order.id}>
                    <div className="return-header">
                      <div className="return-info">
                        <h4>Order #{order.id}</h4>
                        <p className="return-date">Requested: {new Date(returnReq.requestedAt?.toDate?.() || returnReq.requestedAt).toLocaleDateString()}</p>
                        <p className="return-customer">Customer: {order.userId || 'guest'}</p>
                        <p className="return-total">Total: {totalText}</p>
                      </div>
                      <div className="return-status">
                        <span className={`status-badge ${returnReq.status.toLowerCase()}`}>{returnReq.status}</span>
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
                            onClick={() => handleUpdateReturnRequest(order.id, 'Approved', returnComment)}
                            disabled={returnBusy}
                          >
                            {returnBusy ? 'Processing...' : '✓ Approve Return'}
                          </button>
                          <button
                            className="btn danger"
                            onClick={() => handleUpdateReturnRequest(order.id, 'Declined', returnComment)}
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
    </div>
  );
};

export default OrderManagement;
