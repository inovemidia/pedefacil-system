import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, User, Phone, MapPin, Home, CheckCircle, ArrowRight, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../hooks/useRouter';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Login form ──────────────────────────────────────────────────────────────

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
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
      setError('Email ou senha incorretos. Verifique seus dados.');
      setLoading(false);
      return;
    }
    const returnTo = sessionStorage.getItem('checkout_return');
    sessionStorage.removeItem('checkout_return');
    navigate(returnTo === 'checkout' ? '/checkout' : '/menu');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-white/60 text-xs font-medium mb-1.5 block">Email</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="text-white/60 text-xs font-medium mb-1.5 block">Senha</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-11 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
          />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-red-900/30"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Entrando...</> : <>Entrar<ArrowRight className="w-4 h-4" /></>}
      </button>

      <p className="text-center text-white/40 text-sm pt-2">
        Nao tem conta?{' '}
        <button type="button" onClick={onSwitch} className="text-red-400 hover:text-red-300 font-medium transition-colors">
          Cadastrar gratis
        </button>
      </p>
    </form>
  );
}

// ─── Signup form ─────────────────────────────────────────────────────────────

interface SignupData {
  full_name: string; email: string; phone: string;
  password: string; confirmPassword: string;
  zip_code: string; street: string; street_number: string;
  complement: string; neighborhood: string; city: string; state: string;
}

const EMPTY: SignupData = {
  full_name: '', email: '', phone: '', password: '', confirmPassword: '',
  zip_code: '', street: '', street_number: '', complement: '', neighborhood: '', city: '', state: '',
};

