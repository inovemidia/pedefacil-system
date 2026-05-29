import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types';
import ProductCard from '../components/ProductCard';
import { useRouter } from '../hooks/useRouter';
import { useStoreStatus } from '../hooks/useStoreStatus';

export default function MenuPage() {
  const { params } = useRouter();
  const storeStatus = useStoreStatus();
  const initialCategory = params.get('category') ?? 'all';

  const [products, setProducts] = useState<Product[]>([]);
  const promoProducts = products.filter(p => p.promotion);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('products').select('*, categories(*), product_extras(*)').order('display_order'),
    ]).then(([catRes, prodRes]) => {
      setCategories(catRes.data ?? []);
      setProducts(prodRes.data ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const cat = params.get('category');
    if (cat) setActiveCategory(cat);
  }, [params]);

  const filtered = products.filter(p => {
    const matchesCat = activeCategory === 'all' || p.categories?.slug === activeCategory;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const groupedByCategory = categories.reduce((acc, cat) => {
    const items = filtered.filter(p => p.categories?.slug === cat.slug);
    if (items.length > 0) acc[cat.slug] = { cat, items };
    return acc;
  }, {} as Record<string, { cat: Category; items: Product[] }>);

  return (
    <div className="bg-black min-h-screen pt-20">

      {/* Store status banner */}
      {!storeStatus.isOpen && (
        <div className="bg-[#111] border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-white/40" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Estamos fechados no momento</p>
                  <p className="text-white/40 text-xs mt-0.5">{storeStatus.message}</p>
                </div>
              </div>
              <div className="flex gap-2 ml-0 sm:ml-auto">
                {[
                  { day: 'Terça', icon: '🗓' },
                  { day: 'Quinta', icon: '🗓' },
                ].map(({ day }) => (
                  <div key={day} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-1.5">
                    <Calendar className="w-3 h-3 text-red-500" />
                    <span className="text-white/60 text-xs font-medium">{day}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-1.5">
                  <Clock className="w-3 h-3 text-red-500" />
                  <span className="text-white/60 text-xs font-medium">até 19h30</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {storeStatus.variant === 'closing-soon' && (
        <div className="bg-yellow-950/40 border-b border-yellow-800/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse flex-shrink-0" />
              <p className="text-yellow-400 text-sm font-medium">
                Fechando em breve — pedidos aceitos por mais {storeStatus.minutesUntilClose} minutos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-white/5 sticky top-16 sm:top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar no cardápio..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter icon for mobile */}
            <button className="sm:hidden flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/60 text-sm">
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === 'all'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.slug
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#111] rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/30 text-lg">Nenhum produto encontrado</p>
            <button onClick={() => { setSearch(''); setActiveCategory('all'); }} className="mt-4 text-red-500 text-sm hover:text-red-400">
              Limpar filtros
            </button>
          </div>
        ) : activeCategory !== 'all' || search ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="space-y-12">
            {Object.values(groupedByCategory).map(({ cat, items }) => (
              <div key={cat.slug} id={cat.slug}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">{cat.icon}</span>
                  <h2 className="text-white text-xl font-bold">{cat.name}</h2>
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-white/30 text-sm">{items.length} itens</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {items.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
