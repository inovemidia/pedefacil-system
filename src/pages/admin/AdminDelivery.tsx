import { useEffect, useState } from 'react';
import { Truck, MapPin, Phone, User, Clock, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types';

interface Assignment {
  id: string;
  order_id: string;
  motoboy_name: string;
  motoboy_phone: string;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  received: 'text-blue-400 bg-blue-500/10',
  preparing: 'text-yellow-400 bg-yellow-500/10',
  out_for_delivery: 'text-orange-400 bg-orange-500/10',
  delivered: 'text-green-400 bg-green-500/10',
  cancelled: 'text-red-400 bg-red-500/10',
};
const STATUS_LABELS: Record<string, string> = {
  received: 'Recebido', preparing: 'Preparando',
  out_for_delivery: 'Em Entrega', delivered: 'Entregue', cancelled: 'Cancelado',
};

export default function AdminDelivery() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Order | null>(null);
  const [mbName, setMbName] = useState('');
  const [mbPhone, setMbPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const [{ data: ords }, { data: asn }] = await Promise.all([
      supabase.from('orders').select('*').eq('order_type','delivery')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('delivery_assignments').select('*').order('assigned_at', { ascending: false }),
    ]);
    setOrders(ords ?? []);
    setAssignments(asn ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('delivery-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const assign = async () => {
    if (!modal || !mbName.trim()) return;
    setSaving(true);
    await supabase.from('delivery_assignments').upsert({
      order_id: modal.id, motoboy_name: mbName, motoboy_phone: mbPhone,
    }, { onConflict: 'order_id' });
    await supabase.from('orders').update({ status: 'out_for_delivery' }).eq('id', modal.id);
    setSaving(false); setModal(null); setMbName(''); setMbPhone('');
    load();
  };

  const markDelivered = async (orderId: string) => {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    await supabase.from('delivery_assignments').update({ delivered_at: new Date().toISOString() }).eq('order_id', orderId);
    load();
  };

  const getAssignment = (orderId: string) => assignments.find(a => a.order_id === orderId);

  const pending = orders.filter(o => ['received','preparing'].includes(o.status));
  const onRoute = orders.filter(o => o.status === 'out_for_delivery');
  const delivered = orders.filter(o => o.status === 'delivered');

  const avgTime = (() => {
    const done = assignments.filter(a => a.delivered_at);
    if (done.length === 0) return null;
    const avg = done.reduce((s, a) => {
      return s + (new Date(a.delivered_at!).getTime() - new Date(a.assigned_at).getTime());
    }, 0) / done.length;
    return Math.round(avg / 60000);
  })();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-screen-xl">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Aguardando', value: pending.length, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Em Rota', value: onRoute.length, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          { label: 'Entregues Hoje', value: delivered.length, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Tempo Médio', value: avgTime ? `${avgTime} min` : '—', color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(s => (
          <div key={s.label} className={`bg-[#111] border border-white/5 rounded-2xl p-4 ${s.bg}`}>
            <p className={`font-bold text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-white/40 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={load} className="flex items-center gap-2 text-white/40 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending */}
        <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <h3 className="text-white font-semibold text-sm">Aguardando Entrega</h3>
            <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded-full ml-auto">{pending.length}</span>
          </div>
          <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
            {pending.length === 0 ? (
              <p className="text-white/25 text-sm text-center py-8">Nenhum pedido pendente</p>
            ) : pending.map(o => (
              <div key={o.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">#{o.order_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                </div>
                <p className="text-white/70 text-sm">{o.customer_name}</p>
                <div className="flex items-start gap-1.5 text-white/40 text-xs">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{o.address}{o.neighborhood_name ? ` — ${o.neighborhood_name}` : ''}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/40 text-xs">
                  <Phone className="w-3 h-3" />
                  <span>{o.customer_phone}</span>
                </div>
                <p className="text-white font-medium text-sm">R$ {Number(o.total).toFixed(2).replace('.', ',')}</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setModal(o); setMbName(''); setMbPhone(''); }}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
                    <Truck className="w-3.5 h-3.5" /> Enviar para Entrega
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* On route */}
        <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <h3 className="text-white font-semibold text-sm">Em Rota</h3>
            <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded-full ml-auto">{onRoute.length}</span>
          </div>
          <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
            {onRoute.length === 0 ? (
              <p className="text-white/25 text-sm text-center py-8">Nenhuma entrega em rota</p>
            ) : onRoute.map(o => {
              const asn = getAssignment(o.id);
              return (
                <div key={o.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">#{o.order_number}</span>
                    <span className="text-orange-400 text-xs bg-orange-500/10 px-2 py-0.5 rounded-full">Em Entrega</span>
                  </div>
                  <p className="text-white/70 text-sm">{o.customer_name}</p>
                  <div className="flex items-start gap-1.5 text-white/40 text-xs">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{o.address}{o.neighborhood_name ? ` — ${o.neighborhood_name}` : ''}</span>
                  </div>
                  {asn && (
                    <div className="flex items-center gap-1.5 text-blue-400/70 text-xs bg-blue-900/20 rounded-lg px-2 py-1.5">
                      <User className="w-3 h-3" />
                      <span>{asn.motoboy_name}</span>
                      {asn.motoboy_phone && <span className="text-white/30">· {asn.motoboy_phone}</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-white/30 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>Saiu {asn ? new Date(asn.assigned_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '—'}</span>
                  </div>
                  <button onClick={() => markDelivered(o.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
                    <Check className="w-3.5 h-3.5" /> Marcar Entregue
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivered */}
        <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <h3 className="text-white font-semibold text-sm">Entregues Hoje</h3>
            <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded-full ml-auto">{delivered.length}</span>
          </div>
          <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
            {delivered.length === 0 ? (
              <p className="text-white/25 text-sm text-center py-8">Sem entregas ainda</p>
            ) : delivered.map(o => {
              const asn = getAssignment(o.id);
              return (
                <div key={o.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">#{o.order_number}</span>
                    <span className="text-green-400 text-xs">Entregue</span>
                  </div>
                  <p className="text-white/50 text-sm">{o.customer_name}</p>
                  {asn && <p className="text-white/30 text-xs">{asn.motoboy_name}</p>}
                  <p className="text-white text-sm">R$ {Number(o.total).toFixed(2).replace('.', ',')}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Assign modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold">Enviar para Entrega</h3>
                <p className="text-white/40 text-xs">Pedido #{modal.order_number} · {modal.customer_name}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-white/30 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Nome do Motoboy *</label>
                <input value={mbName} onChange={e => setMbName(e.target.value)}
                  placeholder="Nome"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Telefone (opcional)</label>
                <input value={mbPhone} onChange={e => setMbPhone(e.target.value)}
                  placeholder="(42) 99999-9999"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-sm">
                <p className="text-white/50">Endereço:</p>
                <p className="text-white mt-0.5">{modal.address}{modal.neighborhood_name ? ` — ${modal.neighborhood_name}` : ''}</p>
              </div>
            </div>
            <button onClick={assign} disabled={saving || !mbName.trim()}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              Confirmar Envio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
