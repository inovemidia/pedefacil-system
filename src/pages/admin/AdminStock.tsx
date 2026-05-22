import { useEffect, useState } from 'react';
import { AlertTriangle, Search, Plus, Minus, Save, Loader2, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types';

interface StockRow {
  product: Product;
  quantity: number;
  alert_threshold: number;
  stock_id: string | null;
  dirty: boolean;
}

export default function AdminStock() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const [{ data: prods }, { data: stock }] = await Promise.all([
        supabase.from('products').select('*, categories(*)').eq('active', true).order('display_order'),
        supabase.from('stock_items').select('*'),
      ]);
      setRows((prods ?? []).map(p => {
        const s = (stock ?? []).find(s => s.product_id === p.id);
        return { product: p, quantity: s?.quantity ?? 0, alert_threshold: s?.alert_threshold ?? 5, stock_id: s?.id ?? null, dirty: false };
      }));
      setLoading(false);
    };
    load();
  }, []);

  const update = (id: string, field: 'quantity' | 'alert_threshold', val: number) => {
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, [field]: Math.max(0, val), dirty: true } : r));
  };

  const save = async (row: StockRow) => {
    setSaving(row.product.id);
    if (row.stock_id) {
      await supabase.from('stock_items').update({ quantity: row.quantity, alert_threshold: row.alert_threshold, updated_at: new Date().toISOString() }).eq('id', row.stock_id);
    } else {
      const { data } = await supabase.from('stock_items').insert({ product_id: row.product.id, quantity: row.quantity, alert_threshold: row.alert_threshold }).select().single();
      if (data) setRows(prev => prev.map(r => r.product.id === row.product.id ? { ...r, stock_id: data.id } : r));
    }
    setRows(prev => prev.map(r => r.product.id === row.product.id ? { ...r, dirty: false } : r));
    setSaving(null);
  };

  const filtered = rows.filter(r => !search || r.product.name.toLowerCase().includes(search.toLowerCase()));
  const lowStock = rows.filter(r => r.quantity <= r.alert_threshold && r.quantity > 0);
  const outOfStock = rows.filter(r => r.quantity === 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-screen-xl">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Produtos', value: rows.length, icon: Package, color: 'text-blue-400' },
          { label: 'Estoque Baixo', value: lowStock.length, icon: AlertTriangle, color: 'text-yellow-400' },
          { label: 'Sem Estoque', value: outOfStock.length, icon: AlertTriangle, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-white font-bold text-xl">{s.value}</p>
              <p className="text-white/40 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <p className="text-yellow-400 font-semibold text-sm">Alertas de Estoque</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {outOfStock.map(r => (
              <span key={r.product.id} className="text-xs bg-red-900/30 text-red-400 border border-red-800/30 px-2 py-1 rounded-lg">
                {r.product.name} — SEM ESTOQUE
              </span>
            ))}
            {lowStock.map(r => (
              <span key={r.product.id} className="text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-800/30 px-2 py-1 rounded-lg">
                {r.product.name} — {r.quantity} unid.
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full bg-[#111] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-red-500 transition-colors" />
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Produto', 'Categoria', 'Quantidade', 'Alerta (mín)', 'Status', 'Ação'].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-white/25 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const isLow = row.quantity <= row.alert_threshold && row.quantity > 0;
                const isOut = row.quantity === 0;
                return (
                  <tr key={row.product.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {row.product.image_url ? (
                          <img src={row.product.image_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-3.5 h-3.5 text-white/20" />
                          </div>
                        )}
                        <p className="text-white text-sm font-medium">{row.product.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/40 text-sm">
                      {(row.product as any).categories?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => update(row.product.id, 'quantity', row.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 flex items-center justify-center transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={e => update(row.product.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-red-500"
                        />
                        <button onClick={() => update(row.product.id, 'quantity', row.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 flex items-center justify-center transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.alert_threshold}
                        onChange={e => update(row.product.id, 'alert_threshold', parseInt(e.target.value) || 0)}
                        className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-red-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        isOut ? 'bg-red-900/30 text-red-400' :
                        isLow ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-green-900/30 text-green-400'
                      }`}>
                        {isOut ? 'Sem estoque' : isLow ? 'Estoque baixo' : 'OK'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.dirty && (
                        <button onClick={() => save(row)} disabled={saving === row.product.id}
                          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50">
                          {saving === row.product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Salvar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
