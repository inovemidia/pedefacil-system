import { X, Plus, Minus, Trash2, ShoppingBag, Tag, ChevronRight } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { navigate } from '../hooks/useRouter';

export default function CartDrawer() {
  const cart = useCart();

  // Guard: context not yet available or cart closed
  if (!cart || !cart.isOpen) return null;

  const { items, closeCart, removeItem, updateQuantity, subtotal, discount, coupon, itemCount } = cart;

  // Ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];
  const safeSubtotal = isFinite(subtotal) ? subtotal : 0;
  const safeDiscount = isFinite(discount) ? discount : 0;
  const safeCount = typeof itemCount === 'number' && isFinite(itemCount) ? itemCount : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#111] z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-red-500" />
            <h2 className="text-white font-semibold text-lg">Seu Pedido</h2>
            {safeCount > 0 && (
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {safeCount}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-4">
          {safeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-white/30" />
              </div>
              <div>
                <p className="text-white/60 font-medium">Seu carrinho está vazio</p>
                <p className="text-white/30 text-sm mt-1">Adicione itens do cardápio para começar</p>
              </div>
              <button
                onClick={() => { navigate('/menu'); closeCart(); }}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors mt-2"
              >
                Ver Cardápio
              </button>
            </div>
          ) : (
            <div className="px-4 space-y-3">
              {safeItems.map(item => {
                if (!item || !item.product) return null;
                const itemTotal = isFinite(item.itemTotal) ? item.itemTotal : 0;
                const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
                const extras = Array.isArray(item.extras) ? item.extras : [];
                return (
                  <div key={item.id} className="bg-white/5 rounded-xl p-3.5 flex gap-3">
                    <img
                      src={item.product.image_url || ''}
                      alt={item.product.name || ''}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm leading-tight truncate">
                        {item.product.name ?? ''}
                      </p>
                      {extras.length > 0 && (
                        <p className="text-white/40 text-xs mt-0.5 truncate">
                          + {extras.map(e => e?.name ?? '').join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-white/40 text-xs mt-0.5 italic truncate">{item.notes}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeItem && removeItem(item.id)}
                            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-white font-medium text-sm w-4 text-center">{quantity}</span>
                          <button
                            onClick={() => updateQuantity && updateQuantity(item.id, quantity + 1)}
                            className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-sm">
                            R$ {itemTotal.toFixed(2).replace('.', ',')}
                          </span>
                          <button
                            onClick={() => removeItem && removeItem(item.id)}
                            className="text-white/30 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {safeItems.length > 0 && (
          <div className="border-t border-white/10 px-5 py-4 space-y-3">
            {coupon && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-green-400">
                  <Tag className="w-4 h-4" />
                  <span>{coupon.code}</span>
                </div>
                <span className="text-green-400">-R$ {safeDiscount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Subtotal</span>
              <span className="text-white font-medium">R$ {safeSubtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/40">
              <span>Taxa de entrega</span>
              <span>Calculada no checkout</span>
            </div>
            <button
              onClick={() => { navigate('/checkout'); closeCart(); }}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-900/40"
            >
              <span>Fazer Pedido</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
