import { ReactNode, useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingBag, Package, Tag, LogOut, Menu, ExternalLink,
  Bell, Monitor, Users, BarChart3, Truck, Warehouse, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, navigate } from '../../hooks/useRouter';
import { supabase } from '../../lib/supabase';

const navGroups = [
  {
    label: 'Operação',
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Pedidos', path: '/admin/orders', icon: ShoppingBag, badge: true },
      { label: 'PDV / Caixa', path: '/admin/pdv', icon: Monitor },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Produtos', path: '/admin/products', icon: Package },
      { label: 'Estoque', path: '/admin/stock', icon: Warehouse },
      { label: 'Cupons', path: '/admin/coupons', icon: Tag },
      { label: 'Delivery', path: '/admin/delivery', icon: Truck },
    ],
  },
  {
    label: 'Análise',
    items: [
      { label: 'Clientes', path: '/admin/customers', icon: Users },
      { label: 'Relatórios', path: '/admin/reports', icon: BarChart3 },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const { signOut, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['received', 'preparing']);
      setPendingCount(count ?? 0);
    };
    fetchPending();
    const channel = supabase
      .channel('layout-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchPending)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin');
  };

  const currentLabel = navGroups.flatMap(g => g.items).find(n => n.path === path)?.label ?? 'Admin';

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/40 flex-shrink-0">
          <span className="text-white font-black text-xs">JN</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-bold text-sm leading-tight">Japa Nara</p>
          <p className="text-white/35 text-xs truncate">{user?.email}</p>
        </div>
        <button
          className="lg:hidden text-white/30 hover:text-white p-1 transition-colors"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-white/20 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = path === item.path || (item.path !== '/admin/dashboard' && path.startsWith(item.path));
                const showBadge = item.badge && pendingCount > 0;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {showBadge && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center ${
                        active ? 'bg-white/20 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 space-y-0.5 border-t border-white/5">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/35 hover:text-white hover:bg-white/5 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          Ver site
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/35 hover:text-red-400 hover:bg-red-900/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-[#080808] min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-[#0d0d0d] border-r border-white/5 fixed top-0 bottom-0 left-0">
        <NavContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/75 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-60 bg-[#0d0d0d] z-50 lg:hidden shadow-2xl">
            <NavContent />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="bg-[#0d0d0d] border-b border-white/5 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-semibold text-sm">{currentLabel}</h1>
              <p className="text-white/25 text-xs hidden sm:block">Japa Nara · Painel Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                onClick={() => navigate('/admin/orders')}
                className="flex items-center gap-2 bg-red-600/15 hover:bg-red-600/25 border border-red-600/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              >
                <Bell className="w-3.5 h-3.5 animate-pulse" />
                {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
