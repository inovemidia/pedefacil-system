import { useEffect, useState, useRef } from 'react';
import {
  TrendingUp, DollarSign, Clock,
  ArrowRight, Truck, Package, BarChart2, CreditCard, Smartphone,
  Wallet, Banknote
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types';
import { navigate } from '../../hooks/useRouter';

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  received:        { label: 'Recebidos',   color: 'text-blue-400',   dot: 'bg-blue-400' },
  preparing:       { label: 'Preparando',  color: 'text-yellow-400', dot: 'bg-yellow-400' },
  out_for_delivery:{ label: 'Em Entrega',  color: 'text-orange-400', dot: 'bg-orange-400' },
  delivered:       { label: 'Entregues',   color: 'text-green-400',  dot: 'bg-green-400' },
  cancelled:       { label: 'Cancelados',  color: 'text-red-400',    dot: 'bg-red-400' },
};

const PAY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  pix:         { label: 'PIX',         icon: Smartphone, color: 'text-green-400' },
  credit_card: { label: 'Crédito',     icon: CreditCard, color: 'text-blue-400' },
  debit_card:  { label: 'Débito',      icon: Wallet,     color: 'text-cyan-400' },
  cash:        { label: 'Dinheiro',    icon: Banknote,   color: 'text-yellow-400' },
};

