import { useEffect, Component, ReactNode } from 'react';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';

// ── Error Boundary — prevents blank/black screen on runtime errors ──────────
interface EBState { hasError: boolean; message: string }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err?.message ?? 'Erro desconhecido' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-white text-3xl font-bold mb-3">Ops!</p>
            <p className="text-white/50 text-sm mb-6">Algo deu errado. Por favor, recarregue a página.</p>
            <button
              onClick={() => { this.setState({ hasError: false, message: '' }); window.location.hash = '/'; }}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-all"
            >
              Recarregar
            </button>
            {this.state.message && (
              <p className="text-white/20 text-xs mt-4 font-mono break-all">{this.state.message}</p>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { useRouter } from './hooks/useRouter';
import { navigate } from './hooks/useRouter';
import Header from './components/Header';
import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderStatusPage from './pages/OrderStatusPage';
import LoginPage from './pages/LoginPage';
import MyOrdersPage from './pages/MyOrdersPage';
import ProfilePage from './pages/ProfilePage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminPDV from './pages/admin/AdminPDV';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminStock from './pages/admin/AdminStock';
import AdminDelivery from './pages/admin/AdminDelivery';
import AdminReports from './pages/admin/AdminReports';

// Routes that require authentication
const PROTECTED = ['/orders', '/profile'];

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAdmin) window.location.hash = '/admin';
  }, [isAdmin, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;
  return <>{children}</>;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { path } = useRouter();

  useEffect(() => {
    if (loading) return;
    const needsAuth = PROTECTED.some(p => path === p || path.startsWith(p + '/'));
    if (needsAuth && !user) navigate('/login');
  }, [user, loading, path]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const needsAuth = PROTECTED.some(p => path === p || path.startsWith(p + '/'));
  if (needsAuth && !user) return null;

  return <>{children}</>;
}

function Router() {
  const { path } = useRouter();
  const { user } = useAuth();

  // Admin routes — completely separate shell
  if (path === '/admin') return <AdminLogin />;
  if (path.startsWith('/admin/')) {
    const adminContent = () => {
      if (path === '/admin/dashboard') return <AdminDashboard />;
      if (path === '/admin/orders') return <AdminOrders />;
      if (path === '/admin/products') return <AdminProducts />;
      if (path === '/admin/coupons') return <AdminCoupons />;
      if (path === '/admin/pdv') return <AdminPDV />;
      if (path === '/admin/customers') return <AdminCustomers />;
      if (path === '/admin/stock') return <AdminStock />;
      if (path === '/admin/delivery') return <AdminDelivery />;
      if (path === '/admin/reports') return <AdminReports />;
      return <AdminDashboard />;
    };
    return (
      <AdminGuard>
        <AdminLayout>{adminContent()}</AdminLayout>
      </AdminGuard>
    );
  }

  // Auth page — full screen, no chrome
  if (path === '/login' || path === '/signup') {
    // If already logged in, redirect to checkout if came from there, else menu
    if (user) {
      const returnTo = sessionStorage.getItem('checkout_return');
      sessionStorage.removeItem('checkout_return');
      navigate(returnTo === 'checkout' ? '/checkout' : '/menu');
      return null;
    }
    return <LoginPage />;
  }

  // Order tracking — minimal header, no auth required
  const isOrderStatus = path.startsWith('/order/') || path === '/track';

  return (
    <CartProvider>
      <AuthGate>
        <div className="flex flex-col min-h-screen">
          {isOrderStatus ? (
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/5">
              <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
                <button onClick={() => navigate('/')} className="text-white/60 hover:text-white text-sm transition-colors">
                  Inicio
                </button>
                <span className="text-white/20">|</span>
                <span className="text-white/80 text-sm font-medium">Acompanhar Pedido</span>
              </div>
            </header>
          ) : (
            <Header />
          )}

          <main className="flex-1">
            {path === '/' && <HomePage />}
            {path === '/menu' && <MenuPage />}
            {path === '/checkout' && <CheckoutPage />}
            {path === '/orders' && <MyOrdersPage />}
            {path === '/profile' && <ProfilePage />}
            {(path === '/track' || path.startsWith('/order/')) && <OrderStatusPage />}

            {/* 404 */}
            {![
              '/', '/menu', '/checkout', '/track', '/orders', '/profile',
            ].includes(path) && !path.startsWith('/order/') && (
              <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white text-5xl font-bold mb-3">404</p>
                  <p className="text-white/50 mb-6">Pagina nao encontrada</p>
                  <button onClick={() => navigate('/')} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-medium transition-all">
                    Voltar ao Inicio
                  </button>
                </div>
              </div>
            )}
          </main>

          <CartDrawer />
          {!isOrderStatus && <Footer />}
        </div>
      </AuthGate>
    </CartProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TenantProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </AuthProvider>
      </TenantProvider>
    </ErrorBoundary>
  );
}
