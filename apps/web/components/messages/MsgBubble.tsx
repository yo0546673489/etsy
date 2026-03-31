'use client';

import { MsgCardData } from '@/lib/messages-api';
import MsgAvatar from './MsgAvatar';

interface Props {
  senderType: 'customer' | 'store';
  senderName: string;
  text: string;
  sentAt: string;
  pending?: boolean;
  failed?: boolean;
  imageUrls?: string[];
  cardUrls?: string[];
  cardData?: MsgCardData;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

function cleanPrice(raw?: string): string {
  if (!raw) return '';
  const match = raw.match(/(\d[\d,]*\.?\d*)/);
  if (!match) return '';
  const num = parseFloat(match[1].replace(/,/g, ''));
  return isNaN(num) ? '' : `$${num.toFixed(2)}`;
}

function ProductCard({ card }: { card: MsgCardData }) {
  const href = card.url || '#';
  const salePrice = cleanPrice(card.salePrice);
  const origPrice = cleanPrice(card.origPrice);
  const title = (card.title || '').replace(/ [-–|] Etsy$/, '').replace(/ on Etsy$/, '').trim();

  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="mt-2 flex rounded-xl border border-gray-200 bg-white overflow-hidden hover:bg-gray-50 transition-colors"
      style={{ textDecoration: 'none', maxWidth: '280px' }}>
      {card.image && (
        <img src={card.image} alt={title || 'מוצר'} className="w-20 h-20 object-cover flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div className="flex flex-col justify-center py-2 px-3 min-w-0 flex-1">
        {title && <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2 mb-1">{title}</p>}
        <div className="flex items-center gap-2">
          {salePrice && <span className="text-sm font-bold text-red-500">{salePrice}</span>}
          {origPrice && origPrice !== salePrice && <span className="text-xs text-gray-400 line-through">{origPrice}</span>}
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">etsy.com</p>
      </div>
    </a>
  );
}

export default function MsgBubble({ senderType, senderName, text, sentAt, pending, failed, imageUrls, cardUrls, cardData }: Props) {
  const isStore = senderType === 'store';
  const hasCard = cardData && (cardData.image || cardData.title);
  const plainImages = (imageUrls || []).filter(u => !u.includes('etsy.com/listing/') && u.startsWith('http'));
  const etsyLinks = cardUrls || [];

  return (
    <div className={`flex items-end gap-2 mb-3 px-4 ${isStore ? 'flex-row-reverse' : 'flex-row'}`}>
      <MsgAvatar name={senderName} size="sm" />
      <div className={`max-w-[68%] ${isStore ? 'items-end' : 'items-start'} flex flex-col`}>
        <p className="text-[11px] text-gray-400 mb-1 px-1">{senderName}</p>
        <div className={`rounded-2xl px-4 py-2.5 shadow-sm
          ${isStore
            ? 'bg-[#1a3a2e] text-white rounded-br-sm'
            : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm'}
          ${pending || failed ? 'opacity-70' : ''}`}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>

          {hasCard && <ProductCard card={cardData!} />}

          {plainImages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {plainImages.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`תמונה ${idx + 1}`}
                    className="rounded-lg max-h-48 max-w-full object-cover border border-gray-200"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </a>
              ))}
            </div>
          )}

          {!hasCard && etsyLinks.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {etsyLinks.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                  className="text-xs underline break-all opacity-80">
                  {url.length > 60 ? url.substring(0, 57) + '...' : url}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className={`flex items-center gap-1 mt-1 px-1 ${isStore ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-400">{formatTime(sentAt)}</span>
          {!pending && !failed && isStore && (
            <span className="text-[10px] text-gray-400">נקרא</span>
          )}
          {pending && <span className="text-[10px] text-gray-400">שולח...</span>}
          {failed && <span className="text-[10px] text-red-400">נכשל ❌</span>}
        </div>
      </div>
    </div>
  );
}
