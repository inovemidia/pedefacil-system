import { useEffect, useState } from 'react';
import { ChevronRight, Star, Clock, Truck, Shield, Award, ChevronDown, MapPin, Phone, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types';
import ProductCard from '../components/ProductCard';
import { navigate } from '../hooks/useRouter';
import { useStoreStatus } from '../hooks/useStoreStatus';

const reviews = [
  { name: 'Ana Carolina', rating: 5, text: 'Melhor sushi de Ortigueira! Ingredientes fresquíssimos e entrega super rápida. Virei cliente fiel!', avatar: 'AC', time: '2 dias atrás' },
  { name: 'Rafael Mendes', rating: 5, text: 'O combinado vale cada centavo. Sashimi de salmão derretia na boca. Simplesmente incrível!', avatar: 'RM', time: '3 dias atrás' },
  { name: 'Juliana Santos', rating: 5, text: 'Pedi pelo site, chegou em 35 minutos e estava fresquíssimo. O temaki de salmão é perfeito!', avatar: 'JS', time: '5 dias atrás' },
  { name: 'Pedro Alves', rating: 5, text: 'Atendimento excelente e qualidade consistente em todos os pedidos. Recomendo muito!', avatar: 'PA', time: '1 semana atrás' },
];

export default function HomePage() {
  const storeStatus = useStoreStatus();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('*, categories(*)').eq('featured', true).eq('active', true).limit(6),
      supabase.from('categories').select('*').eq('active', true).order('display_order'),
    ]).then(([productsRes, categoriesRes]) => {
      setFeatured(productsRes.data ?? []);
      setCategories(categoriesRes.data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="bg-black min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg"
            alt="Sushi Japa Nara"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 pt-36">
          <div className="max-w-2xl">
            {/* Live store status */}
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border ${
              storeStatus.variant === 'open'
                ? 'bg-green-600/20 border-green-600/30'
                : storeStatus.variant === 'closing-soon'
                ? 'bg-yellow-600/20 border-yellow-600/30'
                : 'bg-white/5 border-white/10'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                storeStatus.variant === 'open' ? 'bg-green-500 animate-pulse' :
                storeStatus.variant === 'closing-soon' ? 'bg-yellow-500 animate-pulse' :
                'bg-white/30'
              }`} />
              <span className={`text-sm font-medium ${
                storeStatus.variant === 'open' ? 'text-green-400' :
                storeStatus.variant === 'closing-soon' ? 'text-yellow-400' :
                'text-white/50'
              }`}>
                {storeStatus.variant === 'open' && 'Aberto · Aceitando pedidos agora'}
                {storeStatus.variant === 'closing-soon' && `Fechando em breve · ${storeStatus.minutesUntilClose} min restantes`}
                {storeStatus.variant === 'closed' && (storeStatus.nextOpenDay ? `Fechado · Abrimos ${storeStatus.nextOpenDay}` : 'Fechado no momento')}
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.02] mb-4 tracking-tight">
              Japa Nara
              <br />
              <span className="text-red-500">Japanese Food</span>
            </h1>

            <p className="text-white/65 text-lg sm:text-xl leading-relaxed mb-3 max-w-lg">
              Sushi artesanal com ingredientes frescos, sabor autêntico e entrega rápida em Ortigueira.
            </p>

            <div className="flex items-center gap-2 mb-8 text-white/50 text-sm">
              <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>Av. Paulo Siqueira, 2515 — Ortigueira/PR</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/menu')}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-red-900/40"
              >
                Ver Cardápio
                <ChevronRight className="w-5 h-5" />
              </button>
              <a
                href="https://wa.me/5542988586416?text=Ol%C3%A1%2C%20gostaria%20de%20fazer%20um%20pedido%20%F0%9F%8D%A3"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Phone className="w-5 h-5" />
                WhatsApp
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/10">
              {[
                { label: 'Pedidos hoje', value: '100+' },
                { label: 'Avaliação média', value: '4.9★' },
                { label: 'Tempo médio', value: '40 min' },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-white font-black text-2xl sm:text-3xl">{stat.value}</p>
                  <p className="text-white/45 text-xs sm:text-sm mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/35" />
        </div>
      </section>

      {/* Features */}
      <section className="py-14 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Truck,    title: 'Entrega Rápida',     desc: 'Em até 45 minutos' },
              { icon: Shield,   title: 'Pagamento Seguro',    desc: 'PIX e cartão' },
              { icon: Award,    title: 'Ingredientes Frescos', desc: 'Qualidade premium' },
              { icon: Calendar, title: 'Ter e Qui',           desc: 'Pedidos até 19h30' },
            ].map(item => (
              <div key={item.title} className="flex flex-col items-center text-center gap-3 p-5 bg-white/3 rounded-2xl border border-white/5 hover:border-red-900/30 transition-colors">
                <div className="w-11 h-11 bg-red-600/12 rounded-xl flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Store Hours Banner */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 ${
            storeStatus.isOpen
              ? 'bg-gradient-to-r from-green-950/60 to-green-900/20 border-green-800/30'
              : 'bg-gradient-to-r from-[#111] to-[#0e0e0e] border-white/5'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  storeStatus.isOpen ? 'bg-green-600/20' : 'bg-white/5'
                }`}>
                  <Clock className={`w-5 h-5 ${storeStatus.isOpen ? 'text-green-400' : 'text-white/40'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      storeStatus.variant === 'open' ? 'bg-green-500 animate-pulse' :
                      storeStatus.variant === 'closing-soon' ? 'bg-yellow-500 animate-pulse' :
                      'bg-white/20'
                    }`} />
                    <span className={`font-bold text-sm ${
                      storeStatus.variant === 'open' ? 'text-green-400' :
                      storeStatus.variant === 'closing-soon' ? 'text-yellow-400' :
                      'text-white/50'
                    }`}>{storeStatus.label}</span>
                  </div>
                  <p className="text-white font-semibold text-base">{storeStatus.message}</p>
                  {!storeStatus.isOpen && storeStatus.nextOpenDay && (
                    <p className="text-white/40 text-sm mt-0.5">
                      Próxima abertura: <span className="text-white/60 capitalize">{storeStatus.nextOpenDay}</span> a partir das 20h30
                    </p>
                  )}
                </div>
              </div>

              {/* Schedule pills */}
              <div className="flex flex-col gap-2 text-sm flex-shrink-0">
                {[
                  { day: 'Terça-feira', hours: 'Pedidos até 19h30 · Entrega 20h30+' },
                  { day: 'Quinta-feira', hours: 'Pedidos até 19h30 · Entrega 20h30+' },
                ].map(({ day, hours }) => (
                  <div key={day} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
                    <Calendar className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span className="text-white font-medium">{day}</span>
                    <span className="text-white/40 hidden sm:inline">·</span>
                    <span className="text-white/40 hidden sm:inline">{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-red-500 text-sm font-semibold uppercase tracking-wider mb-2">Explore</p>
              <h2 className="text-white text-3xl sm:text-4xl font-black">Categorias</h2>
            </div>
            <button
              onClick={() => navigate('/menu')}
              className="text-white/45 hover:text-red-400 text-sm flex items-center gap-1 transition-colors"
            >
              Ver tudo <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => navigate(`/menu?category=${cat.slug}`)}
                className="bg-[#111] hover:bg-[#181818] border border-white/5 hover:border-red-900/40 rounded-2xl p-4 flex flex-col items-center gap-2.5 transition-all hover:-translate-y-1 group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                <span className="text-white font-medium text-xs text-center leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Promo Banner */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-900 via-red-800 to-red-700 p-8 sm:p-10">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white translate-x-1/3 -translate-y-1/3" />
              <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full bg-white -translate-x-1/3 translate-y-1/3" />
            </div>
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <p className="text-red-200 text-sm font-semibold uppercase tracking-wider mb-1">Oferta de Boas-vindas</p>
                <h3 className="text-white text-2xl sm:text-3xl font-black leading-tight">
                  10% OFF no<br />primeiro pedido.
                </h3>
                <p className="text-red-200 mt-2 text-sm">Use o cupom <strong className="text-white bg-white/10 px-2 py-0.5 rounded-md">JAPANARA10</strong> no checkout</p>
              </div>
              <button
                onClick={() => navigate('/menu')}
                className="bg-white text-red-700 px-7 py-3.5 rounded-full font-bold text-sm hover:bg-red-50 transition-colors whitespace-nowrap flex-shrink-0 shadow-lg"
              >
                Aproveitar Agora
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-red-500 text-sm font-semibold uppercase tracking-wider mb-2">Os preferidos</p>
              <h2 className="text-white text-3xl sm:text-4xl font-black">Mais Pedidos</h2>
            </div>
            <button
              onClick={() => navigate('/menu')}
              className="text-white/45 hover:text-red-400 text-sm flex items-center gap-1 transition-colors"
            >
              Ver cardápio <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#111] rounded-2xl h-72 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <button
              onClick={() => navigate('/menu')}
              className="bg-transparent border border-white/20 hover:border-red-600/50 text-white hover:text-red-400 px-8 py-3.5 rounded-full font-semibold transition-all"
            >
              Ver cardápio completo
            </button>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="sobre" className="py-16 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-red-500 text-sm font-semibold uppercase tracking-wider mb-2">Avaliações</p>
            <h2 className="text-white text-3xl sm:text-4xl font-black">O que nossos clientes dizem</h2>
            <div className="flex items-center justify-center gap-1 mt-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              ))}
              <span className="text-white/60 text-sm ml-2">4.9 de 5</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {reviews.map(review => (
              <div key={review.name} className="bg-[#111] border border-white/5 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {review.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{review.name}</p>
                    <p className="text-white/30 text-xs">{review.time}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-red-500 text-sm font-semibold uppercase tracking-wider mb-3">Pronto para pedir?</p>
          <h2 className="text-white text-4xl sm:text-5xl font-black leading-tight mb-4">
            Faça seu pedido agora
          </h2>
          <p className="text-white/55 text-lg mb-8">
            Entregamos em Ortigueira em até 45 minutos
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/menu')}
              className="bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-full font-bold text-lg flex items-center gap-2 mx-auto sm:mx-0 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-red-900/40"
            >
              Ver Cardápio
              <ChevronRight className="w-5 h-5" />
            </button>
            <a
              href="https://wa.me/5542988586416?text=Ol%C3%A1%2C%20gostaria%20de%20fazer%20um%20pedido%20%F0%9F%8D%A3"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-full font-bold text-lg flex items-center gap-2 mx-auto sm:mx-0 transition-all hover:scale-105 active:scale-95"
            >
              <Phone className="w-5 h-5" />
              (42) 98858-0416
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
