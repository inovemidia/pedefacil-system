import { useEffect, useState } from 'react';
import { BarChart3, DollarSign, ShoppingBag, TrendingUp, CreditCard, Smartphone, Wallet, Banknote, Loader2, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types';

type Period = 'today' | 'week' | 'month' | 'custom';

const PAY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  pix:         { label: 'PIX',      icon: Smartphone, color: 'text-green-400' },
  credit_card: { label: 'Crédito',  icon: CreditCard, color: 'text-blue-400' },
  debit_card:  { label: 'Débito',   icon: Wallet,     color: 'text-cyan-400' },
  cash:        { label: 'Dinheiro', icon: Banknote,   color: 'text-yellow-400' },
};

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const filteredOrders = orders.filter(o => {
    const d = new Date(o.created_at);
    if (period === 'today') {
      const t = new Date(); t.setHours(0,0,0,0);
      return d >= t;
    }
    if (period === 'week') {
      const t = new Date(); t.setDate(t.getDate() - 7);
      return d >= t;
    }
    if (period === 'month') {
      const t = new Date(); t.setDate(1); t.setHours(0,0,0,0);
      return d >= t;
    }
    if (period === 'custom' && dateFrom && dateTo) {
      return d >= new Date(dateFrom) && d <= new Date(dateTo + 'T23:59:59');
    }
    return true;
  });

  const paid = filteredOrders.filter(o => o.payment_status === 'paid');
  const totalRevenue = paid.reduce((s, o) => s + Number(o.total), 0);
  const totalDelivery = paid.filter(o => o.order_type === 'delivery').length;
  const avgTicket = paid.length > 0 ? totalRevenue / paid.length : 0;
  const cancelled = filteredOrders.filter(o => o.status === 'cancelled').length;

  // Payment breakdown
  const payBreakdown = Object.keys(PAY_LABELS).map(method => {
    const filtered = paid.filter(o => o.payment_method === method);
    return { method, count: filtered.length, total: filtered.reduce((s, o) => s + Number(o.total), 0) };
  });

  // Daily breakdown for chart
  const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 30;
  const dailyData = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (Math.min(days, 30) - 1 - i));
    const key = d.toISOString().split('T')[0];
    const dayPaid = paid.filter(o => o.created_at?.startsWith(key));
    return {
      date: key,
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      revenue: dayPaid.reduce((s, o) => s + Number(o.total), 0),
      count: dayPaid.length,
    };
  });

  const maxRevenue = Math.max(...dailyData.map(d => d.revenue), 1);

  // Top products
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  paid.forEach(o => (o.order_items ?? []).forEach((item: any) => {
    if (!productMap[item.product_name]) productMap[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 };
    productMap[item.product_name].qty += item.quantity;
    productMap[item.product_name].revenue += item.quantity * Number(item.unit_price);
  }));
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const exportSales = () => {
    const rows = [
      ['#', 'Data', 'Cliente', 'Tipo', 'Pagamento', 'Subtotal', 'Entrega', 'Desconto', 'Total', 'Status'],
      ...filteredOrders.map(o => [
        String(o.order_number),
        new Date(o.created_at).toLocaleString('pt-BR'),
        o.customer_name,
        o.order_type === 'delivery' ? 'Entrega' : 'Retirada',
        PAY_LABELS[o.payment_method]?.label ?? o.payment_method,
        Number(o.subtotal).toFixed(2),
        Number(o.delivery_fee).toFixed(2),
        Number(o.discount).toFixed(2),
        Number(o.total).toFixed(2),
        o.status,
      ]),
    ];
    exportCSV(rows, `relatorio_pedidos_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportProducts = () => {
    const rows = [['Produto', 'Quantidade', 'Receita (R$)'], ...topProducts.map(p => [p.name, String(p.qty), p.revenue.toFixed(2)])];
    exportCSV(rows, `relatorio_produtos_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-screen-xl">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-[#111] border border-white/5 rounded-xl p-1 gap-1">
          {(['today','week','month','custom'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p ? 'bg-red-600 text-white' : 'text-white/40 hover:text-white'}`}>
              {{ today: 'Hoje', week: '7 dias', month: 'Mês', custom: 'Personalizado' }[p]}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500" />
            <span className="text-white/30 text-xs">até</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500" />
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={exportSales}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl text-xs font-medium transition-all">
            <Download className="w-3.5 h-3.5" /> Pedidos CSV
          </button>
          <button onClick={exportProducts}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl text-xs font-medium transition-all">
            <Download className="w-3.5 h-3.5" /> Produtos CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Receita', value: `R$ ${totalRevenue.toFixed(2).replace('.',',')}`, icon: DollarSign, color: 'text-green-400' },
          { label: 'Pedidos Pagos', value: paid.length, icon: ShoppingBag, color: 'text-blue-400' },
          { label: 'Ticket Médio', value: `R$ ${avgTicket.toFixed(2).replace('.',',')}`, icon: TrendingUp, color: 'text-yellow-400' },
          { label: 'Entregas', value: totalDelivery, icon: BarChart3, color: 'text-orange-400' },
          { label: 'Cancelados', value: cancelled, icon: BarChart3, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-white/5 rounded-2xl p-4">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className="text-white font-bold text-xl">{s.value}</p>
            <p className="text-white/35 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      {days > 1 && (
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold text-sm">Receita por Dia</h3>
            <span className="text-white/30 text-xs">R$ {totalRevenue.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex items-end gap-1 h-32">
            {dailyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
                <div className="w-full relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-white/10 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {d.label}: R$ {d.revenue.toFixed(0)} ({d.count} ped.)
                  </div>
                  <div className="w-full bg-red-500/15 hover:bg-red-500/25 rounded-t-sm transition-colors"
                    style={{ height: `${Math.max((d.revenue / maxRevenue) * 112, 4)}px` }} />
                </div>
                {(dailyData.length <= 14) && (
                  <span className="text-white/20 text-[9px] truncate w-full text-center">{d.label}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment + products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment breakdown */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Formas de Pagamento</h3>
          <div className="space-y-4">
            {payBreakdown.map(({ method, count, total }) => {
              const cfg = PAY_LABELS[method];
              const Icon = cfg.icon;
              const pct = paid.length > 0 ? (count / paid.length) * 100 : 0;
              return (
                <div key={method}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                      <span className="text-white/70 text-sm">{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-white/40">{count} ped.</span>
                      <span className="text-white font-medium">R$ {total.toFixed(2).replace('.', ',')}</span>
                      <span className="text-white/25 text-xs w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: cfg.color.includes('green') ? '#22c55e' : cfg.color.includes('blue') ? '#3b82f6' : cfg.color.includes('cyan') ? '#06b6d4' : '#eab308' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Produtos Mais Vendidos</h3>
          <div className="space-y-2">
            {topProducts.length === 0 ? (
              <p className="text-white/25 text-sm text-center py-6">Sem dados no período</p>
            ) : topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-white/20 text-xs font-bold w-5 flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-white/80 text-sm truncate">{p.name}</span>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <span className="text-white/40 text-xs">{p.qty} un.</span>
                      <span className="text-white text-sm font-medium">R$ {p.revenue.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600/50 rounded-full"
                      style={{ width: `${(p.revenue / topProducts[0].revenue) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-white font-semibold text-sm">Pedidos ({filteredOrders.length})</h3>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['#','Data','Cliente','Tipo','Pagamento','Total','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-white/25 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.slice(0, 100).map(o => (
                <tr key={o.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-2.5 text-white font-bold text-sm">#{o.order_number}</td>
                  <td className="px-4 py-2.5 text-white/40 text-xs whitespace-nowrap">
                    {new Date(o.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                  </td>
                  <td className="px-4 py-2.5 text-white/70 text-sm">{o.customer_name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs ${o.order_type === 'delivery' ? 'text-blue-400' : 'text-white/40'}`}>
                      {o.order_type === 'delivery' ? 'Entrega' : 'Retirada'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs ${PAY_LABELS[o.payment_method]?.color ?? 'text-white/40'}`}>
                      {PAY_LABELS[o.payment_method]?.label ?? o.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-white font-medium text-sm whitespace-nowrap">
                    R$ {Number(o.total).toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs ${o.payment_status === 'paid' ? 'text-green-400' : o.payment_status === 'failed' ? 'text-red-400' : 'text-white/30'}`}>
                      {o.payment_status === 'paid' ? 'Pago' : o.payment_status === 'failed' ? 'Falhou' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
