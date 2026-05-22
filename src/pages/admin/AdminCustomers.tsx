import { useEffect, useState } from 'react';
import { Users, Search, ShoppingBag, DollarSign, Phone, ChevronRight, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { UserProfile, Order } from '../../types';

interface CustomerWithStats extends UserProfile {
  orderCount: number;
  totalSpent: number;
  lastOrder: string | null;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerWithStats | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ data: profiles }, { data: ords }] = await Promise.all([
        supabase.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
      ]);
      const allOrders = ords ?? [];
      setOrders(allOrders);
      const enriched = (profiles ?? []).map(p => {
        const pOrders = allOrders.filter(o => o.user_id === p.id && o.payment_status === 'paid');
        return {
          ...p,
          orderCount: pOrders.length,
          totalSpent: pOrders.reduce((s, o) => s + Number(o.total), 0),
          lastOrder: pOrders[0]?.created_at ?? null,
        };
      });
      enriched.sort((a, b) => b.totalSpent - a.totalSpent);
      setCustomers(enriched);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.full_name ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q) || (c.phone ?? '').includes(q);
  });

  const openCustomer = (c: CustomerWithStats) => {
    setSelected(c);
    setCustomerOrders(orders.filter(o => o.user_id === c.id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-screen-xl">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Clientes', value: customers.length, icon: Users, color: 'text-blue-400' },
          { label: 'Com Pedidos', value: customers.filter(c => c.orderCount > 0).length, icon: ShoppingBag, color: 'text-green-400' },
          { label: 'Receita Total', value: `R$ ${customers.reduce((s,c) => s + c.totalSpent, 0).toFixed(2).replace('.', ',')}`, icon: DollarSign, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-white font-bold text-xl">{s.value}</p>
              <p className="text-white/40 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone..."
          className="w-full bg-[#111] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-red-500 transition-colors" />
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Cliente', 'Contato', 'Pedidos', 'Total Gasto', 'Último Pedido', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-white/25 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-white/4 hover:bg-white/2 cursor-pointer transition-colors" onClick={() => openCustomer(c)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-white/50 text-xs font-bold flex-shrink-0">
                        {(c.full_name ?? c.email ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{c.full_name ?? '—'}</p>
                        <p className="text-white/30 text-xs">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-sm">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-white font-bold">{c.orderCount}</span>
                    <span className="text-white/30 text-xs ml-1">pedidos</span>
                  </td>
                  <td className="px-4 py-3 text-green-400 font-semibold text-sm">
                    R$ {c.totalSpent.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-4 py-3 text-white/35 text-xs">
                    {c.lastOrder ? new Date(c.lastOrder).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-white/25 text-sm">Nenhum cliente encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-end p-4" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h3 className="text-white font-bold">{selected.full_name ?? 'Cliente'}</h3>
                <p className="text-white/40 text-xs">{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 border-b border-white/5 grid grid-cols-3 gap-3">
              {[
                { label: 'Pedidos', value: selected.orderCount.toString(), icon: ShoppingBag },
                { label: 'Total Gasto', value: `R$ ${selected.totalSpent.toFixed(2).replace('.', ',')}`, icon: DollarSign },
                { label: 'Telefone', value: selected.phone ?? '—', icon: Phone },
              ].map(s => (
                <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                  <s.icon className="w-4 h-4 text-white/30 mx-auto mb-1" />
                  <p className="text-white font-bold text-sm">{s.value}</p>
                  <p className="text-white/30 text-xs">{s.label}</p>
                </div>
              ))}
            </div>
            {selected.neighborhood && (
              <div className="px-5 py-3 border-b border-white/5">
                <p className="text-white/40 text-xs">Endereço</p>
                <p className="text-white/70 text-sm mt-0.5">
                  {[selected.street, selected.street_number].filter(Boolean).join(', ')}
                  {selected.neighborhood ? ` — ${selected.neighborhood}` : ''}
                  {selected.city ? `, ${selected.city}` : ''}
                </p>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              <p className="text-white/40 text-xs font-medium px-5 py-3">Pedidos ({customerOrders.length})</p>
              <div className="divide-y divide-white/5">
                {customerOrders.length === 0 ? (
                  <p className="text-white/25 text-sm text-center py-8">Sem pedidos ainda</p>
                ) : customerOrders.map(o => (
                  <div key={o.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">#{o.order_number}</p>
                      <p className="text-white/30 text-xs">{new Date(o.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm">R$ {Number(o.total).toFixed(2).replace('.', ',')}</p>
                      <p className={`text-xs ${o.payment_status === 'paid' ? 'text-green-400' : 'text-white/30'}`}>
                        {o.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
