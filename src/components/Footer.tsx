import { MapPin, Phone, Clock, Instagram } from 'lucide-react';
import { navigate } from '../hooks/useRouter';
import { useStoreStatus } from '../hooks/useStoreStatus';

export default function Footer() {
  const storeStatus = useStoreStatus();
  return (
    <footer className="bg-[#0a0a0a] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/40">
                <span className="text-white font-black text-sm">JN</span>
              </div>
              <div>
                <span className="text-white font-black text-xl">Japa</span>
                <span className="text-red-500 font-black text-xl"> Nara</span>
                <p className="text-white/30 text-xs tracking-widest uppercase -mt-0.5">Japanese Food</p>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-sm">
              A autêntica experiência da culinária japonesa direto na sua porta.
              Ingredientes frescos, receitas tradicionais e muito sabor em cada pedido.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://www.instagram.com/japanara"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/5 hover:bg-red-600 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-all"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/5542988586416?text=Ol%C3%A1%2C%20gostaria%20de%20fazer%20um%20pedido%20%F0%9F%8D%A3"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/5 hover:bg-green-600 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-all"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Navegação</h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Início', path: '/' },
                { label: 'Cardápio', path: '/menu' },
                { label: 'Meus Pedidos', path: '/orders' },
                { label: 'Rastrear Pedido', path: '/track' },
              ].map(link => (
                <li key={link.label}>
                  <button
                    onClick={() => navigate(link.path)}
                    className="text-white/50 hover:text-red-400 text-sm transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contato</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-white/50 text-sm">
                  Av. Paulo Siqueira, 2515<br />
                  Ortigueira – PR
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-red-500 flex-shrink-0" />
                <a
                  href="tel:+5542988586416"
                  className="text-white/50 hover:text-white text-sm transition-colors"
                >
                  (42) 98858-6416
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      storeStatus.variant === 'open' ? 'bg-green-500 animate-pulse' :
                      storeStatus.variant === 'closing-soon' ? 'bg-yellow-500 animate-pulse' :
                      'bg-white/20'
                    }`} />
                    <span className={`text-xs font-semibold ${
                      storeStatus.variant === 'open' ? 'text-green-400' :
                      storeStatus.variant === 'closing-soon' ? 'text-yellow-400' :
                      'text-white/30'
                    }`}>{storeStatus.label}</span>
                  </div>
                  <p className="text-white/50 text-sm">Terça e Quinta-feira</p>
                  <p className="text-white/35 text-xs mt-0.5">Pedidos até 19h30</p>
                  <p className="text-white/35 text-xs">Entrega a partir de 20h30</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs">© 2025 Japa Nara. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className="text-white/15 hover:text-white/35 text-xs transition-colors">
              Área Admin
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
