import { useState, useEffect } from 'react';
import { User, MapPin, Home, Loader2, CheckCircle, ArrowLeft, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../hooks/useRouter';
import type { UserProfile } from '../types';

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

export default function ProfilePage() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login'); return; }
    if (!user) return;

    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      setProfile(data ?? { email: user.email ?? '' });
      setLoading(false);
    });
  }, [user, authLoading]);

  const set = (field: keyof UserProfile) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (field === 'phone') val = formatPhone(val);
    if (field === 'zip_code') val = formatZip(val);
    setProfile(p => ({ ...p, [field]: val }));
  };

  const lookupCep = async () => {
    const cep = (profile.zip_code ?? '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setProfile(p => ({
          ...p,
          street: data.logradouro || p.street,
          neighborhood: data.bairro || p.neighborhood,
          city: data.localidade || p.city,
          state: data.uf || p.state,
        }));
      }
    } catch { /* ignore */ } finally {
      setCepLoading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSaving(true);

    const { data: updated, error: err } = await supabase.from('profiles').update({
      full_name: profile.full_name || null,
      phone: profile.phone || null,
      zip_code: profile.zip_code || null,
      street: profile.street || null,
      street_number: profile.street_number || null,
      complement: profile.complement || null,
      neighborhood: profile.neighborhood || null,
      city: profile.city || null,
      state: profile.state || null,
    }).eq('id', user.id).select().maybeSingle();

    if (err) {
      setError(`Erro ao salvar: ${err.message}`);
    } else if (!updated) {
      // No row returned = RLS blocked the update silently. Upsert as fallback.
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        role: 'customer',
        full_name: profile.full_name || null,
        phone: profile.phone || null,
        zip_code: profile.zip_code || null,
        street: profile.street || null,
        street_number: profile.street_number || null,
        complement: profile.complement || null,
        neighborhood: profile.neighborhood || null,
        city: profile.city || null,
        state: profile.state || null,
      });
      if (upsertErr) {
        setError(`Erro ao salvar: ${upsertErr.message}`);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        await refreshProfile();
      }
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await refreshProfile();
    }
    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  const field = (
    label: string,
    key: keyof UserProfile,
    opts?: { placeholder?: string; type?: string; readOnly?: boolean; maxLength?: number; hint?: string }
  ) => (
    <div>
      <label className="text-white/60 text-sm font-medium mb-2 block">{label}</label>
      <input
        type={opts?.type ?? 'text'}
        value={(profile[key] as string) ?? ''}
        onChange={set(key)}
        placeholder={opts?.placeholder}
        readOnly={opts?.readOnly}
        maxLength={opts?.maxLength}
        className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors ${opts?.readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {opts?.hint && <p className="text-white/30 text-xs mt-1">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="bg-black min-h-screen pt-20 pb-16">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
            <p className="text-white/40 text-sm">{user?.email}</p>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="ml-auto flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-4 py-2 rounded-xl text-sm transition-all"
          >
            <Package className="w-4 h-4" />
            Pedidos
          </button>
        </div>

        <form onSubmit={save} className="space-y-6">

          {/* Personal info */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-red-500" />
              <h2 className="text-white font-semibold text-sm">Dados Pessoais</h2>
            </div>
            {field('Nome Completo', 'full_name', { placeholder: 'Joao Silva' })}
            {field('Email', 'email', { type: 'email', readOnly: true, hint: 'Para alterar o email entre em contato.' })}
            {field('Telefone / WhatsApp', 'phone', { placeholder: '(11) 99999-9999', type: 'tel' })}
          </div>

          {/* Address */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Home className="w-4 h-4 text-red-500" />
              <h2 className="text-white font-semibold text-sm">Endereco de Entrega</h2>
            </div>

            {/* CEP */}
            <div>
              <label className="text-white/60 text-sm font-medium mb-2 block">CEP</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={profile.zip_code ?? ''}
                  onChange={set('zip_code')}
                  onBlur={lookupCep}
                  placeholder="00000-000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
                />
                {cepLoading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />}
              </div>
              <p className="text-white/30 text-xs mt-1">Preenchimento automatico ao sair do campo</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                {field('Rua / Avenida', 'street', { placeholder: 'Rua das Flores' })}
              </div>
              <div>
                {field('Numero', 'street_number', { placeholder: '123' })}
              </div>
            </div>

            {field('Complemento', 'complement', { placeholder: 'Apto 42, Bloco B...' })}
            {field('Bairro', 'neighborhood', { placeholder: 'Centro' })}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                {field('Cidade', 'city', { placeholder: 'Sao Paulo' })}
              </div>
              <div>
                {field('UF', 'state', { placeholder: 'SP', maxLength: 2 })}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-800/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Save */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : saved ? (
              <><CheckCircle className="w-4 h-4" /> Salvo!</>
            ) : (
              'Salvar Alteracoes'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
