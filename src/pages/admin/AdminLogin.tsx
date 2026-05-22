import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { navigate } from '../../hooks/useRouter';

export default function AdminLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError('Email ou senha inválidos');
    } else {
      navigate('/admin/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo_japanara.png"
              alt="Japa Nara"
              className="h-20 w-auto object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-white text-2xl font-black">Área Administrativa</h1>
          <p className="text-white/50 text-sm mt-1">Japa Nara · Japanese Food</p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#111] rounded-2xl border border-white/10 p-6 space-y-4">
          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@sushidelivery.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Senha</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all mt-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Entrando...</> : 'Entrar'}
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="mt-4 w-full text-white/30 hover:text-white text-sm text-center transition-colors"
        >
          Voltar ao site
        </button>
      </div>
    </div>
  );
}
