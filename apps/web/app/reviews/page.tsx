'use client';

import { useState, useEffect } from 'react';
import { useShop } from '@/lib/shop-context';
import { useToast } from '@/lib/toast-context';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { reviewsApi, type Review, type ReviewStats } from '@/lib/api';
import { Star, RefreshCw, MessageSquare, TrendingUp, ThumbsUp } from 'lucide-react';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function StarRating({ rating, size = 4 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            `w-${size} h-${size}`,
            i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
          )}
        />
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color = 'text-[#006d43]' }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center',
          color === 'text-yellow-500' ? 'bg-yellow-50' : 'bg-green-50'
        )}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  );
}

function RatingDistribution({ distribution, total }: {
  distribution: Record<number, number>;
  total: number;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-right">התפלגות דירוגים</h3>
      <div className="space-y-3">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = distribution[rating] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={rating} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-24 justify-end">
                <StarRating rating={rating} size={3} />
              </div>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#006d43] rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 w-20 text-left">
                {count} ({percentage.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול';
  if (days < 7) return `לפני ${days} ימים`;
  if (days < 30) return `לפני ${Math.floor(days / 7)} שבועות`;
  if (days < 365) return `לפני ${Math.floor(days / 30)} חודשים`;
  return `לפני ${Math.floor(days / 365)} שנים`;
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {review.listing_image_url ? (
          <img
            src={review.listing_image_url}
            alt={review.listing_title || 'מוצר'}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-6 h-6 text-gray-300" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="font-medium text-gray-800">{review.buyer_name || 'לקוח'}</span>
              <div className="mt-1">
                <StarRating rating={review.rating} />
              </div>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {review.created_at ? formatTimeAgo(new Date(review.created_at)) : ''}
            </span>
          </div>
          {review.review_text && (
            <p className="text-gray-600 text-sm leading-relaxed mb-2 text-right">
              &quot;{review.review_text}&quot;
            </p>
          )}
          {review.listing_title && (
            <p className="text-xs text-gray-400">מוצר: {review.listing_title}</p>
          )}
          {review.seller_response && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg border-r-2 border-[#006d43]">
              <p className="text-xs text-[#006d43] font-medium mb-1">תגובתך:</p>
              <p className="text-sm text-gray-600">{review.seller_response}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const { selectedShop, selectedShopIds } = useShop();
  const { showToast } = useToast();

  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [hasTextFilter, setHasTextFilter] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState('created_desc');

  const LIMIT = 20;

  const loadData = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setCurrentOffset(0);
      } else {
        setLoadingMore(true);
      }

      const shopOpts = selectedShopIds.length > 0
        ? { shop_ids: selectedShopIds.join(',') }
        : selectedShop?.id
          ? { shop_id: selectedShop.id }
          : {};

      const newOffset = reset ? 0 : currentOffset;

      const [statsData, reviewsData] = await Promise.all([
        reviewsApi.getStats(shopOpts),
        reviewsApi.getReviews({
          ...shopOpts,
          rating: ratingFilter ?? undefined,
          has_text: hasTextFilter ?? undefined,
          sort_by: sortBy,
          limit: LIMIT,
          offset: newOffset,
        }),
      ]);

      setStats(statsData);
      setReviews(reset ? reviewsData.reviews : (prev) => [...prev, ...reviewsData.reviews]);
      setHasMore(reviewsData.has_more);
      setCurrentOffset(newOffset + reviewsData.reviews.length);
    } catch (e: any) {
      showToast(e.detail || 'שגיאה בטעינת ביקורות', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSync = async () => {
    if (!selectedShop?.id) {
      showToast('בחר חנות לסנכרון', 'error');
      return;
    }
    setSyncing(true);
    try {
      const result = await reviewsApi.syncReviews(selectedShop.id);
      showToast(`סונכרנו ${result.new_reviews} ביקורות חדשות`, 'success');
      loadData();
    } catch (e: any) {
      showToast(e.detail || 'שגיאה בסנכרון', 'error');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedShop, selectedShopIds, ratingFilter, hasTextFilter, sortBy]);

  const positivePercentage = stats
    ? Math.round(((stats.rating_distribution[5] + stats.rating_distribution[4]) / Math.max(stats.total_reviews, 1)) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="max-w-[1300px] mx-auto space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ביקורות ודירוגים</h1>
            <p className="text-gray-500 text-sm mt-1">
              {selectedShop?.display_name || 'כל החנויות'} • {stats?.total_reviews || 0} ביקורות
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || !selectedShop}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              syncing || !selectedShop
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#006d43] text-white hover:bg-[#005535]'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
            {syncing ? 'מסנכרן...' : 'סנכרן ביקורות'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006d43]" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Star} label="דירוג ממוצע" value={stats?.average_rating_display || '0.00'} subtext="מתוך 5 כוכבים" color="text-yellow-500" />
              <StatCard icon={MessageSquare} label='סה"כ ביקורות' value={stats?.total_reviews || 0} />
              <StatCard icon={TrendingUp} label="30 יום אחרונים" value={stats?.reviews_last_30_days || 0} subtext="ביקורות חדשות" />
              <StatCard icon={ThumbsUp} label="חיוביות" value={`${positivePercentage}%`} subtext="4-5 כוכבים" />
            </div>

            {/* Rating Distribution */}
            {stats && <RatingDistribution distribution={stats.rating_distribution} total={stats.total_reviews} />}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <select value={ratingFilter ?? ''} onChange={(e) => setRatingFilter(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006d43]">
                <option value="">כל הדירוגים</option>
                <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                <option value="4">⭐⭐⭐⭐ (4)</option>
                <option value="3">⭐⭐⭐ (3)</option>
                <option value="2">⭐⭐ (2)</option>
                <option value="1">⭐ (1)</option>
              </select>
              <select value={hasTextFilter === null ? '' : String(hasTextFilter)} onChange={(e) => setHasTextFilter(e.target.value === '' ? null : e.target.value === 'true')}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006d43]">
                <option value="">כל הביקורות</option>
                <option value="true">עם טקסט</option>
                <option value="false">בלי טקסט</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006d43]">
                <option value="created_desc">החדשות קודם</option>
                <option value="created_asc">הישנות קודם</option>
                <option value="rating_desc">דירוג גבוה קודם</option>
                <option value="rating_asc">דירוג נמוך קודם</option>
              </select>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">אין ביקורות</h3>
                  <p className="text-gray-400">לחץ על &quot;סנכרן ביקורות&quot; כדי לייבא ביקורות מ-Etsy</p>
                </div>
              ) : (
                reviews.map((review) => <ReviewCard key={review.id} review={review} />)
              )}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center">
                <button onClick={() => loadData(false)} disabled={loadingMore}
                  className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                  {loadingMore ? 'טוען...' : 'טען עוד ביקורות'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
