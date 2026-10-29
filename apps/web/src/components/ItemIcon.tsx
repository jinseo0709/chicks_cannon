import type { JSX } from 'react';
import type { ItemKind } from '../game/types';
import { ITEM_INFO } from '../game/items';

export function ItemIcon({ kind, className = '' }: { kind: ItemKind; className?: string }): JSX.Element {
  if (kind !== 'cushion') return <>{ITEM_INFO[kind].icon}</>;

  return (
    <svg className={`item-vector-icon ${className}`} viewBox="0 0 48 48" role="img" aria-label="알 쿠션">
      <defs>
        <linearGradient id="egg-cushion-pillow" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#8de5dd" />
          <stop offset="1" stopColor="#36aeb8" />
        </linearGradient>
        <linearGradient id="egg-cushion-shell" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff8db" />
          <stop offset="1" stopColor="#f1ca72" />
        </linearGradient>
      </defs>
      <path d="M5 28Q7 22 14 23L20 25Q24 21 29 25L35 23Q42 22 44 28L41 38Q39 42 33 41H14Q8 42 6 37Z" fill="url(#egg-cushion-pillow)" stroke="#287b88" strokeWidth="2.5" />
      <path d="M11 31Q24 36 38 30M14 37Q24 40 34 37" fill="none" stroke="#c6fff2" strokeLinecap="round" strokeWidth="1.8" opacity=".9" />
      <path d="M24 5C20 11 15 18 15 24A9 9 0 0 0 33 24C33 18 28 11 24 5Z" fill="url(#egg-cushion-shell)" stroke="#b8843e" strokeWidth="2" />
      <ellipse cx="21" cy="21" rx="2.2" ry="3.5" fill="#fff" opacity=".8" />
      <path d="M18 30Q24 34 30 30" fill="none" stroke="#fff3cc" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
