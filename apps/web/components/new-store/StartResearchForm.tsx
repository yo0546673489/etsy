'use client'

import { useState } from 'react'

const CATEGORIES = [
  { value: '', label: '🎲 רנדומלי (מומלץ)' },
  { value: 'home decor', label: '🏠 עיצוב הבית' },
  { value: 'kitchen dining', label: '🍳 מטבח' },
  { value: 'bath beauty', label: '🛁 אמבטיה ויופי' },
  { value: 'outdoor garden', label: '🌿 גינה וחוץ' },
  { value: 'art prints', label: '🎨 אמנות' },
  { value: 'candles', label: '🕯️ נרות' },
  { value: 'desk accessories', label: '💼 אביזרי שולחן' },
  { value: 'plant pots', label: '🪴 עציצים' },
]

interface Props {
  onStart: (params: { price_min: number; price_max: number; category?: string }) => void
  loading: boolean
}

export default function StartResearchForm({ onStart, loading }: Props) {
  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(500)
  const [category, setCategory] = useState('')
  const [priceError, setPriceError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (priceMin >= priceMax) {
      setPriceError('מחיר מינימום חייב להיות קטן ממחיר מקסימום')
      return
    }
    setPriceError('')
    onStart({ price_min: priceMin, price_max: priceMax, category: category || undefined })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Price range */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">טווח מחיר למוצרים (₪)</label>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1.5">מינימום</label>
            <input
              type="number"
              value={priceMin}
              onChange={e => setPriceMin(Number(e.target.value))}
              min={0}
              max={500}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-semibold text-lg focus:outline-none focus:border-[#006d43] focus:ring-2 focus:ring-[#006d43]/10 transition-all"
            />
          </div>
          <span className="text-gray-400 pb-3.5 font-light text-xl">—</span>
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1.5">מקסימום</label>
            <input
              type="number"
              value={priceMax}
              onChange={e => setPriceMax(Number(e.target.value))}
              min={50}
              max={2000}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-semibold text-lg focus:outline-none focus:border-[#006d43] focus:ring-2 focus:ring-[#006d43]/10 transition-all"
            />
          </div>
        </div>
        {priceError && <p className="mt-2 text-red-500 text-sm">{priceError}</p>}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">קטגוריה</label>
        <div className="relative">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-[#006d43] focus:ring-2 focus:ring-[#006d43]/10 transition-all appearance-none cursor-pointer"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all flex items-center justify-center gap-2 ${
          loading
            ? 'bg-[#006d43]/50 cursor-not-allowed'
            : 'bg-[#006d43] hover:bg-[#005a38] active:scale-[0.98] shadow-lg shadow-[#006d43]/20'
        }`}
      >
        {loading ? (
          <>
            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            מתחיל מחקר...
          </>
        ) : (
          <>
            🚀 התחל מחקר
          </>
        )}
      </button>
    </form>
  )
}
