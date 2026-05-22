import { Clock } from 'lucide-react';
import { useStoreStatus } from '../hooks/useStoreStatus';

interface Props {
  size?: 'sm' | 'md';
  showMessage?: boolean;
}

export default function StoreStatusBadge({ size = 'md', showMessage = false }: Props) {
  const status = useStoreStatus();

  const dotColor =
    status.variant === 'open' ? 'bg-green-500' :
    status.variant === 'closing-soon' ? 'bg-yellow-500' :
    'bg-red-500';

  const textColor =
    status.variant === 'open' ? 'text-green-400' :
    status.variant === 'closing-soon' ? 'text-yellow-400' :
    'text-red-400';

  const borderColor =
    status.variant === 'open' ? 'border-green-600/30 bg-green-600/10' :
    status.variant === 'closing-soon' ? 'border-yellow-600/30 bg-yellow-600/10' :
    'border-red-600/30 bg-red-600/10';

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${borderColor} ${textColor}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${status.isOpen ? 'animate-pulse' : ''}`} />
        {status.label}
      </span>
    );
  }

  return (
    <div className={`inline-flex flex-col gap-0.5 px-4 py-2 rounded-full border ${borderColor}`}>
      <div className={`flex items-center gap-2 ${textColor}`}>
        <span className={`w-2 h-2 rounded-full ${dotColor} ${status.isOpen ? 'animate-pulse' : ''}`} />
        <span className="font-semibold text-sm">{status.label}</span>
      </div>
      {showMessage && (
        <div className="flex items-center gap-1.5 pl-4">
          <Clock className="w-3 h-3 text-white/30" />
          <span className="text-white/40 text-xs">{status.message}</span>
        </div>
      )}
    </div>
  );
}
