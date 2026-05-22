import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, MapPin, User, CreditCard, Smartphone, Tag, Copy, Check,
  Loader2, AlertCircle, RefreshCw, CheckCircle2, Clock, AlertTriangle, Banknote, ShieldCheck,
  X, Mail, Lock, Eye, EyeOff, ArrowRight, Phone, MapPin as MapPinIcon, Home, CheckCircle, ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { CheckoutForm, Coupon } from '../types';
import { useCart } from '../contexts/CartContext';
import { navigate } from '../hooks/useRouter';
import { useStoreStatus } from '../hooks/useStoreStatus';

// ─── Auth Modal (inline login/signup to avoid losing cart) ──────────────────

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatZip(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function InlineLoginForm({ onSuccess, onSwitch }: { onSuccess: () => void; onSwitch: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError('Email ou senha incorretos.');
      setLoading(false);
      return;
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-white/60 text-xs font-medium mb-1.5 block">Email</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com" required disabled={loading}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
        </div>
      </div>
      <div>
        <label className="text-white/60 text-xs font-medium mb-1.5 block">Senha</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required disabled={loading}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-11 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {error && <div className="bg-red-900/20 border border-red-800/30 rounded-xl px-4 py-3"><p className="text-red-400 text-sm">{error}</p></div>}
      <button type="submit" disabled={loading || !email || !password}
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Entrando...</> : <>Entrar e finalizar<ArrowRight className="w-4 h-4" /></>}
      </button>
      <p className="text-center text-white/40 text-sm pt-1">
        Nao tem conta?{' '}
        <button type="button" onClick={onSwitch} className="text-red-400 hover:text-red-300 font-medium">Cadastrar gratis</button>
      </p>
    </form>
  );
}

interface SignupData {
  full_name: string; email: string; phone: string;
  password: string; confirmPassword: string;
  zip_code: string; street: string; street_number: string;
  complement: string; neighborhood: string; city: string; state: string;
}
const EMPTY_SIGNUP: SignupData = {
  full_name: '', email: '', phone: '', password: '', confirmPassword: '',
  zip_code: '', street: '', street_number: '', complement: '', neighborhood: '', city: '', state: '',
};

