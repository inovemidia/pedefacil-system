import { useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ProductCard';

export default function PromotionsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('products')
      .select('*, categories(*)')
      .eq('active', true)
      .then(({ data }) => {
        setProducts(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-black pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-red-600/20 rounded-2xl flex items-center justify-center">
            <Percent className="w-6 h-6 text-red-500" />
          </div>

          <div>
            <p className="text-red-500 text-sm font-semibold uppercase tracking-wider">
              Ofertas especiais
            </p>

            <h1 className="text-3xl sm:text-4xl font-black text-white">
              Promoções
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="text-white">
            Carregando...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}