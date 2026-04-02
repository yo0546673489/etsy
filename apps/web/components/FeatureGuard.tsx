'use client';
import { useFeatureAccess } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function FeatureGuard({ feature, children }: {
  feature: 'messages' | 'discounts' | 'automations';
  children: React.ReactNode;
}) {
  const access = useFeatureAccess();
  const router = useRouter();
  const allowed = { messages: access.hasMessages, discounts: access.hasDiscounts, automations: access.hasAutomations }[feature];
  useEffect(() => { if (allowed === false) router.replace('/dashboard/owner'); }, [allowed, router]);
  if (!allowed) return null;
  return <>{children}</>;
}