function InlineSignupForm({ onSuccess, onSwitch }: { onSuccess: () => void; onSwitch: () => void }) {
  const { signUp } = useAuth();
  const [form, setForm] = useState<SignupData>(EMPTY_SIGNUP);
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState<'account' | 'address'>('account');
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof SignupData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    if (field === 'phone') v = formatPhone(v);
    if (field === 'zip_code') v = formatZip(v);
    if (field === 'state') v = v.toUpperCase().slice(0, 2);
    setForm(f => ({ ...f, [field]: v }));
  };

  const lookupCep = async () => {
    const cep = form.zip_code.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) setForm(f => ({ ...f, street: data.logradouro || f.street, neighborhood: data.bairro || f.neighborhood, city: data.localidade || f.city, state: data.uf || f.state }));
    } catch { /* ignore */ } finally { setCepLoading(false); }
  };

  const goToAddress = () => {
    if (!form.full_name.trim()) { setError('Informe seu nome'); return; }
    if (!form.email.trim()) { setError('Informe seu email'); return; }
    if (form.phone.replace(/\D/g, '').length < 10) { setError('Telefone invalido'); return; }
    if (form.password.length < 6) { setError('Senha: minimo 6 caracteres'); return; }
    if (form.password !== form.confirmPassword) { setError('Senhas nao coincidem'); return; }
    setError('');
    setStep('address');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.zip_code.replace(/\D/g, '')) { setError('Informe o CEP'); return; }
    if (!form.street.trim()) { setError('Informe a rua'); return; }
    if (!form.street_number.trim()) { setError('Informe o numero'); return; }
    if (!form.neighborhood.trim()) { setError('Informe o bairro'); return; }
    setError('');
    setLoading(true);
    const { error: err } = await signUp({
      email: form.email, password: form.password, full_name: form.full_name, phone: form.phone,
      zip_code: form.zip_code, street: form.street, street_number: form.street_number,
      complement: form.complement, neighborhood: form.neighborhood, city: form.city, state: form.state,
    });
    if (err) {
      const msg = err.message || '';
      setError(msg.includes('already registered') ? 'Email ja cadastrado. Faca login.' : msg || 'Erro ao criar conta.');
      setLoading(false);
      return;
    }
    onSuccess();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <div className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${step === 'account' ? 'bg-red-600/20 text-red-400 border border-red-800/40' : 'bg-green-600/10 text-green-400 border border-green-800/30'}`}>
          <User className="w-3 h-3" />Dados pessoais
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
        <div className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${step === 'address' ? 'bg-red-600/20 text-red-400 border border-red-800/40' : 'bg-white/5 text-white/30 border border-white/10'}`}>
          <MapPinIcon className="w-3 h-3" />Endereco
        </div>
      </div>
      {error && <div className="bg-red-900/20 border border-red-800/30 rounded-xl px-4 py-3 mb-4"><p className="text-red-400 text-sm">{error}</p></div>}

      {step === 'account' && (
        <div className="space-y-3">
          {[
            { label: 'Nome completo *', field: 'full_name' as keyof SignupData, placeholder: 'Joao Silva', type: 'text', Icon: User },
            { label: 'Email *', field: 'email' as keyof SignupData, placeholder: 'seu@email.com', type: 'email', Icon: Mail },
            { label: 'Telefone *', field: 'phone' as keyof SignupData, placeholder: '(42) 99999-9999', type: 'tel', Icon: Phone },
          ].map(({ label, field, placeholder, type, Icon }) => (
            <div key={field}>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">{label}</label>
              <div className="relative">
                <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type={type} value={form[field]} onChange={set(field)} placeholder={placeholder}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
              </div>
            </div>
          ))}
          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">Senha *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Minimo 6 caracteres"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-11 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">Confirmar senha *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
          </div>
          <button type="button" onClick={goToAddress}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30">
            Continuar<ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-center text-white/40 text-sm">
            Ja tem conta?{' '}
            <button type="button" onClick={onSwitch} className="text-red-400 hover:text-red-300 font-medium">Entrar</button>
          </p>
        </div>
      )}

      {step === 'address' && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2">
            <Home className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-white/60 text-xs">Endereco para delivery automatico.</p>
          </div>
          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">CEP *</label>
            <div className="relative">
              <MapPinIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type="text" value={form.zip_code} onChange={set('zip_code')} onBlur={lookupCep} placeholder="00000-000"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
              {cepLoading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Rua *</label>
              <input type="text" value={form.street} onChange={set('street')} placeholder="Av. Brasil"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">N° *</label>
              <input type="text" value={form.street_number} onChange={set('street_number')} placeholder="123"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">Bairro *</label>
            <input type="text" value={form.neighborhood} onChange={set('neighborhood')} placeholder="Centro"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Cidade *</label>
              <input type="text" value={form.city} onChange={set('city')} placeholder="Ortigueira"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">UF</label>
              <input type="text" value={form.state} onChange={set('state')} placeholder="PR" maxLength={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors uppercase" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setStep('account'); setError(''); }}
              className="flex-1 bg-white/10 hover:bg-white/15 text-white font-medium py-3 rounded-xl transition-all">
              Voltar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Criando...</> : <><CheckCircle className="w-4 h-4" />Cadastrar</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function AuthModal({ onClose, onSuccess, itemCount, orderTotal }: {
  onClose: () => void;
  onSuccess: () => void;
  itemCount: number;
  orderTotal: number;
}) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease' }}
      />
      <div
        className="relative w-full sm:max-w-sm bg-[#0f0f0f] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)' }}
      >
        {/* Cart summary strip */}
        <div className="bg-gradient-to-r from-red-950/60 to-red-900/30 border-b border-red-800/20 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{itemCount}</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Seu pedido esta pronto</p>
              <p className="text-white/40 text-xs">R$ {orderTotal.toFixed(2).replace('.', ',')} · carrinho salvo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1.5 -mr-1 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="px-6 pt-5 pb-1 flex-shrink-0">
          <h2 className="text-white font-bold text-xl">Entre para finalizar</h2>
          <p className="text-white/40 text-sm mt-0.5">Seus itens ficam salvos mesmo ao fazer login</p>
        </div>

        {/* Tab bar */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="flex bg-white/5 rounded-2xl p-1">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'login' ? 'bg-white text-black shadow-md' : 'text-white/50 hover:text-white'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'signup' ? 'bg-white text-black shadow-md' : 'text-white/50 hover:text-white'}`}
            >
              Criar conta gratis
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {tab === 'login'
            ? <InlineLoginForm onSuccess={onSuccess} onSwitch={() => setTab('signup')} />
            : <InlineSignupForm onSuccess={onSuccess} onSwitch={() => setTab('login')} />
          }
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}

const DELIVERY_FEE = 8;

type Step = 'form' | 'pix';

export default function CheckoutPage() {
  const { user, profile } = useAuth();
  const { items, subtotal, discount, total, coupon, applyCoupon, removeCoupon, clearCart } = useCart();
  const storeStatus = useStoreStatus();

  const [step, setStep]           = useState<Step>('form');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [couponCode, setCouponCode]     = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError]   = useState('');
  const [orderId, setOrderId]     = useState('');
  const [pixData, setPixData]     = useState<{ qr_code: string; qr_code_base64: string; expires_at?: string | null } | null>(null);
  const [copied, setCopied]       = useState(false);
  const [pixStatus, setPixStatus] = useState<'pending' | 'paid' | 'failed' | 'checking'>('pending');
  const [savingProfile, setSavingProfile] = useState(false);
  const [mountedMs, setMountedMs] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Form fields — initialised from profile immediately (profile is loaded before CheckoutPage mounts)
  const [customerName,  setCustomerName]  = useState(() => profile?.full_name ?? '');
  const [customerPhone, setCustomerPhone] = useState(() => profile?.phone ?? '');
  const [customerEmail, setCustomerEmail] = useState(() => profile?.email ?? user?.email ?? '');
  const [orderType, setOrderType] = useState<CheckoutForm['order_type']>('delivery');
  const [address, setAddress]     = useState(() => {
    if (!profile) return '';
    return [profile.street, profile.street_number].filter(Boolean).join(', ');
  });
  const [neighborhood, setNeighborhood] = useState(() => profile?.neighborhood ?? '');
  const [complement, setComplement]     = useState(() => profile?.complement ?? '');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutForm['payment_method']>('pix');
  const [needsChange, setNeedsChange]     = useState<boolean | null>(null); // null = not asked yet
  const [changeFor, setChangeFor]         = useState('');
  const [notes, setNotes] = useState('');

  const profileFilled  = !!(profile?.full_name || profile?.phone);
  const saveTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileApplied = useRef(false);

  // Fill form from profile once (handles the case where profile arrives after mount)
  useEffect(() => {
    if (!profile || profileApplied.current) return;
    profileApplied.current = true;

    if (profile.full_name)  setCustomerName(profile.full_name);
    if (profile.phone)      setCustomerPhone(profile.phone);
    const email = profile.email ?? user?.email ?? '';
    if (email)              setCustomerEmail(email);
    const addr = [profile.street, profile.street_number].filter(Boolean).join(', ');
    if (addr)               setAddress(addr);
    if (profile.neighborhood) setNeighborhood(profile.neighborhood);
    if (profile.complement) setComplement(profile.complement);
  }, [profile, user]);

  // Guard: redirect to /menu when cart is empty (but not before cart state settles)
  useEffect(() => {
    const t = window.setTimeout(() => setMountedMs(Date.now()), 300);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (mountedMs === 0) return;
    const safeItems = Array.isArray(items) ? items : [];
    if (safeItems.length === 0 && step === 'form') navigate('/menu');
  }, [items, step, mountedMs]);

  // Delivery fee & totals
  const freeDelivery    = coupon?.type === 'free_delivery';
  const deliveryFee     = orderType === 'pickup' ? 0 : (freeDelivery ? 0 : DELIVERY_FEE);
  const rawTotal        = total(deliveryFee);
  const orderTotal      = isFinite(rawTotal) ? rawTotal : 0;
  const safeSubtotal    = isFinite(subtotal) ? subtotal : 0;
  const safeDiscount    = isFinite(discount) ? discount : 0;

  // Auto-save profile on edits (debounced 1.5 s)
  const scheduleProfileSave = useCallback((fields: Partial<{
    name: string; phone: string; email: string;
    addr: string; nbh: string; comp: string;
  }>) => {
    if (!user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSavingProfile(true);
      const addrStr   = fields.addr ?? address;
      const addrParts = addrStr.split(',').map(s => s.trim());
      await supabase.from('profiles').update({
        full_name:     (fields.name  ?? customerName)  || null,
        phone:         (fields.phone ?? customerPhone) || null,
        email:         (fields.email ?? customerEmail) || null,
        complement:    (fields.comp  ?? complement)   || null,
        street:        addrParts[0] || null,
        street_number: addrParts[1] || null,
        neighborhood:  (fields.nbh  ?? neighborhood)  || null,
      }).eq('id', user.id);
      setSavingProfile(false);
    }, 1500);
  }, [user, address, customerName, customerPhone, customerEmail, complement, neighborhood]);

  // PIX auto-poll
  const checkPixStatus = useCallback(async () => {
    if (!orderId || pixStatus === 'paid') return;
    setPixStatus('checking');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    try {
      const res  = await fetch(
        `${supabaseUrl}/functions/v1/mercadopago-payment/check-status?order_id=${orderId}`,
        { headers: { 'Authorization': `Bearer ${supabaseKey}` } }
      );
      const data = await res.json();
      if (data.status === 'paid') {
        setPixStatus('paid');
        setTimeout(() => { clearCart(); navigate(`/order/${orderId}`); }, 2000);
      } else if (data.status === 'failed') {
        setPixStatus('failed');
      } else {
        setPixStatus('pending');
      }
    } catch {
      setPixStatus('pending');
    }
  }, [orderId, pixStatus, clearCart]);

  useEffect(() => {
    if (step !== 'pix' || pixStatus === 'paid') return;
    const interval = setInterval(checkPixStatus, 5000);
    return () => clearInterval(interval);
  }, [step, pixStatus, checkPixStatus]);

  // Coupon
  const applyCouponCode = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('active', true)
      .maybeSingle();
    if (!data) { setCouponError('Cupom inválido ou expirado'); setCouponLoading(false); return; }
    if (data.min_order && safeSubtotal < data.min_order) {
      setCouponError(`Pedido mínimo R$ ${Number(data.min_order).toFixed(2).replace('.', ',')} para este cupom`);
      setCouponLoading(false);
      return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponError('Cupom expirado');
      setCouponLoading(false);
      return;
    }
    applyCoupon(data as Coupon);
    setCouponLoading(false);
  };

  const changeForNum    = parseFloat(changeFor.replace(',', '.')) || 0;
  const changeAmount    = paymentMethod === 'cash' && needsChange && changeForNum > orderTotal
    ? changeForNum - orderTotal
    : 0;

  // Validation — no neighborhood required
  const validateForm = () => {
    if (!customerName.trim())  return 'Informe seu nome';
    if (!customerPhone.trim()) return 'Informe seu telefone';
    if (orderType === 'delivery' && !address.trim()) return 'Informe seu endereço';
    if (paymentMethod === 'cash' && needsChange === null) return 'Informe se precisa de troco';
    if (paymentMethod === 'cash' && needsChange && changeForNum <= 0) return 'Informe o valor para troco';
    if (paymentMethod === 'cash' && needsChange && changeForNum < orderTotal)
      return `Valor para troco (R$ ${changeForNum.toFixed(2).replace('.', ',')}) deve ser maior que o total do pedido`;
    return '';
  };

  // Place order
  const placeOrder = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const err = validateForm();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);

    try {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id:          user?.id ?? null,
          customer_name:    customerName,
          customer_phone:   customerPhone,
          customer_email:   customerEmail,
          address,
          neighborhood_id:  null,
          neighborhood_name: neighborhood,
          complement,
          order_type:       orderType,
          payment_method:   paymentMethod,
          subtotal,
          delivery_fee:     deliveryFee,
          discount,
          total:            orderTotal,
          needs_change:     paymentMethod === 'cash' ? (needsChange ?? false) : false,
          change_for:       paymentMethod === 'cash' && needsChange ? changeForNum : 0,
          change_amount:    paymentMethod === 'cash' && needsChange ? changeAmount : 0,
          coupon_id:        coupon?.id ?? null,
          coupon_code:      coupon?.code ?? '',
          notes,
          estimated_time:   45,
        })
        .select()
        .single();

      if (orderErr || !order) throw orderErr ?? new Error('Erro ao criar pedido');

      await supabase.from('order_items').insert(
        items.map(item => ({
          order_id:     order.id,
          product_id:   item.product.id,
          product_name: item.product.name,
          quantity:     item.quantity,
          unit_price:   item.product.price,
          extras:       item.extras,
          notes:        item.notes,
        }))
      );

      setOrderId(order.id);

      if (paymentMethod === 'pix') {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/mercadopago-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({
              order_id:       order.id,
              amount:         orderTotal,
              customer_name:  customerName,
              customer_email: customerEmail || 'cliente@japanara.com',
              customer_phone: customerPhone,
            }),
          });
          const pixResult = await res.json();
          if (pixResult.error) {
            setError('Erro ao gerar PIX: ' + (pixResult.error || 'Tente novamente'));
            setLoading(false);
            return;
          }
          if (pixResult.qr_code) {
            setPixData({
              qr_code:        pixResult.qr_code,
              qr_code_base64: pixResult.qr_code_base64 ?? '',
              expires_at:     pixResult.expires_at ?? null,
            });
          }
        } catch {
          setError('Erro ao gerar PIX. Tente novamente.');
          setLoading(false);
          return;
        }
        setStep('pix');
      } else {
        clearCart();
        navigate(`/order/${order.id}`);
      }
    } catch {
      setError('Erro ao processar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyPix = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── PIX Step ───────────────────────────────────────────────────────────────

  if (step === 'pix') {
    const isPaid = pixStatus === 'paid';
    return (
      <div className="bg-black min-h-screen pt-24 pb-16">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-[#111] rounded-3xl overflow-hidden border border-white/10">
            <div className={`p-8 text-center border-b border-white/10 ${isPaid ? 'bg-gradient-to-br from-green-900/50 to-green-800/20' : 'bg-gradient-to-br from-red-900/30 to-[#111]'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isPaid ? 'bg-green-500/20' : 'bg-red-600/20'}`}>
                {isPaid ? <Check className="w-8 h-8 text-green-400" /> : <Smartphone className="w-8 h-8 text-red-400" />}
              </div>
              <h2 className="text-white text-2xl font-bold">{isPaid ? 'Pagamento Confirmado!' : 'Pague com PIX'}</h2>
              <p className="text-white/60 text-sm mt-2">
                Total: <span className="text-red-400 font-bold text-lg">R$ {orderTotal.toFixed(2).replace('.', ',')}</span>
              </p>
              {pixData?.expires_at && !isPaid && (
                <p className="text-white/40 text-xs mt-1">
                  QR Code válido até {new Date(pixData.expires_at).toLocaleString('pt-BR')}
                </p>
              )}
            </div>

            <div className="p-6 space-y-5">
              {isPaid ? (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-10 h-10 text-green-400" />
                  </div>
                  <p className="text-green-400 font-semibold text-lg">Pagamento aprovado!</p>
                  <p className="text-white/50 text-sm mt-1">Seu pedido está sendo preparado...</p>
                  <p className="text-white/30 text-xs mt-4">Redirecionando automaticamente...</p>
                </div>
              ) : (
                <>
                  {pixData?.qr_code_base64 ? (
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-2xl shadow-lg">
                        <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="PIX QR Code" className="w-56 h-56" />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-2xl p-8 text-center">
                      <div className="w-40 h-40 bg-white/10 rounded-xl mx-auto flex items-center justify-center">
                        <Smartphone className="w-12 h-12 text-white/30" />
                      </div>
                      <p className="text-white/40 text-sm mt-3">Gerando QR Code...</p>
                    </div>
                  )}
                  {/* Recebedor PIX */}
                  <div className="flex items-start gap-3 bg-green-950/50 border border-green-800/40 rounded-2xl px-4 py-3.5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center mt-0.5">
                      <ShieldCheck className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-green-400/70 text-xs font-medium tracking-wide uppercase mb-0.5">Pagamento destinado para</p>
                      <p className="text-green-300 text-sm font-bold leading-snug">Natasha Hennig Ferreira de Miranda</p>
                      <p className="text-green-500/60 text-xs mt-1 leading-relaxed">Confirme o nome do recebedor antes de pagar.</p>
                    </div>
                  </div>

                  {pixData?.qr_code && (
                    <div>
                      <p className="text-white/60 text-xs mb-2 font-medium">Código PIX copia e cola:</p>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                        <p className="text-white/50 text-xs flex-1 truncate font-mono">{pixData.qr_code}</p>
                        <button
                          onClick={copyPix}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            copied ? 'bg-green-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                    <p className="text-yellow-400/80 text-sm leading-relaxed">
                      <strong>Como pagar:</strong> Abra o app do seu banco, escaneie o QR Code ou cole o código PIX.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
                    <RefreshCw className={`w-3.5 h-3.5 ${pixStatus === 'checking' ? 'animate-spin' : ''}`} />
                    <span>{pixStatus === 'checking' ? 'Verificando pagamento...' : 'Verificando a cada 5s'}</span>
                  </div>
                  <button
                    onClick={checkPixStatus}
                    disabled={pixStatus === 'checking'}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${pixStatus === 'checking' ? 'animate-spin' : ''}`} />
                    Verificar pagamento agora
                  </button>
                  <button
                    onClick={() => { clearCart(); navigate(`/order/${orderId}`); }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Check className="w-5 h-5" />
                    Já realizei o pagamento
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form Step ──────────────────────────────────────────────────────────────

  return (
    <div className="bg-black min-h-screen pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/menu')}
            className="text-white/60 hover:text-white flex items-center gap-2 text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
          <h1 className="text-white text-2xl font-bold">Finalizar Pedido</h1>
        </div>

        {/* Store closed notice */}
        {!storeStatus.isOpen && (
          <div className="bg-[#111] border border-white/10 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-white/40" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Fora do horário de pedidos</p>
              <p className="text-white/40 text-sm mt-0.5">{storeStatus.message}</p>
              <p className="text-white/30 text-xs mt-1.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Funcionamos terças e quintas · Pedidos até às 19h30 · Entrega a partir das 20h30
              </p>
            </div>
          </div>
        )}
        {storeStatus.variant === 'closing-soon' && (
          <div className="bg-yellow-950/40 border border-yellow-800/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse flex-shrink-0" />
            <p className="text-yellow-400 text-sm font-medium">
              Fechando em <strong>{storeStatus.minutesUntilClose} minutos</strong> — finalize seu pedido antes das 19h30
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">

            {/* ── Dados do cliente ── */}
            <div className="bg-[#111] rounded-2xl border border-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-red-500" />
                  Seus dados
                </h3>
                <div className="flex items-center gap-2">
                  {savingProfile && (
                    <span className="text-white/30 text-xs flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Salvando...
                    </span>
                  )}
                  {profileFilled && !savingProfile && (
                    <span className="text-green-400 text-xs flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Preenchido do seu perfil
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Nome completo *</label>
                  <input
                    value={customerName}
                    onChange={e => { setCustomerName(e.target.value); scheduleProfileSave({ name: e.target.value }); }}
                    placeholder="Seu nome"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Telefone/WhatsApp *</label>
                  <input
                    value={customerPhone}
                    onChange={e => { setCustomerPhone(e.target.value); scheduleProfileSave({ phone: e.target.value }); }}
                    placeholder="(42) 99999-9999"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-white/50 text-xs mb-1.5 block">E-mail</label>
                  <input
                    value={customerEmail}
                    onChange={e => { setCustomerEmail(e.target.value); scheduleProfileSave({ email: e.target.value }); }}
                    placeholder="seu@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
              {user && (
                <p className="text-white/25 text-xs mt-3">Alterações são salvas automaticamente no seu perfil.</p>
              )}
            </div>

            {/* ── Entrega ── */}
            <div className="bg-[#111] rounded-2xl border border-white/5 p-5">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-red-500" />
                Entrega
              </h3>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {(['delivery', 'pickup'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                      orderType === type ? 'bg-red-600 text-white' : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {type === 'delivery' ? 'Delivery' : 'Retirar no local'}
                  </button>
                ))}
              </div>

              {orderType === 'pickup' && (
                <div className="bg-white/5 rounded-xl px-4 py-3 text-sm text-white/60">
                  Av. Paulo Siqueira, 2515 — Ortigueira/PR
                </div>
              )}

              {orderType === 'delivery' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Rua e número *</label>
                    <input
                      value={address}
                      onChange={e => { setAddress(e.target.value); scheduleProfileSave({ addr: e.target.value }); }}
                      placeholder="Ex: Av. Brasil, 123"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white/50 text-xs mb-1.5 block">Bairro</label>
                      <input
                        value={neighborhood}
                        onChange={e => { setNeighborhood(e.target.value); scheduleProfileSave({ nbh: e.target.value }); }}
                        placeholder="Ex: Centro"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-white/50 text-xs mb-1.5 block">Complemento</label>
                      <input
                        value={complement}
                        onChange={e => { setComplement(e.target.value); scheduleProfileSave({ comp: e.target.value }); }}
                        placeholder="Apto, bloco..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                    <span className="text-white/60">Tempo estimado de entrega</span>
                    <span className="text-white font-medium">40–60 min</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Pagamento ── */}
            <div className="bg-[#111] rounded-2xl border border-white/5 p-5">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-red-500" />
                Pagamento
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { value: 'pix',         label: 'PIX',      Icon: Smartphone, desc: 'Instantâneo'  },
                  { value: 'credit_card', label: 'Crédito',  Icon: CreditCard, desc: 'Na máquina'   },
                  { value: 'debit_card',  label: 'Débito',   Icon: CreditCard, desc: 'Na máquina'   },
                  { value: 'cash',        label: 'Dinheiro', Icon: Banknote,   desc: 'Pagamento físico' },
                ] as { value: CheckoutForm['payment_method']; label: string; Icon: any; desc: string }[]).map(method => (
                  <button
                    key={method.value}
                    onClick={() => { setPaymentMethod(method.value); setNeedsChange(null); setChangeFor(''); }}
                    className={`py-3 rounded-xl text-sm font-medium flex flex-col items-center gap-1.5 transition-all border ${
                      paymentMethod === method.value
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <method.Icon className="w-5 h-5" />
                    <span>{method.label}</span>
                    <span className="text-xs opacity-60">{method.desc}</span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'pix' && (
                <p className="text-green-400/70 text-xs mt-3 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  PIX sem taxas, aprovação em segundos
                </p>
              )}

              {/* Bloco de troco para pagamento em dinheiro */}
              {paymentMethod === 'cash' && (
                <div className="mt-4 space-y-3">
                  <p className="text-white/70 text-sm font-medium">Precisa de troco?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setNeedsChange(false); setChangeFor(''); }}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        needsChange === false
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      Não, tenho o valor exato
                    </button>
                    <button
                      onClick={() => setNeedsChange(true)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        needsChange === true
                          ? 'bg-yellow-600 border-yellow-600 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      Sim, preciso de troco
                    </button>
                  </div>

                  {needsChange === true && (
                    <div className="space-y-2">
                      <label className="text-white/50 text-xs block">Troco para quanto? (R$)</label>
                      <input
                        value={changeFor}
                        onChange={e => setChangeFor(e.target.value)}
                        placeholder="Ex: 100,00"
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-yellow-500 transition-colors"
                      />
                      {changeForNum > orderTotal && (
                        <div className="flex items-center justify-between bg-yellow-900/20 border border-yellow-800/30 rounded-xl px-4 py-2.5">
                          <span className="text-yellow-400/80 text-sm">Levar troco</span>
                          <span className="text-yellow-400 font-bold text-sm">
                            R$ {changeAmount.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {needsChange === false && (
                    <p className="text-green-400/70 text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      Sem troco necessário
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Observações ── */}
            <div className="bg-[#111] rounded-2xl border border-white/5 p-5">
              <label className="text-white/60 text-sm font-medium mb-2 block">Observações do pedido</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Alguma observação especial? (opcional)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 resize-none h-20 transition-colors"
              />
            </div>
          </div>

          {/* ── Resumo ── */}
          <div>
            <div className="bg-[#111] rounded-2xl border border-white/5 p-5 sticky top-28">
              <h3 className="text-white font-semibold mb-4">Resumo do Pedido</h3>

              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {(Array.isArray(items) ? items : []).map(item => {
                  if (!item || !item.product) return null;
                  const it = isFinite(item.itemTotal) ? item.itemTotal : 0;
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-white/60 flex-1 truncate">{item.quantity}x {item.product.name ?? ''}</span>
                      <span className="text-white ml-2 flex-shrink-0">R$ {it.toFixed(2).replace('.', ',')}</span>
                    </div>
                  );
                })}
              </div>

              {/* Cupom */}
              <div className="border-t border-white/10 pt-4 mb-4">
                <label className="text-white/50 text-xs mb-2 block">Cupom de desconto</label>
                {coupon ? (
                  <div className="flex items-center justify-between bg-green-900/20 border border-green-800/30 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm font-medium">{coupon.code}</span>
                    </div>
                    <button onClick={removeCoupon} className="text-white/30 hover:text-red-400 text-xs transition-colors">
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && applyCouponCode()}
                      placeholder="CUPOM"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 uppercase"
                    />
                    <button
                      onClick={applyCouponCode}
                      disabled={couponLoading}
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      {couponLoading ? '...' : 'OK'}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-red-400 text-xs mt-1.5">{couponError}</p>}
              </div>

              {/* Totais */}
              <div className="space-y-2 border-t border-white/10 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Subtotal</span>
                  <span className="text-white">R$ {safeSubtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {safeDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">Desconto</span>
                    <span className="text-green-400">-R$ {safeDiscount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Entrega</span>
                  <span className={freeDelivery || orderType === 'pickup' ? 'text-green-400' : 'text-white'}>
                    {orderType === 'pickup' ? 'Grátis' : freeDelivery ? 'Grátis' : 'R$ 8,00'}
                  </span>
                </div>
                <div className="flex justify-between font-bold border-t border-white/10 pt-2 mt-2">
                  <span className="text-white">Total</span>
                  <span className="text-red-500 text-lg">R$ {orderTotal.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {error && (
                <div className="mt-3 bg-red-900/20 border border-red-800/30 rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={placeOrder}
                disabled={loading}
                className="w-full mt-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-900/30"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Processando...</>
                  : <>Confirmar Pedido — R$ {orderTotal.toFixed(2).replace('.', ',')}</>
                }
              </button>

              {!user && (
                <p className="text-white/25 text-xs text-center mt-3">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-red-400/70 hover:text-red-400 underline underline-offset-2 transition-colors"
                  >
                    Entre na sua conta
                  </button>
                  {' '}para salvar seus dados e agilizar pedidos futuros
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
          itemCount={Array.isArray(items) ? items.reduce((s, i) => s + i.quantity, 0) : 0}
          orderTotal={orderTotal}
        />
      )}
    </div>
  );
}
