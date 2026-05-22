import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Package, Truck, MapPin, ChevronRight, RefreshCw, Store, UtensilsCrossed, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Order } from '../types';
import { useRouter, navigate } from '../hooks/useRouter';

// ── Delivery flow ──────────────────────────────────────────────────────────
const DELIVERY_STEPS = [
  { key: 'received',         label: 'Recebido',       icon: Package,          desc: 'Seu pedido foi confirmado!' },
  { key: 'preparing',        label: 'Preparando',     icon: UtensilsCrossed,  desc: 'Nosso chef esta preparando com carinho' },
  { key: 'out_for_delivery', label: 'Saiu para Entrega', icon: Truck,         desc: 'Seu pedido esta a caminho!' },
  { key: 'delivered',        label: 'Entregue',       icon: CheckCircle,      desc: 'Entregue! Bom apetite!' },
];

// ── Pickup flow ────────────────────────────────────────────────────────────
const PICKUP_STEPS = [
  { key: 'received',         label: 'Recebido',              icon: Package,         desc: 'Seu pedido foi confirmado!' },
  { key: 'preparing',        label: 'Preparando',            icon: UtensilsCrossed, desc: 'Nosso chef esta preparando com carinho' },
  { key: 'out_for_delivery', label: 'Pronto para Retirar',   icon: Store,           desc: 'Seu pedido esta pronto! Pode vir buscar.' },
  { key: 'delivered',        label: 'Retirado',              icon: CheckCircle,     desc: 'Retirado! Bom apetite!' },
];

const STATUS_INDEX: Record<string, number> = {
  received: 0, preparing: 1, out_for_delivery: 2, delivered: 3,
};

