const BASE = '/api/cp';

async function cpRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.detail || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type AccessStatus = 'none' | 'pending' | 'approved' | 'denied';
export type FeatureType = 'messaging' | 'discounts' | 'automations';

export interface DashboardStats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_shops: number;
  features: { messaging: number; discounts: number; automations: number };
}

export interface Customer {
  tenant_id: number;
  org_name: string;
  email: string;
  user_name: string;
  billing_tier: string;
  status: string;
  email_verified: boolean;
  last_login_at: string | null;
  shop_count: number;
  member_count: number;
  messaging_access: AccessStatus;
  discounts_access: AccessStatus;
  automations_access: AccessStatus;
  created_at: string;
}

export interface CustomerDetails {
  tenant_id: number;
  org_name: string;
  billing_tier: string;
  status: string;
  onboarding_completed: boolean;
  messaging_access: AccessStatus;
  discounts_access: AccessStatus;
  automations_access: AccessStatus;
  created_at: string;
  members: { id: number; email: string; name: string; role: string; email_verified: boolean; last_login_at: string | null; created_at: string; }[];
  shops: { id: number; etsy_shop_id: string; display_name: string; status: string; product_count: number; order_count: number; created_at: string; }[];
}

export const cpApi = {
  login: (password: string) =>
    cpRequest<{ ok: boolean }>('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () =>
    cpRequest<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  getDashboard: () =>
    cpRequest<DashboardStats>('/dashboard'),
  getCustomers: () =>
    cpRequest<Customer[]>('/customers'),
  getCustomerDetails: (id: number) =>
    cpRequest<CustomerDetails>(`/customers/${id}`),
  deleteCustomer: (id: number) =>
    cpRequest<{ ok: boolean }>(`/customers/${id}`, { method: 'DELETE' }),
  grantByEmail: (email: string, feature: FeatureType) =>
    cpRequest<{ ok: boolean }>('/permissions/grant-by-email', { method: 'POST', body: JSON.stringify({ email, feature }) }),
  approveFeature: (tenantId: number, feature: FeatureType) =>
    cpRequest<{ ok: boolean }>(`/permissions/${tenantId}/${feature}/approve`, { method: 'POST' }),
  revokeFeature: (tenantId: number, feature: FeatureType) =>
    cpRequest<{ ok: boolean }>(`/permissions/${tenantId}/${feature}/revoke`, { method: 'POST' }),
};
