import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import type { Product, CartExtra } from '../types';
import { useCart } from '../contexts/CartContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const [showModal, setShowModal] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<CartExtra[]>([]);
  const [notes, setNotes] = useState('');
  const [added, setAdded] = useState(false);

  const extras = product.product_extras ?? [];

  const handleQuickAdd = () => {
    if (extras.length > 0) {
      setShowModal(true);
      return;
    }
    addItem(product, [], '');
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleAddWithExtras = () => {
    addItem(product, selectedExtras, notes);
    setShowModal(false);
    setSelectedExtras([]);
    setNotes('');
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const toggleExtra = (extra: CartExtra) => {
    setSelectedExtras(prev =>
      prev.find(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);

  return (
    <>
      <div className="bg-[#111] rounded-2xl overflow-hidden border border-white/5 hover:border-red-900/40 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60">
        {/* Image */}
        <div className="relative overflow-hidden h-48">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {product.featured && (
            <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              Destaque
            </div>
          )}
          {product.serves > 1 && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
              Serve {product.serves}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-white font-semibold text-base leading-tight">{product.name}</h3>
          <p className="text-white/50 text-sm mt-1.5 leading-relaxed line-clamp-2">{product.description}</p>

          <div className="flex items-center justify-between mt-4">
            <span className="text-white font-bold text-lg">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
            <button
              onClick={handleQuickAdd}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                added
                  ? 'bg-green-600 scale-110'
                  : 'bg-red-600 hover:bg-red-700 hover:scale-110 active:scale-95 shadow-red-900/40'
              }`}
            >
              {added ? <Check className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Extras Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="text-white font-semibold">Personalize seu pedido</h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
              <div className="flex items-start gap-4">
                <img src={product.image_url} alt={product.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">{product.name}</p>
                  <p className="text-red-500 font-bold mt-1">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>

              {extras.length > 0 && (
                <div>
                  <p className="text-white/60 text-sm font-medium mb-2">Adicionais (opcional)</p>
                  <div className="space-y-2">
                    {extras.map(extra => {
                      const selected = selectedExtras.some(e => e.id === extra.id);
                      return (
                        <button
                          key={extra.id}
                          onClick={() => toggleExtra(extra)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            selected
                              ? 'border-red-600 bg-red-600/10 text-white'
                              : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              selected ? 'border-red-500 bg-red-500' : 'border-white/30'
                            }`}>
                              {selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm">{extra.name}</span>
                          </div>
                          <span className="text-sm text-red-400 font-medium">+R$ {extra.price.toFixed(2).replace('.', ',')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-white/60 text-sm font-medium mb-2">Observações (opcional)</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: sem pepino, molho à parte..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 resize-none h-20"
                />
              </div>
            </div>

            <div className="p-5 border-t border-white/10">
              <button
                onClick={handleAddWithExtras}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>
                  Adicionar — R$ {(product.price + extrasTotal).toFixed(2).replace('.', ',')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
