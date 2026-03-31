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

export default function MsgConversationItem({ conv, isSelected, onClick }: Props) {
  const isNew = conv.status === 'new';
  return (
    <button
      onClick={onClick}
      dir="rtl"
      className={`w-full text-right flex items-center gap-3 px-4 py-3.5 transition-colors border-b border-gray-100
        ${isSelected ? 'bg-[#006d43]/10' : 'hover:bg-gray-50'}`}
    >
      <MsgAvatar name={conv.customer_name} online={conv.status === 'open'} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-gray-400">{formatTime(conv.last_message_at)}</span>
          <span className={`text-sm truncate ${isNew ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
            {conv.customer_name}
          </span>
        </div>
        <div className="flex items-center justify-between">
          {isNew && (
            <span className="w-5 h-5 rounded-full bg-[#006d43] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              1
            </span>
          )}
          <p className={`text-xs truncate text-right flex-1 ${isNew ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
            {conv.last_message_text || conv.store_name || '—'}
          </p>
        </div>
      </div>
    </button>
  );
}
