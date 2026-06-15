import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { orders as initialOrders } from '../data/mockData';
import { featureFlags } from '../config/featureFlags';
import { ordersApi } from '../services/api';

const OrdersContext = createContext();

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState(featureFlags.USE_API ? [] : initialOrders);
  const [loading, setLoading] = useState(featureFlags.USE_API);
  const [error, setError] = useState(null);

  // Fetch orders from API on mount
  const fetchOrders = useCallback(async () => {
    if (!featureFlags.USE_API) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.getAll();
      setOrders(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrder = async (orderId, updates) => {
    // Optimistic local update
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, ...updates } : order
      )
    );
    if (featureFlags.USE_API) {
      try {
        await ordersApi.update(orderId, updates);
      } catch (err) {
        console.error('Failed to update order:', err);
        fetchOrders(); // Revert by re-fetching
      }
    }
  };

  const updateOrderLine = async (orderId, lineId, updates) => {
    // Optimistic local update
    setOrders(prev =>
      prev.map(order => {
        if (order.id !== orderId) return order;
        const newLines = order.lines.map(line =>
          line.id === lineId ? { ...line, ...updates } : line
        );
        const totalAmount = newLines.reduce((sum, l) => sum + l.totalPrice, 0);
        return { ...order, lines: newLines, totalAmount: +totalAmount.toFixed(2) };
      })
    );
    if (featureFlags.USE_API) {
      try {
        await ordersApi.updateLine(orderId, lineId, updates);
      } catch (err) {
        console.error('Failed to update order line:', err);
        fetchOrders();
      }
    }
  };

  const approveOrder = async (orderId) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, status: 'approvato' } : order
      )
    );
    if (featureFlags.USE_API) {
      try {
        await ordersApi.approve(orderId);
      } catch (err) {
        console.error('Failed to approve order:', err);
        fetchOrders();
      }
    }
  };

  const sendToD365 = async (orderId) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, status: 'inviato_d365' } : order
      )
    );
    if (featureFlags.USE_API) {
      try {
        await ordersApi.sendToD365(orderId);
      } catch (err) {
        console.error('Failed to send to D365:', err);
        fetchOrders();
      }
    }
  };

  const requestCorrection = async (orderId, message, channel) => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id !== orderId) return order;
        const newRequest = { id: Date.now(), message, channel, date: new Date().toISOString() };
        const correctionRequests = [...(order.correctionRequests || []), newRequest];
        return { ...order, status: 'richiesta_correzione', correctionRequests };
      })
    );
    if (featureFlags.USE_API) {
      try {
        await ordersApi.requestCorrection(orderId, message, channel);
      } catch (err) {
        console.error('Failed to request correction:', err);
        fetchOrders();
      }
    }
  };

  return (
    <OrdersContext.Provider
      value={{ orders, loading, error, updateOrder, updateOrderLine, approveOrder, sendToD365, requestCorrection, refetchOrders: fetchOrders }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) throw new Error('useOrders must be used within OrdersProvider');
  return context;
}
