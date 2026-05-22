import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Search, ChevronDown, CheckCircle, AlertCircle, Clock, Truck, Package,
  Phone, MapPin, Printer, X, CreditCard, UtensilsCrossed,
  XCircle, Store,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types';

// ── Configurações de status ────────────────────────────────────────────────

interface StatusCfg {
  label: string;
  color: string;
  bg: string;
  next?: string;
  nextLabel?: string;
  nextIcon?: any;
}

const DELIVERY_STATUS: Record<string, StatusCfg> = {
  received:         { label: 'Recebido',        color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/25',     next: 'preparing',        nextLabel: 'Confirmar & Preparar', nextIcon: UtensilsCrossed },
  preparing:        { label: 'Preparando',      color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/25', next: 'out_for_delivery', nextLabel: 'Saiu para Entrega',    nextIcon: Truck           },
  out_for_delivery: { label: 'Saiu p/ Entrega', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/25', next: 'delivered',        nextLabel: 'Confirmar Entrega',    nextIcon: CheckCircle     },
  delivered:        { label: 'Entregue',        color: 'text-green-400',  bg: 'bg-green-500/15 border-green-500/25'  },
  cancelled:        { label: 'Cancelado',       color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/25'      },
};

const PICKUP_STATUS: Record<string, StatusCfg> = {
  received:         { label: 'Recebido',          color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/25',    next: 'preparing',        nextLabel: 'Confirmar & Preparar',  nextIcon: UtensilsCrossed },
  preparing:        { label: 'Preparando',        color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/25', next: 'out_for_delivery', nextLabel: 'Pronto para Retirada',   nextIcon: Store           },
  out_for_delivery: { label: 'Pronto p/ Retirar', color: 'text-teal-400',   bg: 'bg-teal-500/15 border-teal-500/25',    next: 'delivered',        nextLabel: 'Confirmar Retirada',     nextIcon: CheckCircle     },
  delivered:        { label: 'Retirado',          color: 'text-green-400',  bg: 'bg-green-500/15 border-green-500/25'  },
  cancelled:        { label: 'Cancelado',         color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/25'      },
};

function getStatusMap(order: Order): Record<string, StatusCfg> {
  return order.order_type === 'pickup' ? PICKUP_STATUS : DELIVERY_STATUS;
}

function getCfg(order: Order): StatusCfg {
  return getStatusMap(order)[order.status] ?? DELIVERY_STATUS.received;
}

const DELIVERY_ICONS: Record<string, any> = {
  received: Package, preparing: UtensilsCrossed,
  out_for_delivery: Truck, delivered: CheckCircle, cancelled: XCircle,
};
const PICKUP_ICONS: Record<string, any> = {
  received: Package, preparing: UtensilsCrossed,
  out_for_delivery: Store, delivered: CheckCircle, cancelled: XCircle,
};

const PAYMENT_CFG: Record<string, { label: string; color: string }> = {
  paid:     { label: 'Pago',      color: 'text-green-400 bg-green-500/10 border-green-500/20'   },
  pending:  { label: 'Pendente',  color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  failed:   { label: 'Recusado',  color: 'text-red-400 bg-red-500/10 border-red-500/20'         },
  refunded: { label: 'Estornado', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
};

const FILTERS = [
  { value: 'active',           label: 'Ativos'       },
  { value: 'all',              label: 'Todos'        },
  { value: 'delivery',         label: 'Delivery'     },
  { value: 'pickup',           label: 'Retirada'     },
  { value: 'received',         label: 'Recebidos'    },
  { value: 'preparing',        label: 'Preparando'   },
  { value: 'out_for_delivery', label: 'Em Andamento' },
  { value: 'delivered',        label: 'Concluídos'   },
  { value: 'cancelled',        label: 'Cancelados'   },
];

// ── Utilitários ────────────────────────────────────────────────────────────

function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880,  ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
    osc.frequency.setValueAtTime(880,  ctx.currentTime + 0.24);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* sem áudio */ }
}

function buildWhatsAppMsg(order: Order, newStatus: string): string | null {
  const n = `#${order.order_number}`;
  switch (newStatus) {
    case 'preparing':
      return `Japa Nara\nRecebemos o pagamento do seu pedido ${n}.\nSeu pedido entrou em preparação.`;
    case 'out_for_delivery':
      return order.order_type === 'pickup'
        ? `Japa Nara\nSeu pedido ${n} está pronto para retirada.\nRetirada:\nAv. Paulo Siqueira, 2515 — Ortigueira/PR`
        : `Japa Nara\nSeu pedido ${n} saiu para entrega e chegará em breve.`;
    default:
      return null;
  }
}

// ── Componente ─────────────────────────────────────────────────────────────

export default function AdminOrders() {
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('active');
  const [search, setSearch]           = useState('');
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [updating, setUpdating]       = useState<string | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  // Ref para detectar novos pedidos sem causar re-render
  const prevIdsRef = useRef<Set<string>>(new Set());
  // Ref espelho de orders para acesso dentro de callbacks (evita closure stale)
  const ordersRef  = useRef<Order[]>([]);

  // ── fetchOrders ──────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    console.log('[AdminOrders] fetchOrders iniciando...');

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AdminOrders] Erro Supabase:', error.code, error.message);
      setLoading(false);
      return;
    }

    const fetched: Order[] = Array.isArray(data) ? (data as Order[]) : [];
    console.log(`[AdminOrders] ${fetched.length} pedidos carregados`);

    // Detectar novos pedidos
    const fetchedIds = new Set(fetched.map(o => o.id));

    if (prevIdsRef.current.size > 0) {
      const incoming: string[] = [];
      fetchedIds.forEach(id => {
        if (!prevIdsRef.current.has(id)) incoming.push(id);
      });

      if (incoming.length > 0) {
        console.log(`[AdminOrders] ${incoming.length} novo(s) pedido(s) detectado(s):`, incoming);
        playNewOrderSound();
        setNewOrderIds(prev => new Set([...prev, ...incoming]));
        setExpandedId(incoming[0]);

        // Remove highlight após 8 s
        setTimeout(() => {
          setNewOrderIds(prev => {
            const next = new Set(prev);
            incoming.forEach(id => next.delete(id));
            return next;
          });
        }, 8_000);
      }
    }

    prevIdsRef.current = fetchedIds;
    ordersRef.current  = fetched;
    setOrders(fetched);
    setLoading(false);
  }, []);

  // ── Realtime + fallback polling ──────────────────────────────────────────

  useEffect(() => {
    fetchOrders();

    // Canal com nome único por sessão para evitar conflito em múltiplas abas
    const channelName = `admin-orders-${Date.now()}`;

    const channel = supabase
      .channel(channelName, { config: { broadcast: { self: true } } })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        payload => {
          console.log('[AdminOrders] INSERT recebido:', payload);
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        payload => {
          console.log('[AdminOrders] UPDATE recebido:', payload);
          fetchOrders();
        }
      )
      .subscribe(status => {
        console.log('[AdminOrders] Realtime status:', status);
        // Se canal for fechado/com erro, força re-fetch imediato
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[AdminOrders] Canal com problema, forçando re-fetch');
          fetchOrders();
        }
      });

    // Fallback: polling a cada 10 s para garantir consistência
    const pollInterval = setInterval(fetchOrders, 10_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchOrders]);

  // ── updateStatus ─────────────────────────────────────────────────────────

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('[AdminOrders] updateStatus erro:', error.message);
    }

    await fetchOrders();
    setUpdating(null);

    // WhatsApp automático
    const order = ordersRef.current.find(o => o.id === orderId);
    if (order?.customer_phone) {
      const msg = buildWhatsAppMsg(order, newStatus);
      if (msg) {
        const clean = order.customer_phone.replace(/\D/g, '');
        const phone = clean.startsWith('55') ? clean : `55${clean}`;
        window.open(
          `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
          '_blank'
        );
      }
    }
  };

  // ── printOrder ────────────────────────────────────────────────────────────

  const printOrder = (order: Order) => {
    const win = window.open('', '_blank', 'width=420,height=700');
    if (!win) return;

    const fmt = (v: number) => v.toFixed(2).replace('.', ',');
    const tot  = Number(order.total);
    const cf   = Number((order as any).change_for  ?? 0);
    const ca   = cf > tot ? cf - tot : Number((order as any).change_amount ?? 0);

    const payMethod = order.payment_method;
    const payLine =
      payMethod === 'pix'         ? 'PIX' :
      payMethod === 'credit_card' ? 'Cartão de Crédito' :
      payMethod === 'debit_card'  ? 'Cartão de Débito'  : 'Dinheiro';

    const cashBlock = payMethod === 'cash' ? `
      <div class="pay-block">
        <div class="pay-row"><span>Total</span><span>R$ ${fmt(tot)}</span></div>
        <div class="pay-row"><span>Recebido</span><span>R$ ${fmt(cf)}</span></div>
        <div class="pay-row change"><span>Troco</span><span>R$ ${fmt(ca)}</span></div>
      </div>` : '';

    const pixBlock = payMethod === 'pix' ? `
      <div class="pix-badge">PAGO VIA PIX</div>` : '';

    const items = (order.order_items ?? []).map(i => `
      <tr>
        <td class="qty">${i.quantity}x</td>
        <td class="name">${i.product_name}</td>
        <td class="price">R$ ${fmt(Number(i.unit_price) * i.quantity)}</td>
      </tr>`).join('');

    const typeLabel  = order.order_type === 'delivery' ? 'DELIVERY' : 'RETIRADA NO LOCAL';
    const typeCls    = order.order_type === 'delivery' ? 'type-delivery' : 'type-pickup';

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Pedido #${order.order_number}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:'Courier New',Courier,monospace;
      font-size:13px;
      color:#111;
      background:#fff;
      padding:12px 14px;
      max-width:320px;
    }
    /* Header */
    .logo{text-align:center;font-size:18px;font-weight:900;letter-spacing:2px;margin-bottom:2px}
    .sub{text-align:center;font-size:10px;color:#555;margin-bottom:10px}
    /* Dividers */
    .dashed{border:none;border-top:1px dashed #888;margin:8px 0}
    .solid {border:none;border-top:2px solid #111;margin:8px 0}
    /* Type badge */
    .type-badge{
      text-align:center;font-weight:900;font-size:15px;
      padding:6px 4px;margin:8px 0;
      border:2px solid #111;letter-spacing:1px;
    }
    .type-delivery{border-color:#111}
    .type-pickup  {border-color:#111;background:#f0f0f0}
    /* Order meta */
    .meta{font-size:11px;color:#444;margin-bottom:4px}
    .meta b{color:#111}
    /* Items table */
    table{width:100%;border-collapse:collapse;margin:4px 0}
    td{padding:3px 2px;vertical-align:top}
    td.qty  {width:24px;font-weight:700}
    td.name {width:auto}
    td.price{width:72px;text-align:right;font-weight:600;white-space:nowrap}
    /* Totals */
    .totals-row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}
    .totals-row.disc{color:#444}
    .totals-row.grand{font-weight:900;font-size:16px;padding:5px 0}
    /* Payment */
    .pay-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#555;margin-top:6px;margin-bottom:2px}
    .pay-method{font-weight:700;font-size:14px;margin-bottom:4px}
    .pay-block{border:1px solid #ddd;border-radius:4px;overflow:hidden;margin-top:4px}
    .pay-row{display:flex;justify-content:space-between;padding:4px 8px;font-size:13px;border-bottom:1px solid #eee}
    .pay-row:last-child{border-bottom:none}
    .pay-row.change{font-weight:900;font-size:15px;background:#fffbe6;border-top:1px dashed #ccc}
    /* PIX badge */
    .pix-badge{
      background:#e6f7f0;border:1px solid #27ae60;
      color:#27ae60;font-weight:900;font-size:13px;
      text-align:center;padding:6px;border-radius:4px;margin-top:4px;
      letter-spacing:1px;
    }
    /* Notes */
    .notes{font-size:11px;color:#333;font-style:italic;margin-top:4px}
    /* Footer */
    .footer{text-align:center;font-size:10px;color:#888;margin-top:10px}
    @media print{
      body{padding:4px 6px}
      @page{margin:4mm}
    }
  </style>
</head>
<body>
  <div class="logo">JAPA NARA</div>
  <div class="sub">Culinária Japonesa</div>

  <hr class="solid"/>

  <div class="type-badge ${typeCls}">${typeLabel}</div>
  <div class="meta"><b>Pedido #${order.order_number}</b></div>
  <div class="meta">${new Date(order.created_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>

  <hr class="dashed"/>

  <div class="meta"><b>${order.customer_name}</b></div>
  ${order.customer_phone ? `<div class="meta">${order.customer_phone}</div>` : ''}
  ${order.order_type === 'delivery' && order.address
    ? `<div class="meta">${order.address}${order.complement ? ', ' + order.complement : ''}${order.neighborhood_name ? ' — ' + order.neighborhood_name : ''}</div>`
    : ''}

  <hr class="dashed"/>

  <table>
    <tbody>${items}</tbody>
  </table>

  <hr class="dashed"/>

  ${Number(order.delivery_fee) > 0
    ? `<div class="totals-row disc"><span>Entrega</span><span>R$ ${fmt(Number(order.delivery_fee))}</span></div>`
    : ''}
  ${Number(order.discount) > 0
    ? `<div class="totals-row disc"><span>Desconto</span><span>-R$ ${fmt(Number(order.discount))}</span></div>`
    : ''}
  <div class="totals-row grand"><span>TOTAL</span><span>R$ ${fmt(tot)}</span></div>

  <hr class="dashed"/>

  <div class="pay-label">Forma de Pagamento</div>
  <div class="pay-method">${payLine}</div>
  ${cashBlock}
  ${pixBlock}

  ${order.notes ? `<hr class="dashed"/><div class="notes">Obs: ${order.notes}</div>` : ''}

  <hr class="dashed"/>
  <div class="footer">Obrigado pela preferência!</div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  // ── Filtros ───────────────────────────────────────────────────────────────

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filtered = safeOrders.filter(o => {
    const matchesFilter =
      filter === 'all'              ? true :
      filter === 'active'           ? ['received', 'preparing', 'out_for_delivery'].includes(o.status) :
      filter === 'delivery'         ? o.order_type === 'delivery' :
      filter === 'pickup'           ? o.order_type === 'pickup'   :
      filter === 'delivered'        ? o.status === 'delivered'    :
      o.status === filter;

    const q = search.toLowerCase();
    const matchesSearch = !q
      || (o.customer_name  ?? '').toLowerCase().includes(q)
      || (o.customer_phone ?? '').includes(q)
      || String(o.order_number).includes(q);

    return matchesFilter && matchesSearch;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Abas de filtro */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map(f => {
          const count =
            f.value === 'all'          ? safeOrders.length :
            f.value === 'active'       ? safeOrders.filter(o => ['received','preparing','out_for_delivery'].includes(o.status)).length :
            f.value === 'delivery'     ? safeOrders.filter(o => o.order_type === 'delivery').length :
            f.value === 'pickup'       ? safeOrders.filter(o => o.order_type === 'pickup').length   :
            f.value === 'delivered'    ? safeOrders.filter(o => o.status === 'delivered').length     :
            safeOrders.filter(o => o.status === f.value).length;

          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                filter === f.value
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                  : 'bg-[#111] border border-white/8 text-white/55 hover:text-white hover:border-white/20'
              }`}
            >
              {f.label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                filter === f.value ? 'bg-white/20' : 'bg-white/8'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou número..."
          className="w-full bg-[#111] border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lista de pedidos */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-[#111] border border-white/5 rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111] border border-white/5 rounded-2xl p-12 text-center">
          <Package className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Nenhum pedido encontrado</p>
          {filter === 'active' && safeOrders.length > 0 && (
            <button
              onClick={() => setFilter('all')}
              className="mt-3 text-red-400 text-xs hover:text-red-300 transition-colors"
            >
              Ver todos os pedidos ({safeOrders.length})
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => {
            const cfg          = getCfg(order);
            const isPickup     = order.order_type === 'pickup';
            const StatusIcon   = (isPickup ? PICKUP_ICONS : DELIVERY_ICONS)[order.status] ?? Package;
            const isExpanded   = expandedId === order.id;
            const isNew        = newOrderIds.has(order.id);
            const isUpdating   = updating === order.id;
            const isReadyPickup = isPickup && order.status === 'out_for_delivery';
            const statusMap    = getStatusMap(order);

            return (
              <div
                key={order.id}
                className={`bg-[#111] border rounded-2xl overflow-hidden transition-all ${
                  isNew         ? 'border-blue-500/50 shadow-lg shadow-blue-900/20'    :
                  isReadyPickup ? 'border-teal-500/30 shadow-md shadow-teal-900/10'    :
                                  'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Banner: novo pedido */}
                {isNew && (
                  <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Novo pedido! · {isPickup ? 'Retirada no local' : 'Delivery'}
                  </div>
                )}

                {/* Banner: pronto para retirada */}
                {!isNew && isReadyPickup && (
                  <div className="bg-teal-600/30 border-b border-teal-500/30 text-teal-300 text-xs font-semibold px-3 py-1.5 flex items-center gap-2">
                    <Store className="w-3.5 h-3.5" />
                    Pronto para retirada — avisar cliente
                  </div>
                )}

                {/* Cabeçalho do card */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/2 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.bg}`}>
                    <StatusIcon className={cfg.color} style={{ width: 18, height: 18 }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-sm">#{order.order_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${
                        isPickup
                          ? 'bg-white/5 border-white/10 text-white/40'
                          : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      }`}>
                        {isPickup ? <Store className="w-2.5 h-2.5" /> : <Truck className="w-2.5 h-2.5" />}
                        {isPickup ? 'Retirada' : 'Delivery'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        PAYMENT_CFG[order.payment_status]?.color ?? 'text-white/40 bg-white/5 border-white/10'
                      }`}>
                        {PAYMENT_CFG[order.payment_status]?.label ?? order.payment_status}
                      </span>
                    </div>
                    <p className="text-white/60 text-sm mt-0.5 truncate">{order.customer_name}</p>
                    <p className="text-white/35 text-xs">{order.customer_phone}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-bold">
                      R$ {Number(order.total).toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-white/35 text-xs">
                      {new Date(order.created_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    <ChevronDown className={`w-4 h-4 text-white/25 mt-1 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Botão de próximo status (visível em novos pedidos ou expandido) */}
                {(isNew || isExpanded) && cfg.next && (
                  <div className={`px-4 pb-3 flex gap-2 ${isExpanded ? '' : 'border-t border-white/5 pt-3'}`}>
                    <button
                      onClick={() => updateStatus(order.id, cfg.next!)}
                      disabled={isUpdating}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                    >
                      {isUpdating ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Atualizando...
                        </>
                      ) : (
                        <>
                          {cfg.nextIcon && <cfg.nextIcon className="w-4 h-4" />}
                          {cfg.nextLabel}
                        </>
                      )}
                    </button>
                    {order.status !== 'cancelled' && (
                      <button
                        onClick={() => updateStatus(order.id, 'cancelled')}
                        disabled={isUpdating}
                        className="px-4 py-2.5 bg-white/5 hover:bg-red-900/20 border border-white/10 text-white/50 hover:text-red-400 rounded-xl text-sm transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Painel expandido */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-4 space-y-4">

                    {/* Pagamento */}
                    {order.payment_status === 'paid' && (
                      <div className="bg-green-900/20 border border-green-800/25 rounded-xl px-4 py-3 flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div>
                          <p className="text-green-400 font-medium text-sm">Pagamento Confirmado</p>
                          <p className="text-green-400/60 text-xs">
                            {order.payment_method === 'pix'         ? 'PIX'            :
                             order.payment_method === 'credit_card' ? 'Cartão Crédito' :
                             order.payment_method === 'debit_card'  ? 'Cartão Débito'  : 'Dinheiro'}
                          </p>
                        </div>
                      </div>
                    )}
                    {order.payment_status === 'pending' && order.payment_method === 'pix' && (
                      <div className="bg-yellow-900/20 border border-yellow-800/25 rounded-xl px-4 py-3 flex items-center gap-3">
                        <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0 animate-pulse" />
                        <p className="text-yellow-400 text-sm font-medium">Aguardando pagamento PIX</p>
                      </div>
                    )}
                    {order.payment_status === 'pending' && order.payment_method === 'cash' && (
                      <div className="bg-yellow-900/20 border border-yellow-800/25 rounded-xl px-4 py-3 flex items-center gap-3">
                        <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        <p className="text-yellow-400 text-sm font-medium">Pagamento em Dinheiro — cobrar na entrega</p>
                      </div>
                    )}
                    {order.payment_status === 'failed' && (
                      <div className="bg-red-900/20 border border-red-800/25 rounded-xl px-4 py-3 flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <p className="text-red-400 text-sm font-medium">Pagamento recusado</p>
                      </div>
                    )}

                    {/* Card de troco — dinheiro */}
                    {order.payment_method === 'cash' && (() => {
                      const nc = (order as any).needs_change as boolean;
                      const cf = Number((order as any).change_for  ?? 0);
                      const ca = Number((order as any).change_amount ?? 0);
                      const tot = Number(order.total);
                      const calcChange = cf > tot ? cf - tot : ca;
                      return (
                        <div className={`rounded-xl border overflow-hidden ${nc ? 'border-yellow-600/35 bg-yellow-900/15' : 'border-white/10 bg-white/4'}`}>
                          {/* Header */}
                          <div className={`px-4 py-2.5 flex items-center gap-2.5 ${nc ? 'bg-yellow-900/30 border-b border-yellow-600/25' : 'bg-white/5 border-b border-white/8'}`}>
                            <UtensilsCrossed className={`w-4 h-4 flex-shrink-0 ${nc ? 'text-yellow-400' : 'text-white/40'}`} />
                            <span className={`text-sm font-semibold ${nc ? 'text-yellow-300' : 'text-white/60'}`}>
                              Pagamento em Dinheiro
                            </span>
                          </div>
                          {/* Body */}
                          <div className="px-4 py-3 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-white/55">Total do pedido</span>
                              <span className="text-white font-medium">R$ {tot.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-white/55">Precisa de troco</span>
                              <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${nc ? 'bg-yellow-500/15 text-yellow-400' : 'bg-green-500/15 text-green-400'}`}>
                                {nc ? 'Sim' : 'Não — valor exato'}
                              </span>
                            </div>
                            {nc && (
                              <>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-white/55">Troco para</span>
                                  <span className="text-white font-medium">R$ {cf.toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-yellow-600/25 pt-2 mt-1">
                                  <span className="text-yellow-300 font-bold text-sm">Levar troco</span>
                                  <span className="text-yellow-300 font-bold text-lg">R$ {calcChange.toFixed(2).replace('.', ',')}</span>
                                </div>
                              </>
                            )}
                            {!nc && (
                              <p className="text-white/35 text-xs">Cliente informou que não precisa de troco.</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Cliente / tipo de pedido */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-white/40 text-xs mb-1.5 flex items-center gap-1.5">
                          <Phone className="w-3 h-3" /> Cliente
                        </p>
                        <p className="text-white font-medium text-sm">{order.customer_name}</p>
                        <p className="text-white/60 text-sm">{order.customer_phone}</p>
                        {order.customer_email && (
                          <p className="text-white/40 text-xs mt-0.5">{order.customer_email}</p>
                        )}
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-white/40 text-xs mb-1.5 flex items-center gap-1.5">
                          <CreditCard className="w-3 h-3" /> Pedido
                        </p>
                        <p className="text-white font-medium text-sm flex items-center gap-2">
                          {isPickup
                            ? <><Store className="w-3.5 h-3.5 text-white/50" /> Retirada no Local</>
                            : <><Truck className="w-3.5 h-3.5 text-blue-400" /> Delivery</>}
                        </p>
                        <p className="text-white/50 text-sm">
                          {order.payment_method === 'pix'         ? 'PIX'     :
                           order.payment_method === 'credit_card' ? 'Crédito' :
                           order.payment_method === 'debit_card'  ? 'Débito'  : 'Dinheiro'}
                        </p>
                      </div>
                    </div>

                    {/* Endereço */}
                    {!isPickup && order.address && (
                      <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-3">
                        <p className="text-yellow-400/70 text-xs font-semibold mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" /> Endereço para Entrega
                        </p>
                        <p className="text-white font-medium text-sm">
                          {order.address}{order.complement ? `, ${order.complement}` : ''}
                        </p>
                        {order.neighborhood_name && (
                          <p className="text-white/55 text-sm">{order.neighborhood_name}</p>
                        )}
                      </div>
                    )}

                    {/* Retirada */}
                    {isPickup && (
                      <div className="bg-teal-500/5 border border-teal-500/15 rounded-xl p-3 flex items-center gap-3">
                        <Store className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        <div>
                          <p className="text-teal-400 font-medium text-sm">Retirada no Local</p>
                          <p className="text-teal-400/60 text-xs">Av. Paulo Siqueira, 2515 — Ortigueira/PR</p>
                        </div>
                      </div>
                    )}

                    {/* Itens */}
                    <div>
                      <p className="text-white/40 text-xs font-medium mb-2 uppercase tracking-wide">
                        Itens do Pedido
                      </p>
                      <div className="bg-white/4 rounded-xl divide-y divide-white/5 overflow-hidden">
                        {(order.order_items ?? []).map(item => (
                          <div key={item.id} className="flex justify-between items-center px-3 py-2.5">
                            <span className="text-white/75 text-sm">
                              {item.quantity}x {item.product_name}
                            </span>
                            <span className="text-white font-medium text-sm">
                              R$ {(Number(item.unit_price) * item.quantity).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financeiro */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-white/4 rounded-lg p-2.5 text-center">
                        <p className="text-white/40 mb-0.5">Subtotal</p>
                        <p className="text-white font-medium">
                          R$ {Number(order.subtotal).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div className="bg-white/4 rounded-lg p-2.5 text-center">
                        <p className="text-white/40 mb-0.5">Entrega</p>
                        <p className="text-white font-medium">
                          R$ {Number(order.delivery_fee).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/15 rounded-lg p-2.5 text-center">
                        <p className="text-red-400/70 mb-0.5">Total</p>
                        <p className="text-red-400 font-bold">
                          R$ {Number(order.total).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="bg-white/4 rounded-xl p-3">
                        <p className="text-white/40 text-xs mb-1">Observações</p>
                        <p className="text-white/75 text-sm italic">"{order.notes}"</p>
                      </div>
                    )}

                    {/* Todos os status */}
                    <div>
                      <p className="text-white/40 text-xs font-medium mb-2 uppercase tracking-wide">
                        Alterar Status ({isPickup ? 'Retirada' : 'Delivery'})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.entries(statusMap).map(([status, c]) => (
                          <button
                            key={status}
                            onClick={() => updateStatus(order.id, status)}
                            disabled={isUpdating || order.status === status}
                            className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all border flex items-center justify-center gap-1.5 ${
                              order.status === status
                                ? `${c.bg} ${c.color} cursor-default`
                                : 'bg-white/5 border-white/10 text-white/50 hover:border-white/25 hover:text-white'
                            }`}
                          >
                            {order.status === status && (
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            )}
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Imprimir */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => printOrder(order)}
                        className="flex-1 flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 text-white py-2.5 rounded-xl text-sm font-medium transition-all"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir
                      </button>
                    </div>

                    <p className="text-white/20 text-xs text-center">
                      WhatsApp abre automaticamente ao atualizar o status
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
