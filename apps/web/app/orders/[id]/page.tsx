'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ordersApi, OrderDetail } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { normalizeOrderStatus, normalizePaymentStatus } from '@/lib/order-status';
import {
  ArrowRight,
  Package,
  MapPin,
  Truck,
  CreditCard,
  User,
  Hash,
  CheckCircle2,
  Loader2,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed:  { label: 'הושלם',  cls: 'bg-green-100 text-green-700' },
    in_transit: { label: 'בדרך',   cls: 'bg-blue-100 text-blue-700' },
    processing: { label: 'בתהליך', cls: 'bg-yellow-100 text-yellow-700' },
    cancelled:  { label: 'בוטל',   cls: 'bg-red-100 text-red-700' },
    refunded:   { label: 'הוחזר',  cls: 'bg-gray-100 text-gray-600' },
  };
  const s = map[normalizeOrderStatus(status)] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', s.cls)}>{s.label}</span>;
}

function PaymentBadge({ status }: { status: string }) {
  const isPaid = normalizePaymentStatus(status) === 'paid';
  return (
    <span className={cn(
      'px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 w-fit',
      isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', isPaid ? 'bg-green-500' : 'bg-yellow-500')} />
      {isPaid ? 'שולם' : 'לא שולם'}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-gray-800 text-sm font-medium">{value}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isRTL } = useLanguage();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingCode, setTrackingCode] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [fulfilling, setFulfilling] = useState(false);

  const isSupplier = user?.role?.toLowerCase() === 'supplier';

  const ETSY_CARRIERS = [
    'USPS', 'UPS', 'FedEx', 'DHL', 'TNT', 'Aramex',
    'LaserShip', 'ABF Freight', 'OnTrac', 'Direct Link', 'YRC Freight',
    'Asendia USA', 'UPS Freight', 'Skynet Worldwide Express', 'Evergreen',
    'Estes', 'RL Carriers', 'i-parcel', 'APC Postal Logistics', 'Greyhound',
    'uShip', 'Amazon Logistics US', 'Freightquote by C. H. Robinson',
    'Courier Express', 'ePost Global', 'FedEx Cross Border', 'UDS',
    'Spee-Dee', 'Better Trucks', 'GSO', 'CDL', 'Spring GDS',
    'Tusk Logistics', 'Passport Shipping', 'Israel Post',
    'Other', 'Not Available',
  ];
  const [carrierMode, setCarrierMode] = useState<'select' | 'custom'>('select');

  useEffect(() => {
    if (!orderId) return;
    ordersApi.getById(orderId)
      .then(data => {
        setOrder(data);
        setTrackingCode(data.tracking_code || '');
      })
      .catch(() => showToast('שגיאה בטעינת ההזמנה', 'error'))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function handleFulfill() {
    if (!trackingCode.trim()) { showToast('הכנס מספר מעקב', 'error'); return; }
    setFulfilling(true);
    try {
      await ordersApi.fulfill(orderId, { tracking_code: trackingCode, carrier_name: carrierName || undefined });
      showToast('ההזמנה סומנה כנשלחה', 'success');
      const updated = await ordersApi.getById(orderId);
      setOrder(updated);
    } catch {
      showToast('שגיאה בעדכון ההזמנה', 'error');
    } finally {
      setFulfilling(false);
    }
  }

  async function handleSaveTracking() {
    if (!trackingCode.trim()) { showToast('הכנס מספר מעקב', 'error'); return; }
    setFulfilling(true);
    try {
      await ordersApi.recordTracking(orderId, { tracking_code: trackingCode, carrier_name: carrierName || undefined });
      showToast('מספר מעקב עודכן', 'success');
    } catch {
      showToast('שגיאה בעדכון', 'error');
    } finally {
      setFulfilling(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#006d43]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-gray-400">ההזמנה לא נמצאה</div>
      </DashboardLayout>
    );
  }

  const addr = order.shipping_address;
  const addressStr = addr
    ? [addr.first_line, addr.city, addr.state, addr.zip, addr.country_iso].filter(Boolean).join(', ')
    : null;
  const isShipped = ['in_transit', 'completed'].includes(normalizeOrderStatus(order.lifecycle_status || order.status));

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-6 py-8" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/orders')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה להזמנות
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <h1 className="text-xl font-bold text-gray-800">
            הזמנה #{order.order_id || order.etsy_receipt_id || order.id}
          </h1>
          <StatusBadge status={order.lifecycle_status || order.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main — items + address + shipping */}
          <div className="lg:col-span-2 space-y-5">

            {/* Items */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#006d43]" />
                פריטים
              </h2>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-3">
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm leading-tight">
                          {item.title || item.listing_title}
                        </p>
                        {item.sku && <p className="text-xs text-gray-400 mt-0.5">SKU: {item.sku}</p>}
                        {item.variations?.length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.variations.map((v: any) => `${v.property_name}: ${v.value}`).join(' | ')}
                          </p>
                        )}
                      </div>
                      <div className="text-left flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">×{item.quantity}</p>
                        {!isSupplier && item.price != null && (
                          <p className="text-xs text-gray-500">
                            {(item.price / 100).toFixed(2)} {order.currency}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">אין פריטים</p>
              )}
            </div>

            {/* Address */}
            {addressStr && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#006d43]" />
                  כתובת משלוח
                </h2>
                <p className="text-sm text-gray-700 leading-relaxed">{addressStr}</p>
              </div>
            )}

            {/* Tracking / Fulfill */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#006d43]" />
                משלוח ומעקב
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">מספר מעקב</label>
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={e => setTrackingCode(e.target.value)}
                    placeholder="לדוג׳: 1Z999AA10123456784"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006d43] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">חברת שליחויות</label>
                  {carrierMode === 'select' ? (
                    <select
                      value={ETSY_CARRIERS.includes(carrierName) ? carrierName : ''}
                      onChange={e => {
                        if (e.target.value === '__custom__') {
                          setCarrierMode('custom');
                          setCarrierName('');
                        } else {
                          setCarrierName(e.target.value);
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006d43] transition-colors"
                    >
                      <option value="">— בחר חברת שליחויות —</option>
                      {ETSY_CARRIERS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__custom__">✏️ הכנס חברה אחרת...</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={carrierName}
                        onChange={e => setCarrierName(e.target.value)}
                        placeholder="שם חברת השליחויות"
                        autoFocus
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006d43] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => { setCarrierMode('select'); setCarrierName(''); }}
                        className="px-3 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-xs hover:bg-gray-200 transition-colors"
                      >
                        ← רשימה
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  {!isShipped && (
                    <button
                      onClick={handleFulfill}
                      disabled={fulfilling}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#006d43] text-white rounded-xl text-sm font-semibold hover:bg-[#005a38] disabled:opacity-50 transition-colors"
                    >
                      {fulfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      סמן כנשלח
                    </button>
                  )}
                  <button
                    onClick={handleSaveTracking}
                    disabled={fulfilling}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    שמור מעקב
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Order details */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#006d43]" />
                פרטי הזמנה
              </h2>
              <InfoRow label="מספר הזמנה" value={order.order_id || order.etsy_receipt_id || String(order.id)} />
              <InfoRow label="תאריך" value={new Date(order.created_at).toLocaleDateString('he-IL')} />
              {order.tracking_code && <InfoRow label="מעקב" value={order.tracking_code} />}
              <div className="mt-3">
                <PaymentBadge status={order.payment_status} />
              </div>
            </div>

            {/* Buyer */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-[#006d43]" />
                קונה
              </h2>
              <InfoRow label="שם" value={order.buyer_name} />
              {!isSupplier && <InfoRow label="אימייל" value={order.buyer_email} />}
            </div>

            {/* Total */}
            {!isSupplier && order.total_price != null && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#006d43]" />
                  סכום
                </h2>
                <p className="text-2xl font-black text-[#006d43]">
                  {order.total_price.toFixed(2)} {order.currency}
                </p>
              </div>
            )}

          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
