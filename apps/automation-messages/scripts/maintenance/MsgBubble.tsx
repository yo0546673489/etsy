'use client';
import { useEffect, useState } from 'react';

interface Props {
  senderType: 'customer' | 'store';
  senderName: string;
  text: string;
  sentAt: string;
  pending?: boolean;
  failed?: boolean;
}

interface ListingPreview {
  title: string | null;
  image: string | null;
  price: string | null;
  url: string;
}

const MESSAGES_API = process.env.NEXT_PUBLIC_MESSAGES_API_URL || 'http://localhost:3500';

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// Extract etsy listing URLs from text
function extractEtsyUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s]*etsy\.com\/listing\/\d+[^\s]*/gi)
                || text.match(/www\.etsy\.com\/listing\/\d+[^\s]*/gi)
                || [];
  const unique = Array.from(new Set(matches));
  return unique.map(u => u.startsWith('http') ? u : 'https://' + u);
}

// Remove etsy URLs from display text
function cleanText(text: string): string {
  return text
    .replace(/https?:\/\/[^\s]*etsy\.com\/listing\/\d+[^\s]*/gi, '')
    .replace(/www\.etsy\.com\/listing\/\d+[^\s]*/gi, '')
    .trim();
}

function ListingCard({ url }: { url: string }) {
  const [preview, setPreview] = useState<ListingPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const encodedUrl = encodeURIComponent(url);
    fetch(`${MESSAGES_API}/api/listing-preview?url=${encodedUrl}`)
      .then(r => r.json())
      .then(data => { setPreview(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [url]);

  if (loading) {
    return (
      <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 flex gap-3 animate-pulse">
        <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!preview || !preview.title) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="mt-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex gap-3 overflow-hidden no-underline block"
      style={{ textDecoration: 'none' }}>
      {preview.image && (
        <img src={preview.image} alt={preview.title || ''}
          className="w-20 h-20 object-cover flex-shrink-0" />
      )}
      <div className="flex-1 p-2 min-w-0">
        <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">{preview.title}</p>
        {preview.price && (
          <p className="text-sm font-bold mt-1" style={{ color: '#e65c00' }}>
            US${preview.price}
          </p>
        )}
        <p className="text-[10px] text-gray-400 mt-1">etsy.com</p>
      </div>
    </a>
  );
}

export default function MsgBubble({ senderType, senderName, text, sentAt, pending, failed }: Props) {
  const isStore = senderType === 'store';
  const etsyUrls = extractEtsyUrls(text);
  const displayText = cleanText(text);

  return (
    <div className={`flex items-end gap-2 mb-4 px-4 ${isStore ? 'flex-row-reverse' : 'flex-row'}`}>

      {/* Avatar */}
      <div className="flex-shrink-0 mb-1">
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold overflow-hidden">
          {senderName ? senderName.charAt(0).toUpperCase() : '?'}
        </div>
      </div>

      {/* Content */}
      <div className={`flex flex-col max-w-[72%] ${isStore ? 'items-end' : 'items-start'}`}>

        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-2.5 shadow-sm w-full
          ${isStore ? 'bg-[#f0faf4] border border-[#d4edda] rounded-br-sm' : 'bg-white border border-gray-200 rounded-bl-sm'}
          ${pending || failed ? 'opacity-70' : ''}`}
        >
          {displayText && (
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800">{displayText}</p>
          )}

          {/* Product cards */}
          {etsyUrls.map(url => (
            <ListingCard key={url} url={url} />
          ))}

          {/* Time + status */}
          <div className={`flex items-center gap-1 mt-1.5 ${isStore ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] text-gray-400">{formatTime(sentAt)}</span>
            {pending && <span className="text-[10px] text-gray-400">שולח...</span>}
            {failed && <span className="text-[10px] text-red-400">נכשל ❌</span>}
            {!pending && !failed && isStore && (
              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