function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const { signUp } = useAuth();
  const [form, setForm] = useState<SignupData>(EMPTY);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<'account' | 'address'>('account');
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

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
      if (!data.erro) {
        setForm(f => ({
          ...f,
          street: data.logradouro || f.street,
          neighborhood: data.bairro || f.neighborhood,
          city: data.localidade || f.city,
          state: data.uf || f.state,
        }));
      }
    } catch { /* ignore */ }
    finally { setCepLoading(false); }
  };

  const validateStep1 = () => {
    if (!form.full_name.trim()) return 'Informe seu nome completo';
    if (!form.email.trim()) return 'Informe seu email';
    if (!form.phone.replace(/\D/g, '') || form.phone.replace(/\D/g, '').length < 10) return 'Informe um telefone valido';
    if (form.password.length < 6) return 'Senha deve ter ao menos 6 caracteres';
    if (form.password !== form.confirmPassword) return 'As senhas nao coincidem';
    return '';
  };

  const validateStep2 = () => {
    if (!form.zip_code.replace(/\D/g, '')) return 'Informe o CEP';
    if (!form.street.trim()) return 'Informe a rua';
    if (!form.street_number.trim()) return 'Informe o numero';
    if (!form.neighborhood.trim()) return 'Informe o bairro';
    if (!form.city.trim()) return 'Informe a cidade';
    return '';
  };

  const goToAddress = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep('address');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);

    const { error: signupErr } = await signUp({
      email: form.email,
      password: form.password,
      full_name: form.full_name,
      phone: form.phone,
      zip_code: form.zip_code,
      street: form.street,
      street_number: form.street_number,
      complement: form.complement,
      neighborhood: form.neighborhood,
      city: form.city,
      state: form.state,
    });

    if (signupErr) {
      const msg = signupErr.message || '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('Este email ja esta cadastrado. Faca login.');
      } else {
        setError(msg || 'Erro ao criar conta. Tente novamente.');
      }
      setLoading(false);
      return;
    }

    // signUp() already handles sign-in and profile fetch internally
    setDone(true);
    const returnTo = sessionStorage.getItem('checkout_return');
    sessionStorage.removeItem('checkout_return');
    setTimeout(() => navigate(returnTo === 'checkout' ? '/checkout' : '/menu'), 1200);
  };

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-white text-xl font-bold mb-1">Conta criada!</h3>
        <p className="text-white/50 text-sm">Abrindo o cardapio...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Step bar */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${step === 'account' ? 'bg-red-600/20 text-red-400 border border-red-800/40' : 'bg-green-600/10 text-green-400 border border-green-800/30'}`}>
          <User className="w-3.5 h-3.5" />
          Dados pessoais
        </div>
        <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${step === 'address' ? 'bg-red-600/20 text-red-400 border border-red-800/40' : 'bg-white/5 text-white/30 border border-white/10'}`}>
          <MapPin className="w-3.5 h-3.5" />
          Endereco
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-xl px-4 py-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {step === 'account' && (
        <div className="space-y-3">
          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">Nome completo *</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type="text" value={form.full_name} onChange={set('full_name')} placeholder="Joao Silva"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type="email" value={form.email} onChange={set('email')} placeholder="seu@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">Telefone / WhatsApp *</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="(42) 99999-9999"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
          </div>

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
              <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-11 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="button" onClick={goToAddress}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-red-900/30">
            Continuar
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-white/40 text-sm pt-1">
            Ja tem conta?{' '}
            <button type="button" onClick={onSwitch} className="text-red-400 hover:text-red-300 font-medium transition-colors">
              Entrar
            </button>
          </p>
        </div>
      )}

      {step === 'address' && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-start gap-2 mb-1">
            <Home className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-white/60 text-xs leading-relaxed">
              Informe seu endereco para delivery automatico no checkout.
            </p>
          </div>

          {/* CEP */}
          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">CEP *</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type="text" value={form.zip_code} onChange={set('zip_code')} onBlur={lookupCep}
                placeholder="00000-000"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
              {cepLoading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />}
            </div>
            <p className="text-white/25 text-xs mt-1">Preenchimento automatico ao sair do campo</p>
          </div>

          {/* Street + Number */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Rua / Avenida *</label>
              <input type="text" value={form.street} onChange={set('street')} placeholder="Av. Brasil"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Numero *</label>
              <input type="text" value={form.street_number} onChange={set('street_number')} placeholder="123"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
          </div>

          {/* Complement */}
          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">Complemento</label>
            <input type="text" value={form.complement} onChange={set('complement')} placeholder="Apto 42, Bloco B..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
          </div>

          {/* Neighborhood */}
          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">Bairro *</label>
            <input type="text" value={form.neighborhood} onChange={set('neighborhood')} placeholder="Centro"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
          </div>

          {/* City + State */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Cidade *</label>
              <input type="text" value={form.city} onChange={set('city')} placeholder="Ortigueira"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Estado</label>
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

// ─── Main export: auth landing page ─────────────────────────────────────────

export default function LoginPage() {
  const { loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top brand bar */}
      <div className="flex-shrink-0 pt-12 pb-8 text-center px-4">
        <div className="flex items-center justify-center mb-3">
          <img src="/logo_japanara.png" alt="Japa Nara" className="h-16 w-auto object-contain drop-shadow-lg" />
        </div>
        <p className="text-white/40 text-sm">Culinaria japonesa em Ortigueira</p>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="w-full max-w-sm">
          <div className="bg-[#111] border border-white/8 rounded-3xl p-6 shadow-2xl">
            {/* Tab switcher */}
            <div className="flex bg-white/5 rounded-2xl p-1 mb-6">
              <button
                onClick={() => setTab('login')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'login' ? 'bg-white text-black shadow' : 'text-white/50 hover:text-white'}`}
              >
                Entrar
              </button>
              <button
                onClick={() => setTab('signup')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'signup' ? 'bg-white text-black shadow' : 'text-white/50 hover:text-white'}`}
              >
                Criar conta
              </button>
            </div>

            {tab === 'login'
              ? <LoginForm onSwitch={() => setTab('signup')} />
              : <SignupForm onSwitch={() => setTab('login')} />
            }
          </div>

          <p className="text-white/20 text-xs text-center mt-6 px-4 leading-relaxed">
            Ao continuar voce concorda com nossos termos de uso e politica de privacidade.
          </p>
        </div>
      </div>
    </div>
  );
}
