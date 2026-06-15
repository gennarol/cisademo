import { createContext, useContext, useState } from 'react';
import { orders as initialOrders } from '../data/mockData';

const OrdersContext = createContext();

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState(initialOrders);

  const updateOrder = (orderId, updates) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, ...updates } : order
      )
    );
  };

  const updateOrderLine = (orderId, lineId, updates) => {
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
  };

  const approveOrder = (orderId) => {
    updateOrder(orderId, { status: 'approvato' });
  };

  const sendToD365 = (orderId) => {
    updateOrder(orderId, { status: 'inviato_d365' });
  };

  const requestCorrection = (orderId, message, channel) => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id !== orderId) return order;
        const newRequest = { id: Date.now(), message, channel, date: new Date().toISOString() };
        const correctionRequests = [...(order.correctionRequests || []), newRequest];
        return { ...order, status: 'richiesta_correzione', correctionRequests };
      })
    );
  };

  return (
    <OrdersContext.Provider
      value={{ orders, updateOrder, updateOrderLine, approveOrder, sendToD365, requestCorrection }}
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
