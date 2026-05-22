// Japa Nara operating hours
// Open: Tuesday (2) and Thursday (4)
// Orders accepted until 19:30
// Pickup/delivery starts at 20:30

export interface StoreStatus {
  isOpen: boolean;           // accepting orders right now
  isOperating: boolean;      // kitchen is open (20:30+)
  label: string;             // short status label
  message: string;           // full descriptive message
  nextOpenDay: string | null; // e.g. "quinta-feira"
  minutesUntilClose: number | null; // minutes left before order cutoff
  variant: 'open' | 'closing-soon' | 'closed';
}

const OPEN_DAYS = [2, 4]; // Tuesday=2, Thursday=4 (JS: 0=Sun)
const ORDER_CUTOFF_H = 19;
const ORDER_CUTOFF_M = 30;
const KITCHEN_START_H = 20;
const KITCHEN_START_M = 30;

const DAY_NAMES = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function toMinutes(h: number, m: number) { return h * 60 + m; }

export function getStoreStatus(now: Date = new Date()): StoreStatus {
  const day = now.getDay();
  const currentMinutes = toMinutes(now.getHours(), now.getMinutes());
  const cutoffMinutes = toMinutes(ORDER_CUTOFF_H, ORDER_CUTOFF_M);
  const kitchenMinutes = toMinutes(KITCHEN_START_H, KITCHEN_START_M);

  const isOpenDay = OPEN_DAYS.includes(day);
  const isBeforeCutoff = currentMinutes < cutoffMinutes;
  const isAfterKitchenStart = currentMinutes >= kitchenMinutes;
  const minutesUntilClose = isOpenDay && isBeforeCutoff ? cutoffMinutes - currentMinutes : null;
  const closingSoon = minutesUntilClose !== null && minutesUntilClose <= 30;

  const isOpen = isOpenDay && isBeforeCutoff;
  const isOperating = isOpenDay && isAfterKitchenStart;

  // Find next open day
  let nextOpenDay: string | null = null;
  if (!isOpen) {
    for (let i = 1; i <= 7; i++) {
      const nextDay = (day + i) % 7;
      if (OPEN_DAYS.includes(nextDay)) {
        nextOpenDay = DAY_NAMES[nextDay];
        break;
      }
    }
  }

  if (isOpen && closingSoon) {
    return {
      isOpen: true,
      isOperating,
      label: 'Fechando em breve',
      message: `Pedidos até às 19h30 · Ainda restam ${minutesUntilClose} min`,
      nextOpenDay: null,
      minutesUntilClose,
      variant: 'closing-soon',
    };
  }

  if (isOpen) {
    return {
      isOpen: true,
      isOperating,
      label: 'Aberto',
      message: 'Aceitando pedidos até às 19h30 · Entrega a partir das 20h30',
      nextOpenDay: null,
      minutesUntilClose,
      variant: 'open',
    };
  }

  return {
    isOpen: false,
    isOperating: false,
    label: 'Fechado',
    message: nextOpenDay ? `Abrimos ${nextOpenDay} · Pedidos até às 19h30` : 'Fechado',
    nextOpenDay,
    minutesUntilClose: null,
    variant: 'closed',
  };
}

export function getOpenDaysText() {
  return 'Terça e Quinta';
}

export function getHoursText() {
  return 'Pedidos até 19h30 · Entrega a partir de 20h30';
}

export function getDayShortName(dayIndex: number) {
  return DAY_NAMES_SHORT[dayIndex];
}