function MiniBarChart({ data, color = '#ef4444' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-12">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all"
          style={{ height: `${Math.max((v / max) * 100, 4)}%`, background: color, opacity: i === data.length - 1 ? 1 : 0.4 + (i / data.length) * 0.4 }}
        />
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, chart }: {
  label: string; value: string; sub: string; icon: any; color: string; chart?: number[];
}) {
  return (
    <div className="bg-[#111] border border-white/5 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {chart && <MiniBarChart data={chart} color={color.includes('green') ? '#22c55e' : color.includes('blue') ? '#3b82f6' : color.includes('yellow') ? '#eab308' : '#ef4444'} />}
      </div>
      <div>
        <p className="text-white font-bold text-2xl leading-none">{value}</p>
        <p className="text-white/40 text-xs mt-1">{label}</p>
        <p className="text-white/25 text-xs mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const prevCountRef = useRef(0);

  const playSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
    } catch { /* no audio */ }
  };

  const fetchOrders = async () => {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: false });
    const list = data ?? [];
    if (prevCountRef.current > 0 && list.length > prevCountRef.current) playSound();
    prevCountRef.current = list.length;
    setOrders(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel('dash-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.created_at?.startsWith(today));
  const todayPaid = todayOrders.filter(o => o.payment_status === 'paid');
  const todayRevenue = todayPaid.reduce((s, o) => s + Number(o.total), 0);
  const activeOrders = orders.filter(o => ['received', 'preparing', 'out_for_delivery'].includes(o.status));
  const avgTicket = todayPaid.length > 0 ? todayRevenue / todayPaid.length : 0;

  // Month stats
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const monthOrders = orders.filter(o => new Date(o.created_at) >= monthStart);
  const monthPaid = monthOrders.filter(o => o.payment_status === 'paid');
  const monthRevenue = monthPaid.reduce((s, o) => s + Number(o.total), 0);

  // Last 7 days chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    return orders.filter(o => o.created_at?.startsWith(key) && o.payment_status === 'paid')
      .reduce((s, o) => s + Number(o.total), 0);
  });

  // Last 30 days chart
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().split('T')[0];
    return orders.filter(o => o.created_at?.startsWith(key) && o.payment_status === 'paid')
      .reduce((s, o) => s + Number(o.total), 0);
  });

  // Payment method breakdown
  const payBreakdown = Object.keys(PAY_LABELS).map(method => {
    const filtered = todayOrders.filter(o => o.payment_method === method && o.payment_status === 'paid');
    return { method, count: filtered.length, total: filtered.reduce((s, o) => s + Number(o.total), 0) };
  });

  // Top products today
  const productCounts: Record<string, { name: string; qty: number; total: number }> = {};
  todayPaid.forEach(o => {
    (o.order_items ?? []).forEach((item: any) => {
      if (!productCounts[item.product_name]) productCounts[item.product_name] = { name: item.product_name, qty: 0, total: 0 };
      productCounts[item.product_name].qty += item.quantity;
      productCounts[item.product_name].total += item.quantity * Number(item.unit_price);
    });
  });
  const topProducts = Object.values(productCounts).sort((a, b) => b.qty - a.qty).slice(0, 5);

  // Recent orders
  const recentOrders = orders.slice(0, 8);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <div key={i} className="bg-[#111] border border-white/5 rounded-2xl h-32 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-screen-2xl">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Vendas Hoje" value={`R$ ${todayRevenue.toFixed(2).replace('.', ',')}`} sub={`${todayPaid.length} pedidos pagos`} icon={DollarSign} color="text-green-400" chart={last7} />
        <StatCard label="Vendas do Mês" value={`R$ ${monthRevenue.toFixed(2).replace('.', ',')}`} sub={`${monthPaid.length} pedidos`} icon={TrendingUp} color="text-blue-400" chart={last30} />
        <StatCard label="Ticket Médio" value={`R$ ${avgTicket.toFixed(2).replace('.', ',')}`} sub="hoje" icon={BarChart2} color="text-yellow-400" />
        <StatCard label="Em Andamento" value={activeOrders.length.toString()} sub={`${todayOrders.length} pedidos hoje`} icon={Clock} color="text-red-400" />
      </div>

      {/* Status pipeline */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = orders.filter(o => o.status === status).length;
          return (
            <button key={status} onClick={() => navigate('/admin/orders')}
              className="bg-[#111] border border-white/5 hover:border-white/10 rounded-xl p-3 flex flex-col gap-2 transition-all hover:scale-[1.02] text-left">
              <div className="flex items-center justify-between">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className={`font-bold text-2xl ${cfg.color}`}>{count}</span>
              </div>
              <p className={`text-xs font-medium ${cfg.color} opacity-70`}>{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Last 7 days chart */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/40 text-xs">Últimos 7 dias</p>
              <p className="text-white font-bold text-xl mt-0.5">R$ {last7.reduce((a,b)=>a+b,0).toFixed(2).replace('.', ',')}</p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex items-end gap-1 h-20">
            {last7.map((v, i) => {
              const max = Math.max(...last7, 1);
              const d = new Date(); d.setDate(d.getDate() - (6 - i));
              const day = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()];
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm bg-green-500/20 hover:bg-green-500/40 transition-colors relative group"
                    style={{ height: `${Math.max((v / max) * 64, 4)}px` }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none border border-white/10">
                      R$ {v.toFixed(0)}
                    </div>
                  </div>
                  <span className="text-white/25 text-[9px]">{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-white/40" />
            <p className="text-white font-semibold text-sm">Pagamentos Hoje</p>
          </div>
          <div className="space-y-3">
            {payBreakdown.map(({ method, count, total }) => {
              const cfg = PAY_LABELS[method];
              const Icon = cfg.icon;
              const pct = todayPaid.length > 0 ? (count / todayPaid.length) * 100 : 0;
              return (
                <div key={method}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      <span className="text-white/70 text-sm">{cfg.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white text-sm font-medium">R$ {total.toFixed(2).replace('.', ',')}</span>
                      <span className="text-white/30 text-xs ml-2">({count})</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-white/20 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {todayPaid.length === 0 && <p className="text-white/25 text-sm text-center py-4">Sem pagamentos hoje</p>}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-white/40" />
            <p className="text-white font-semibold text-sm">Mais Vendidos Hoje</p>
          </div>
          <div className="space-y-2.5">
            {topProducts.length === 0 ? (
              <p className="text-white/25 text-sm text-center py-4">Sem dados hoje</p>
            ) : topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-white/20 text-xs font-bold w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm truncate">{p.name}</p>
                  <p className="text-white/30 text-xs">{p.qty} unid.</p>
                </div>
                <span className="text-white text-sm font-medium flex-shrink-0">R$ {p.total.toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active orders quick panel */}
      {activeOrders.length > 0 && (
        <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <h2 className="text-white font-semibold text-sm">Pedidos Ativos</h2>
              <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded-full">{activeOrders.length}</span>
            </div>
            <button onClick={() => navigate('/admin/orders')} className="text-white/35 hover:text-red-400 text-xs transition-colors flex items-center gap-1">
              Gerenciar <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {activeOrders.slice(0, 6).map(order => (
              <div key={order.id} className="px-5 py-3 flex items-center gap-4 hover:bg-white/2 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">#{order.order_number}</span>
                    <span className="text-white/60 text-sm truncate">{order.customer_name}</span>
                    {order.order_type === 'delivery' && <Truck className="w-3 h-3 text-white/25 flex-shrink-0" />}
                  </div>
                  <p className="text-white/30 text-xs mt-0.5">{order.customer_phone}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-white font-medium text-sm">R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_CONFIG[order.status]?.color ?? ''} bg-white/5`}>
                    {STATUS_CONFIG[order.status]?.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders table */}
      <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <h2 className="text-white font-semibold text-sm">Últimos Pedidos (30 dias)</h2>
          <button onClick={() => navigate('/admin/orders')} className="text-white/35 hover:text-red-400 text-xs flex items-center gap-1 transition-colors">
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          {recentOrders.length === 0 ? (
            <div className="p-10 text-center text-white/25 text-sm">Nenhum pedido ainda</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['#', 'Cliente', 'Tipo', 'Pagamento', 'Total', 'Status', 'Hora'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-white/25 text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} className="border-b border-white/4 hover:bg-white/2 cursor-pointer transition-colors" onClick={() => navigate('/admin/orders')}>
                    <td className="px-4 py-3 text-white font-bold text-sm">#{order.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{order.customer_name}</p>
                      <p className="text-white/30 text-xs">{order.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${order.order_type === 'delivery' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-white/40'}`}>
                        {order.order_type === 'delivery' ? 'Entrega' : 'Retirada'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${PAY_LABELS[order.payment_method]?.color ?? 'text-white/40'}`}>
                        {PAY_LABELS[order.payment_method]?.label ?? order.payment_method}
                      </span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${order.payment_status === 'paid' ? 'bg-green-900/30 text-green-400' : order.payment_status === 'failed' ? 'bg-red-900/30 text-red-400' : 'bg-white/5 text-white/30'}`}>
                        {order.payment_status === 'paid' ? 'Pago' : order.payment_status === 'failed' ? 'Falhou' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium text-sm whitespace-nowrap">R$ {Number(order.total).toFixed(2).replace('.', ',')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${STATUS_CONFIG[order.status]?.color ?? ''}`}>
                        {STATUS_CONFIG[order.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/30 text-xs whitespace-nowrap">
                      {new Date(order.created_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
