import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../hooks/useRouter';
import { Package, Clock, Truck, CheckCircle, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import type { Order } from '../types';

const STATUS_COLORS: Record<string, string> = {
  received: 'bg-blue-500/20 text-blue-400 border-blue-800/30',
  preparing: 'bg-yellow-500/20 text-yellow-400 border-yellow-800/30',
  out_for_delivery: 'bg-orange-500/20 text-orange-400 border-orange-800/30',
  delivered: 'bg-green-500/20 text-green-400 border-green-800/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-800/30',
};

const STATUS_LABELS: Record<string, string> = {
  received: 'Recebido',
  preparing: 'Preparando',
  out_for_delivery: 'Em entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_ICONS: Record<string, any> = {
  received: Package,
  preparing: Package,
  out_for_delivery: Truck,
  delivered: CheckCircle,
  cancelled: AlertCircle,
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-500/10 text-green-400 border-green-800/30',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-800/30',
  failed: 'bg-red-500/10 text-red-400 border-red-800/30',
  refunded: 'bg-orange-500/10 text-orange-400 border-orange-800/30',
};

const PAYMENT_LABELS: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Recusado',
  refunded: 'Estornado',
};

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setOrders(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    fetchOrders();

    if (user) {
      const channel = supabase
        .channel(`user-orders-${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        }, fetchOrders)
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="bg-black min-h-screen pt-24 pb-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-black min-h-screen pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Meus Pedidos</h1>
          <p className="text-white/50">Acompanhe o status dos seus pedidos em tempo real</p>
        </div>

        {/* Orders list */}
        {orders.length === 0 ? (
          <div className="bg-[#111] border border-white/10 rounded-2xl p-8 text-center">
            <Package className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 font-medium">Nenhum pedido realizado</p>
            <p className="text-white/30 text-sm mt-1">Faca seu primeiro pedido para acompanha-lo aqui</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              Voltar ao Menu
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const StatusIcon = STATUS_ICONS[order.status] || Package;
              const isExpanded = expandedId === order.id;

              return (
                <div key={order.id} className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
                  {/* Order header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="w-full text-left p-4 hover:bg-white/2 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center flex-shrink-0">
                          <StatusIcon className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">Pedido #{order.order_number}</p>
                          <p className="text-white/40 text-sm">
                            {new Date(order.created_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status] ?? ''}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${PAYMENT_STATUS_COLORS[order.payment_status] ?? 'bg-white/5 text-white/40 border-white/10'}`}>
                          {PAYMENT_LABELS[order.payment_status] ?? order.payment_status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold text-lg">R$ {Number(order.total).toFixed(2).replace('.', ',')}</p>
                      <ChevronRight className={`w-5 h-5 text-white/30 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-white/5 p-4 space-y-4">
                      {/* Status timeline */}
                      <div className="space-y-3">
                        <p className="text-white/60 text-xs font-medium">Status do Pedido</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className="text-white/70">
                            {['received', 'preparing', 'out_for_delivery', 'delivered'].includes(order.status)
                              ? 'Em progresso'
                              : order.status === 'cancelled'
                              ? 'Cancelado'
                              : 'Pendente'}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div>
                        <p className="text-white/60 text-xs font-medium mb-2">Itens do Pedido</p>
                        <div className="space-y-1.5 bg-white/5 rounded-xl p-3">
                          {order.order_items?.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-white/70">{item.quantity}x {item.product_name}</span>
                              <span className="text-white">R$ {(item.unit_price * item.quantity).toFixed(2).replace('.', ',')}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Order details */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="bg-white/5 rounded-lg p-2.5">
                          <p className="text-white/40 mb-0.5">Tipo</p>
                          <p className="text-white font-medium text-sm">{order.order_type === 'delivery' ? 'Entrega' : 'Retirada'}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2.5">
                          <p className="text-white/40 mb-0.5">Pagamento</p>
                          <p className="text-white font-medium text-sm capitalize">
                            {order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'credit_card' ? 'Credito' : 'Debito'}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2.5">
                          <p className="text-white/40 mb-0.5">Entrega</p>
                          <p className="text-white font-medium text-sm">R$ {Number(order.delivery_fee).toFixed(2).replace('.', ',')}</p>
                        </div>
                      </div>

                      {/* Delivery address */}
                      {order.order_type === 'delivery' && order.address && (
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-white/40 text-xs mb-1">Endereco de Entrega</p>
                          <p className="text-white/70 text-sm">
                            {order.address}, {order.neighborhood_name}
                            {order.complement && ` — ${order.complement}`}
                          </p>
                        </div>
                      )}

                      {/* Summary */}
                      <div className="border-t border-white/5 pt-3">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-white/50">Subtotal</span>
                          <span className="text-white">R$ {(Number(order.total) - Number(order.delivery_fee)).toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-white/50">Entrega</span>
                          <span className="text-white">R$ {Number(order.delivery_fee).toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-white/5 pt-2">
                          <span className="text-white font-medium">Total</span>
                          <span className="text-red-400 font-bold">R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
