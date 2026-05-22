import { useEffect, useState } from 'react';
import { Plus, Tag, Trash2, X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Coupon } from '../../types';

interface CouponForm {
  code: string;
  type: string;
  value: string;
  min_order: string;
  max_uses: string;
}

const emptyForm: CouponForm = { code: '', type: 'percentage', value: '', min_order: '0', max_uses: '' };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const save = async () => {
    if (!form.code || !form.value) return;
    setSaving(true);
    await supabase.from('coupons').insert({
      code: form.code.toUpperCase(),
      type: form.type,
      value: parseFloat(form.value),
      min_order: parseFloat(form.min_order) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
    });
    await fetchCoupons();
    setSaving(false);
    setShowModal(false);
    setForm(emptyForm);
  };

  const toggleActive = async (coupon: Coupon) => {
    await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id);
    await fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Remover este cupom?')) return;
    await supabase.from('coupons').delete().eq('id', id);
    await fetchCoupons();
  };

  const typeLabel = (type: string) => {
    if (type === 'percentage') return 'Percentual';
    if (type === 'fixed') return 'Valor Fixo';
    return 'Frete Grátis';
  };

  const valueLabel = (c: Coupon) => {
    if (c.type === 'percentage') return `${c.value}% off`;
    if (c.type === 'fixed') return `R$ ${c.value.toFixed(2).replace('.', ',')} off`;
    return 'Frete grátis';
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Cupom
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-white/30">Carregando...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 text-white/30">Nenhum cupom cadastrado</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(coupon => (
            <div key={coupon.id} className="bg-[#111] border border-white/5 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-red-500" />
                  <span className="text-white font-bold text-lg tracking-wider">{coupon.code}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleActive(coupon)} className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${coupon.active ? 'bg-green-900/30 text-green-400' : 'bg-white/5 text-white/30'}`}>
                    {coupon.active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button onClick={() => deleteCoupon(coupon.id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-900/30 text-white/30 hover:text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">Tipo</span>
                  <span className="text-white">{typeLabel(coupon.type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Desconto</span>
                  <span className="text-red-400 font-medium">{valueLabel(coupon)}</span>
                </div>
                {coupon.min_order > 0 && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Pedido mín.</span>
                    <span className="text-white">R$ {coupon.min_order.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/40">Usos</span>
                  <span className="text-white">{coupon.uses_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="text-white font-semibold">Novo Cupom</h3>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-white/50 text-xs mb-1 block">Código *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="EX: SUSHI20" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 uppercase tracking-wider" />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Tipo *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 appearance-none">
                  <option value="percentage" className="bg-[#111]">Percentual (%)</option>
                  <option value="fixed" className="bg-[#111]">Valor Fixo (R$)</option>
                  <option value="free_delivery" className="bg-[#111]">Frete Grátis</option>
                </select>
              </div>
              {form.type !== 'free_delivery' && (
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Valor *</label>
                  <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} type="number" step="0.01" placeholder={form.type === 'percentage' ? '15' : '10.00'} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Pedido mínimo (R$)</label>
                  <input value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Máx. de usos</label>
                  <input value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} type="number" placeholder="Ilimitado" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 placeholder-white/20" />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-white/10">
              <button onClick={save} disabled={saving} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Criar Cupom'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
