import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OrdersProvider } from './context/OrdersContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrdersList from './pages/OrdersList';
import OrderDetail from './pages/OrderDetail';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<OrdersList />} />
        <Route path="orders/:orderId" element={<OrderDetail />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <OrdersProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </OrdersProvider>
    </AuthProvider>
  );
}

export default App;
