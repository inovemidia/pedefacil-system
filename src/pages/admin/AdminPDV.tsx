import { useState, useEffect, useCallback } from 'react';
import {
  Monitor, Plus, Minus, Trash2, CreditCard, Smartphone,
  Wallet, Banknote, X, Check, Receipt, AlertCircle,
  Search, ArrowDownCircle, Loader2, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Product, Category } from '../../types';

interface CartLine { product: Product; qty: number; }
interface CashRegister {
  id: string; status: string; opening_balance: number;
  opened_at: string; closing_balance?: number;
}

type PayMethod = 'cash' | 'pix' | 'credit_card' | 'debit_card';

const PAY_OPTS: { value: PayMethod; label: string; icon: any; color: string }[] = [
  { value: 'pix',         label: 'PIX',     icon: Smartphone, color: 'text-green-400' },
  { value: 'cash',        label: 'Dinheiro',icon: Banknote,   color: 'text-yellow-400' },
  { value: 'credit_card', label: 'Crédito', icon: CreditCard, color: 'text-blue-400' },
  { value: 'debit_card',  label: 'Débito',  icon: Wallet,     color: 'text-cyan-400' },
];

export default function AdminPDV() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [cashGiven, setCashGiven] = useState('');
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderDone, setOrderDone] = useState<number | null>(null);
  const [modal, setModal] = useState<'open_register' | 'close_register' | 'movement' | null>(null);
  const [openBalance, setOpenBalance] = useState('');
  const [closeBalance, setCloseBalance] = useState('');
  const [movType, setMovType] = useState<'manual_in' | 'manual_out' | 'sangria'>('sangria');
  const [movAmount, setMovAmount] = useState('');
  const [movDesc, setMovDesc] = useState('');
  const [movLoading, setMovLoading] = useState(false);
  const [movErr, setMovErr] = useState('');
  const [err, setErr] = useState('');

  const loadData = useCallback(async () => {
    const [{ data: prods }, { data: cats }, { data: reg }] = await Promise.all([
      supabase.from('products').select('*, categories(*)').eq('active', true).order('display_order'),
      supabase.from('categories').select('*').eq('active', true).order('display_order'),
      supabase.from('cash_registers').select('*').eq('status', 'open').order('opened_at', { ascending: false }).limit(1),
    ]);
    setProducts(prods ?? []);
    setCategories(cats ?? []);
    setCashRegister(reg?.[0] ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = products.filter(p => {
    const matchCat = activeCat === 'all' || p.category_id === activeCat;
    const matchSearch = search === '' || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const exists = prev.find(l => l.product.id === product.id);
      if (exists) return prev.map(l => l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(l => l.product.id === id ? { ...l, qty: Math.max(0, l.qty + delta) } : l).filter(l => l.qty > 0));
  };

  const subtotal       = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const cashGivenNum   = parseFloat(cashGiven.replace(',', '.')) || 0;
  const changeAmount   = cashGivenNum > subtotal ? cashGivenNum - subtotal : 0;
  const cashEmpty      = payMethod === 'cash' && cashGivenNum === 0;
  const changeInvalid  = payMethod === 'cash' && cashGivenNum > 0 && cashGivenNum < subtotal;

  const openRegister = async () => {
    const balance = parseFloat(openBalance.replace(',', '.'));
    if (isNaN(balance) && openBalance.trim() !== '') {
      setMovErr('Valor inválido. Use apenas números.');
      return;
    }
    console.log('Abrindo caixa...', { user: user?.id, balance: balance || 0 });
    setMovLoading(true);
    setMovErr('');

    const { data: reg, error: regErr } = await supabase
      .from('cash_registers')
      .insert({
        opened_by: user?.id ?? null,
        opening_balance: balance || 0,
        status: 'open',
      })
      .select()
      .single();

    if (regErr || !reg) {
      console.error('Erro ao abrir caixa:', regErr);
      setMovErr(regErr?.message ?? 'Erro ao abrir caixa. Verifique suas permissões.');
      setMovLoading(false);
      return;
    }

    console.log('Caixa criado:', reg.id);

    const { error: movErr } = await supabase.from('cash_movements').insert({
      cash_register_id: reg.id,
      type: 'opening',
      amount: reg.opening_balance,
      description: 'Abertura de caixa',
      payment_method: 'cash',
      created_by: user?.id ?? null,
    });

    if (movErr) {
      console.error('Erro ao registrar movimento de abertura:', movErr);
      // Não bloqueia — o caixa já foi aberto
    }

    console.log('Caixa aberto com sucesso');
    setMovLoading(false);
    setModal(null);
    setOpenBalance('');
    setMovErr('');
    loadData();
  };

  const closeRegister = async () => {
    if (!cashRegister) return;
    setMovLoading(true);
    const cb = parseFloat(closeBalance.replace(',', '.')) || 0;
    await supabase.from('cash_registers').update({
      closed_by: user?.id, closed_at: new Date().toISOString(),
      closing_balance: cb, status: 'closed',
    }).eq('id', cashRegister.id);
    setMovLoading(false); setModal(null); setCloseBalance('');
    loadData();
  };

  const addMovement = async () => {
    if (!cashRegister || !movAmount.trim()) return;
    setMovLoading(true);
    await supabase.from('cash_movements').insert({
      cash_register_id: cashRegister.id, type: movType,
      amount: parseFloat(movAmount.replace(',', '.')),
      description: movDesc || movType, payment_method: 'cash', created_by: user?.id,
    });
    setMovLoading(false); setModal(null); setMovAmount(''); setMovDesc('');
  };

  const placeOrder = async () => {
    if (cart.length === 0 || !cashRegister) return;
    setErr('');
    setOrderLoading(true);
    try {
      const hasCashChange  = payMethod === 'cash' && cashGivenNum > 0;
      const finalChangeAmt = hasCashChange ? Math.max(0, cashGivenNum - subtotal) : 0;

      console.log('PDV placeOrder:', { payMethod, subtotal, cashGivenNum, changeAmount, cashRegisterId: cashRegister.id });

      const { data: order, error: orderErr } = await supabase.from('orders').insert({
        user_id: user?.id ?? null,
        customer_name: 'Balcão PDV',
        customer_phone: '',
        customer_email: '',
        address: '',
        neighborhood_name: '',
        complement: '',
        order_type: 'pickup',
        payment_method: payMethod,
        payment_status: 'paid',
        subtotal,
        delivery_fee: 0,
        discount: 0,
        total: subtotal,
        needs_change: hasCashChange,
        change_for:   hasCashChange ? cashGivenNum : 0,
        change_amount: finalChangeAmt,
        notes: '',
        estimated_time: 15,
      }).select().single();

      if (orderErr) {
        console.error('PDV orderErr:', orderErr);
        throw new Error(`Erro ao criar pedido: ${orderErr.message}`);
      }
      if (!order) throw new Error('Pedido não foi criado (resposta vazia)');

      console.log('PDV order criado:', order.id, order.order_number);

      const { error: itemsErr } = await supabase.from('order_items').insert(
        cart.map(l => ({
          order_id: order.id, product_id: l.product.id, product_name: l.product.name,
          quantity: l.qty, unit_price: l.product.price, extras: [], notes: '',
        }))
      );

      if (itemsErr) {
        console.error('PDV itemsErr:', itemsErr);
        // Não bloqueia — pedido já criado
      }

      const { error: movErr } = await supabase.from('cash_movements').insert({
        cash_register_id: cashRegister.id, type: 'sale', amount: subtotal,
        description: `Venda PDV #${order.order_number}`, payment_method: payMethod,
        order_id: order.id, created_by: user?.id,
      });

      if (movErr) {
        console.error('PDV movErr:', movErr);
        // Não bloqueia — pedido já criado
      }

      console.log('PDV venda concluída:', order.order_number);
      setOrderDone(order.order_number);
      setCart([]);
      setCashGiven('');
      setTimeout(() => setOrderDone(null), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      console.error('PDV placeOrder catch:', msg);
      setErr(msg);
    }
    setOrderLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
    </div>
  );

  return (
    <div className="h-[calc(100vh-3.5rem-3rem)] flex flex-col gap-4">

      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${cashRegister ? 'bg-green-900/20 border-green-800/30 text-green-400' : 'bg-red-900/20 border-red-800/30 text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${cashRegister ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {cashRegister ? `Caixa Aberto · R$ ${Number(cashRegister.opening_balance).toFixed(2).replace('.', ',')}` : 'Caixa Fechado'}
          </div>
          {cashRegister && (
            <span className="text-white/30 text-xs">
              Desde {new Date(cashRegister.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cashRegister ? (
            <>
              <button onClick={() => setModal('movement')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-lg text-xs font-medium transition-all">
                <ArrowDownCircle className="w-3.5 h-3.5" />
                Movimentação
              </button>
              <button onClick={() => setModal('close_register')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-red-900/20 border border-white/10 hover:border-red-800/30 text-white/70 hover:text-red-400 rounded-lg text-xs font-medium transition-all">
                Fechar Caixa
              </button>
            </>
          ) : (
            <button onClick={() => setModal('open_register')}
              className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all">
              <Monitor className="w-4 h-4" />
              Abrir Caixa
            </button>
          )}
          <button onClick={loadData} className="p-1.5 text-white/30 hover:text-white rounded-lg hover:bg-white/5 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!cashRegister && (
        <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-400/80 text-sm">Abra o caixa antes de registrar vendas.</p>
        </div>
      )}

      {orderDone && (
        <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-400 text-sm font-medium">Venda registrada! Pedido #{orderDone}</p>
        </div>
      )}

      {/* Main PDV layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">

        {/* Products */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
          {/* Search + category filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full bg-[#111] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setActiveCat('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCat === 'all' ? 'bg-red-600 text-white' : 'bg-white/5 text-white/50 hover:text-white'}`}>
              Todos
            </button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCat(c.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCat === c.id ? 'bg-red-600 text-white' : 'bg-white/5 text-white/50 hover:text-white'}`}>
                {c.name}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 content-start">
            {filtered.map(p => {
              const inCart = cart.find(l => l.product.id === p.id);
              return (
                <button key={p.id} onClick={() => addToCart(p)}
                  className={`bg-[#111] border rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98] relative ${inCart ? 'border-red-600/50 bg-red-900/10' : 'border-white/5 hover:border-white/15'}`}>
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} className="w-full h-20 object-cover rounded-lg mb-2" />
                  )}
                  {inCart && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {inCart.qty}
                    </span>
                  )}
                  <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{p.name}</p>
                  <p className="text-red-400 text-sm font-bold mt-1">R$ {p.price.toFixed(2).replace('.', ',')}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart + checkout */}
        <div className="flex flex-col bg-[#111] border border-white/5 rounded-2xl overflow-hidden min-h-0">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-white font-semibold text-sm">Pedido Atual</p>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-white/30 hover:text-red-400 text-xs transition-colors">
                Limpar
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-white/20">
                <Receipt className="w-8 h-8 mb-2" />
                <p className="text-sm">Selecione produtos</p>
              </div>
            ) : cart.map(line => (
              <div key={line.product.id} className="flex items-center gap-2 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{line.product.name}</p>
                  <p className="text-white/40 text-xs">R$ {line.product.price.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(line.product.id, -1)} className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-white text-sm font-bold w-6 text-center">{line.qty}</span>
                  <button onClick={() => updateQty(line.product.id, 1)} className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-white text-xs font-semibold w-16 text-right">
                  R$ {(line.product.price * line.qty).toFixed(2).replace('.', ',')}
                </span>
                <button onClick={() => setCart(prev => prev.filter(l => l.product.id !== line.product.id))}
                  className="text-white/20 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Checkout */}
          <div className="border-t border-white/5 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Total</span>
              <span className="text-white font-bold text-xl">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-2 gap-1.5">
              {PAY_OPTS.map(opt => (
                <button key={opt.value} onClick={() => { setPayMethod(opt.value); setCashGiven(''); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    payMethod === opt.value ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-white/40 hover:text-white hover:bg-white/5'
                  }`}>
                  <opt.icon className={`w-3.5 h-3.5 ${payMethod === opt.value ? opt.color : ''}`} />
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Valor recebido (dinheiro) */}
            {payMethod === 'cash' && (
              <div className="space-y-2">
                <label className="text-white/50 text-xs block">Valor recebido (R$)</label>
                <input
                  value={cashGiven}
                  onChange={e => setCashGiven(e.target.value)}
                  placeholder="0,00"
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  className={`w-full bg-white/5 border rounded-xl px-3 py-3 text-white text-lg font-semibold placeholder-white/20 focus:outline-none transition-colors ${
                    changeInvalid ? 'border-red-500/70 focus:border-red-500' : 'border-white/10 focus:border-yellow-500'
                  }`}
                />

                {/* Validação */}
                {changeInvalid && (
                  <p className="text-red-400 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    Valor recebido insuficiente
                  </p>
                )}

                {/* Resumo sempre visível (com ou sem valor digitado) */}
                {!changeInvalid && (
                  <div className="bg-[#0d1a0d] border border-yellow-700/35 rounded-xl overflow-hidden">
                    <div className="flex justify-between items-center px-3 py-2 border-b border-yellow-700/20">
                      <span className="text-white/45 text-xs">Total da venda</span>
                      <span className="text-white/80 text-sm font-semibold">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2 border-b border-yellow-700/20">
                      <span className="text-white/45 text-xs">Recebido</span>
                      <span className={`text-sm font-medium ${cashGivenNum > 0 ? 'text-white/80' : 'text-white/25'}`}>
                        {cashGivenNum > 0 ? `R$ ${cashGivenNum.toFixed(2).replace('.', ',')}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2.5 bg-yellow-900/20">
                      <span className="text-yellow-400 text-sm font-bold">Troco</span>
                      <span className={`text-lg font-bold ${cashGivenNum > 0 ? 'text-yellow-300' : 'text-white/25'}`}>
                        {cashGivenNum > 0 ? `R$ ${changeAmount.toFixed(2).replace('.', ',')}` : '—'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {err && <p className="text-red-400 text-xs">{err}</p>}

            <button
              onClick={placeOrder}
              disabled={cart.length === 0 || !cashRegister || orderLoading || changeInvalid || cashEmpty}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              {orderLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {orderLoading ? 'Registrando...' : `Finalizar · R$ ${subtotal.toFixed(2).replace('.', ',')}`}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setModal(null); setMovErr(''); } }}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">

            {modal === 'open_register' && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-white font-bold text-lg">Abrir Caixa</h3>
                  <button onClick={() => { setModal(null); setMovErr(''); }} className="text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <label className="text-white/50 text-xs mb-1.5 block">Saldo inicial (R$)</label>
                <input value={openBalance} onChange={e => { setOpenBalance(e.target.value); setMovErr(''); }}
                  placeholder="0,00" type="number" step="0.01" min="0"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 mb-4" />
                {movErr && (
                  <div className="flex items-start gap-2 bg-red-900/20 border border-red-800/30 rounded-xl px-3 py-2.5 mb-4">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-xs">{movErr}</p>
                  </div>
                )}
                <button onClick={openRegister} disabled={movLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                  {movLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {movLoading ? 'Abrindo...' : 'Abrir Caixa'}
                </button>
              </>
            )}

            {modal === 'close_register' && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-white font-bold text-lg">Fechar Caixa</h3>
                  <button onClick={() => { setModal(null); setMovErr(''); }} className="text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <label className="text-white/50 text-xs mb-1.5 block">Saldo final em caixa (R$)</label>
                <input value={closeBalance} onChange={e => setCloseBalance(e.target.value)}
                  placeholder="0,00" type="number" step="0.01"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 mb-4" />
                <button onClick={closeRegister} disabled={movLoading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                  {movLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Fechar Caixa
                </button>
              </>
            )}

            {modal === 'movement' && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-white font-bold text-lg">Movimentação</h3>
                  <button onClick={() => { setModal(null); setMovErr(''); }} className="text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {([['sangria','Sangria'], ['manual_in','Entrada'], ['manual_out','Saída']] as const).map(([val, lbl]) => (
                    <button key={val} onClick={() => setMovType(val)}
                      className={`py-2 rounded-xl text-xs font-medium border transition-all ${movType === val ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-white/40 hover:text-white'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <label className="text-white/50 text-xs mb-1.5 block">Valor (R$)</label>
                <input value={movAmount} onChange={e => setMovAmount(e.target.value)}
                  placeholder="0,00" type="number" step="0.01"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 mb-3" />
                <label className="text-white/50 text-xs mb-1.5 block">Descrição</label>
                <input value={movDesc} onChange={e => setMovDesc(e.target.value)}
                  placeholder="Opcional"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 mb-4" />
                <button onClick={addMovement} disabled={movLoading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                  {movLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Registrar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
