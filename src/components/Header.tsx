import { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X, Clock, MapPin, User, LogOut, Settings } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../hooks/useRouter';
import { useStoreStatus } from '../hooks/useStoreStatus';

export default function Header() {
  const { itemCount, openCart } = useCart();
  const { user, signOut } = useAuth();
  const storeStatus = useStoreStatus();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Início', path: '/' },
    { label: 'Cardápio', path: '/menu' },
    { label: 'Promoções', path: '/menu#promos' },
    { label: 'Sobre', path: '/#sobre' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-black/95 backdrop-blur-md shadow-lg shadow-black/50' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 group"
          >
            <img
              src="/logo_japanara.png"
              alt="Japa Nara"
              className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-200 drop-shadow-lg"
            />
          </button>

          {/* Center info */}
          <div className="hidden md:flex items-center gap-4 text-sm text-white/60">
            {/* Live status badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
              storeStatus.variant === 'open'
                ? 'bg-green-600/10 border-green-600/30 text-green-400'
                : storeStatus.variant === 'closing-soon'
                ? 'bg-yellow-600/10 border-yellow-600/30 text-yellow-400'
                : 'bg-white/5 border-white/10 text-white/40'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                storeStatus.variant === 'open' ? 'bg-green-500 animate-pulse' :
                storeStatus.variant === 'closing-soon' ? 'bg-yellow-500 animate-pulse' :
                'bg-white/30'
              }`} />
              {storeStatus.label}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-red-500" />
              <span>Ter e Qui · até 19h30</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-red-500" />
              <span>Delivery e Retirada</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="text-white/80 hover:text-white text-sm font-medium transition-colors hover:text-red-400"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Cart + Auth + mobile menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={openCart}
              className="relative flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full transition-all duration-200 shadow-lg shadow-red-900/40 hover:scale-105 active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Carrinho</span>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-white text-red-600 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>

            {/* Auth buttons */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-all"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium hidden md:inline">
                    {user.email?.split('@')[0]}
                  </span>
                </button>

                {/* Profile dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-[#111] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-white/40 text-xs truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { navigate('/orders'); setProfileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4 text-red-500" />
                      Meus Pedidos
                    </button>
                    <button
                      onClick={() => { navigate('/profile'); setProfileOpen(false); }}
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-white/50" />
                      Meu Perfil
                    </button>
                    <button
                      onClick={async () => { await signOut(); setProfileOpen(false); navigate('/'); }}
                      className="w-full text-left px-4 py-3 text-white/70 hover:text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors border-t border-white/10"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-all"
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Entrar</span>
              </button>
            )}

            <button
              className="lg:hidden text-white p-2"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-black/95 backdrop-blur-md border-t border-white/10">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map(link => (
              <button
                key={link.path}
                onClick={() => { navigate(link.path); setMenuOpen(false); }}
                className="text-white/80 hover:text-white py-3 px-4 rounded-lg hover:bg-white/5 text-left transition-colors"
              >
                {link.label}
              </button>
            ))}

            {/* Mobile auth */}
            <div className="border-t border-white/10 mt-2 pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <button
                    onClick={() => { navigate('/orders'); setMenuOpen(false); }}
                    className="text-white py-3 px-4 rounded-lg hover:bg-white/5 text-left transition-colors flex items-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4 text-red-500" />
                    Meus Pedidos
                  </button>
                  <button
                    onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                    className="text-white py-3 px-4 rounded-lg hover:bg-white/5 text-left transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4 text-white/50" />
                    Meu Perfil
                  </button>
                  <button
                    onClick={async () => { await signOut(); setMenuOpen(false); navigate('/'); }}
                    className="text-white/70 hover:text-red-400 py-3 px-4 rounded-lg hover:bg-white/5 text-left transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { navigate('/login'); setMenuOpen(false); }}
                  className="text-white py-3 px-4 rounded-lg hover:bg-white/5 text-left transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-red-500" />
                  Entrar
                </button>
              )}
            </div>

            <div className="border-t border-white/10 mt-2 pt-3 flex flex-col gap-2 text-sm text-white/50">
              <div className="flex items-center gap-2 px-4">
                <span className={`w-2 h-2 rounded-full ${
                  storeStatus.variant === 'open' ? 'bg-green-500 animate-pulse' :
                  storeStatus.variant === 'closing-soon' ? 'bg-yellow-500 animate-pulse' :
                  'bg-white/30'
                }`} />
                <span className={
                  storeStatus.variant === 'open' ? 'text-green-400' :
                  storeStatus.variant === 'closing-soon' ? 'text-yellow-400' :
                  'text-white/40'
                }>{storeStatus.label}</span>
              </div>
              <div className="flex items-center gap-2 px-4">
                <Clock className="w-4 h-4 text-red-500" />
                <span>Ter e Qui · Pedidos até 19h30</span>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