export default function OrderStatusPage() {
  const { path } = useRouter();
  const orderId = path.split('/').pop() ?? '';
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackPhone, setTrackPhone] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackError, setTrackError] = useState('');

  const fetchOrder = async (id: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .maybeSingle();
    if (data) setOrder(data);
    setLoading(false);
  };

  useEffect(() => {
    if (orderId && orderId !== 'track') {
      fetchOrder(orderId);
      const channel = supabase
        .channel(`order-status-${orderId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, () => fetchOrder(orderId))
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const trackByPhone = async () => {
    if (!trackPhone.trim()) return;
    setIsTracking(true);
    setTrackError('');
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_phone', trackPhone.replace(/\D/g, ''))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      navigate(`/order/${data.id}`);
    } else {
      setTrackError('Nenhum pedido encontrado para este telefone');
    }
    setIsTracking(false);
  };

  // ── Track page (no orderId) ──────────────────────────────────────────────
  if (!orderId || orderId === 'track') {
    return (
      <div className="bg-black min-h-screen pt-24 pb-16 flex items-center justify-center px-4">
        <div className="bg-[#111] rounded-3xl border border-white/10 p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Rastrear Pedido</h2>
          <p className="text-white/50 text-sm mb-6">Informe seu telefone para ver o status</p>
          <div className="space-y-3">
            <input
              value={trackPhone}
              onChange={e => setTrackPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && trackByPhone()}
              placeholder="(42) 99999-9999"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500 text-center"
            />
            {trackError && <p className="text-red-400 text-sm">{trackError}</p>}
            <button onClick={trackByPhone} disabled={isTracking}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-semibold transition-all">
              {isTracking ? 'Buscando...' : 'Rastrear'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-black min-h-screen pt-24 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-black min-h-screen pt-24 flex items-center justify-center text-white/50">
        Pedido nao encontrado
      </div>
    );
  }

  const isPickup = order.order_type === 'pickup';
  const isCancelled = order.status === 'cancelled';
  const isReadyForPickup = isPickup && order.status === 'out_for_delivery';
  const isCompleted = order.status === 'delivered';

  const steps = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
  const currentStep = STATUS_INDEX[order.status] ?? 0;

  const currentStepData = steps[currentStep];

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-black min-h-screen pt-24 pb-16">
      <div className="max-w-xl mx-auto px-4 space-y-4">

        {/* Header */}
        <div className="text-center py-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${
            isCancelled  ? 'bg-red-900/50'  :
            isCompleted  ? 'bg-green-600'   :
            isReadyForPickup ? 'bg-teal-600' :
            'bg-red-600'
          }`}>
            {isCancelled    ? <XCircle   className="w-10 h-10 text-white" /> :
             isCompleted    ? <CheckCircle className="w-10 h-10 text-white" /> :
             isReadyForPickup ? <Store    className="w-10 h-10 text-white" /> :
             <Package className="w-10 h-10 text-white" />}
          </div>
          <h1 className="text-white text-2xl font-bold">
            {isCancelled ? 'Pedido Cancelado' : `Pedido #${order.order_number}`}
          </h1>
          <p className="text-white/50 text-sm mt-1">Realizado as {formatTime(order.created_at)}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${isPickup ? 'bg-white/10 text-white/60' : 'bg-blue-500/15 text-blue-400'}`}>
              {isPickup ? 'Retirada no Local' : 'Delivery'}
            </span>
          </div>
          {!isCancelled && !isPickup && order.estimated_time && (
            <p className="text-white/40 text-sm mt-2 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Tempo estimado: {order.estimated_time} minutos
            </p>
          )}
        </div>

        {/* Ready for pickup alert */}
        {isReadyForPickup && (
          <div className="bg-teal-900/30 border border-teal-500/40 rounded-2xl p-5 text-center animate-pulse-slow">
            <Store className="w-8 h-8 text-teal-400 mx-auto mb-2" />
            <p className="text-teal-300 font-bold text-lg">Seu pedido esta pronto!</p>
            <p className="text-teal-400/70 text-sm mt-1">Pode vir buscar no restaurante.</p>
            <p className="text-teal-400/50 text-xs mt-2">Av. Paulo Siqueira, 2515 — Ortigueira/PR</p>
          </div>
        )}

        {/* Progress tracker */}
        {!isCancelled && (
          <div className="bg-[#111] rounded-2xl border border-white/5 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-sm">Status do Pedido</h3>
              <button onClick={() => fetchOrder(orderId)} className="text-white/30 hover:text-white transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Steps */}
            <div className="relative">
              {/* Progress line */}
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-white/10">
                <div className="h-full bg-red-600 transition-all duration-700"
                  style={{ width: currentStep === 0 ? '0%' : `${(currentStep / (steps.length - 1)) * 100}%` }} />
              </div>

              <div className="relative flex justify-between">
                {steps.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all ${
                        done   ? 'bg-red-600' :
                        active ? 'bg-red-600 ring-2 ring-red-500/40 ring-offset-2 ring-offset-[#111]' :
                        'bg-white/8'
                      }`}>
                        <Icon className={`w-3.5 h-3.5 ${done || active ? 'text-white' : 'text-white/25'}`} />
                      </div>
                      <span className={`text-center text-xs leading-tight px-1 ${
                        done || active ? 'text-white' : 'text-white/25'
                      } ${active ? 'font-semibold' : ''}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current status message */}
            {currentStepData && (
              <div className={`mt-5 rounded-xl px-4 py-3 text-center border ${
                isReadyForPickup
                  ? 'bg-teal-600/10 border-teal-600/20'
                  : isCompleted
                  ? 'bg-green-600/10 border-green-600/20'
                  : 'bg-red-600/10 border-red-600/20'
              }`}>
                <p className={`font-medium text-sm ${
                  isReadyForPickup ? 'text-teal-400' :
                  isCompleted ? 'text-green-400' :
                  'text-red-400'
                }`}>
                  {currentStepData.desc}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Order items */}
        <div className="bg-[#111] rounded-2xl border border-white/5 p-5">
          <h3 className="text-white font-semibold mb-3">Itens do Pedido</h3>
          <div className="space-y-2">
            {order.order_items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-white/60">{item.quantity}x {item.product_name}</span>
                <span className="text-white">R$ {(Number(item.unit_price) * item.quantity).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 mt-4 pt-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Subtotal</span>
              <span className="text-white">R$ {Number(order.subtotal).toFixed(2).replace('.', ',')}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-400">Desconto</span>
                <span className="text-green-400">-R$ {Number(order.discount).toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            {Number(order.delivery_fee) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Entrega</span>
                <span className="text-white">R$ {Number(order.delivery_fee).toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1 border-t border-white/10">
              <span className="text-white">Total</span>
              <span className="text-red-500">R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        {/* Delivery address or pickup address */}
        {!isPickup && order.address && (
          <div className="bg-[#111] rounded-2xl border border-white/5 p-5">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" /> Endereco de Entrega
            </h3>
            <p className="text-white/60 text-sm">{order.address}</p>
            <p className="text-white/40 text-sm">{order.neighborhood_name}{order.complement ? ` — ${order.complement}` : ''}</p>
          </div>
        )}
        {isPickup && (
          <div className="bg-[#111] rounded-2xl border border-white/5 p-5">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Store className="w-4 h-4 text-teal-400" /> Local de Retirada
            </h3>
            <p className="text-white/70 text-sm">Av. Paulo Siqueira, 2515</p>
            <p className="text-white/40 text-sm">Ortigueira — PR</p>
          </div>
        )}

        <button onClick={() => navigate('/menu')}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all">
          Fazer Novo Pedido
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
