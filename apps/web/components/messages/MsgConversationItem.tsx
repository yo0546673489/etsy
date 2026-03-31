'use client';
import { MsgConversation } from '@/lib/messages-api';
import MsgAvatar from './MsgAvatar';

interface Props {
  conv: MsgConversation;
  isSelected: boolean;
  onClick: () => void;
}

function formatTime(ts: string | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  if (diff < 7 * 86400000) return d.toLocaleDateString('he-IL', { weekday: 'short' });
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

// Extract clean customer name — remove "X from ShopName" pattern
function cleanName(name: string): string {
  // "יאיר from RawRootsFurniture" → "יאיר"
  const fromIdx = name.indexOf(' from ');
  if (fromIdx > 0) return name.substring(0, fromIdx).trim();
  return name;
}

export default function MsgConversationItem({ conv, isSelected, onClick }: Props) {
  const isNew = conv.status === 'new' && !isSelected;
  const displayName = cleanName(conv.customer_name);

  return (
    <button
      onClick={onClick}
      dir="rtl"
      className={`w-full text-right flex items-center gap-3 px-4 py-3.5 transition-colors border-b border-gray-100
        ${isSelected ? 'bg-[#006d43]/10' : 'hover:bg-gray-50'}`}
    >
      <MsgAvatar name={displayName} online={conv.status === 'open'} />
      <div className="flex-1 min-w-0">
        {/* Row 1: name + time */}
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(conv.last_message_at)}</span>
          <span className={`text-sm truncate mr-2 ${isNew ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
            {displayName}
          </span>
        </div>
        {/* Row 2: preview + unread dot */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isNew && (
              <span className="w-2 h-2 rounded-full bg-[#006d43] flex-shrink-0" />
            )}
          </div>
          <p className={`text-xs truncate text-right flex-1 ${isNew ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
            {conv.last_message_text || '—'}
          </p>
        </div>
      </div>
    </button>
  );
}
