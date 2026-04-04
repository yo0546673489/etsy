'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import StartResearchForm from '@/components/new-store/StartResearchForm'
import { Info, Clock } from 'lucide-react'

const STEPS = [
  'המערכת תחפש נישה מנצחת לפי הפרמטרים שהגדרת',
  'תאמת שהנישה עומדת בכל הקריטריונים של המנטור',
  'תבחר 30 מוצרים מוכחים מחנויות מצליחות',
  'תכתוב כותרות, 13 תגים ותיאורים לכל מוצר',
  'תייצר 5 תמונות AI מקצועיות לכל מוצר',
  'הכל יופיע בזמן אמת — מוצר אחרי מוצר',
]

export default function NewStorePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart(params: { price_min: number; price_max: number; category?: string }) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stores/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) throw new Error('שגיאה בהתחלת המחקר')
      const { job_id } = await res.json()
      router.push(`/stores/new/${job_id}`)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#f0f2f5]" dir="rtl">
        <div className="max-w-5xl mx-auto px-6 py-10">

          {/* Page header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-[#1a2e24] mb-2">פתיחת חנות חדשה</h1>
            <p className="text-gray-500 text-lg">המערכת תחקור נישות, תבחר 30 מוצרים מנצחים ותכין הכל אוטומטית.</p>
          </div>

          {/* Two-column layout — in RTL: first child = RIGHT, second child = LEFT */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">

            {/* RIGHT (first in RTL) — Form + Stats */}
            <div className="space-y-4">

              {/* Form card */}
              <div className="bg-white rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#1a2e24]">הגדרות המחקר</h2>
                    <p className="text-gray-400 text-sm mt-0.5">הגדר את הפרמטרים להצלחה</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl">
                    🚀
                  </div>
                </div>

                <StartResearchForm onStart={handleStart} loading={loading} />

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <p className="mt-4 text-center text-gray-400 text-xs">
                  בלחיצה על הכפתור, המערכת תתחיל להשתמש בקרדיטים מחשבוך.
                </p>
              </div>

              {/* Stats card */}
              <div className="bg-gray-100 rounded-3xl px-7 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-[#006d43] text-white text-xs font-bold px-3 py-1 rounded-full">AI ENHANCED</span>
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-[#006d43]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-gray-500 text-xs mb-1">דיוק מחקר נוכחי</p>
                  <p className="text-2xl font-black text-[#1a2e24]">98.4% הצלחה בנישות</p>
                </div>
              </div>

            </div>

            {/* LEFT (second in RTL) — How it works */}
            <div className="bg-[#1a3d2b] rounded-3xl p-8 text-white">
              <div className="flex items-center justify-between mb-7">
                <h2 className="text-xl font-bold">איך זה עובד?</h2>
                <Info className="w-5 h-5 text-white/50" />
              </div>

              <ol className="space-y-5">
                {STEPS.map((step, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#006d43] flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <span className="text-white/80 text-sm leading-relaxed pt-1">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                <span className="font-bold text-white text-lg">30-60 דקות</span>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <span>:זמן משוער</span>
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              {/* Decorative waveform */}
              <div className="mt-6 flex items-end gap-[3px] h-10 opacity-30">
                {[4,7,5,9,6,8,5,7,10,6,8,5,7,9,6,8,5,7,9,6,8,5,10,7,5,8,6,9,7,5].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-[#00a86b] rounded-sm"
                    style={{ height: `${h * 4}px` }}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
