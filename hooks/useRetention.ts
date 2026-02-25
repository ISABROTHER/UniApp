import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useActivityLogger() {
  const logActivity = useCallback(async (params: {
    action_type: string;
    title: string;
    subtitle?: string;
    reference_id?: string;
    reference_type?: string;
    icon_name?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_activity_logs').insert({
      user_id: user.id,
      ...params,
    });
  }, []);

  return { logActivity };
}

export async function ensureUserStats(userId: string) {
  const { data } = await supabase
    .from('user_stats')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    await supabase.from('user_stats').insert({ user_id: userId });
  }
}

export async function incrementStat(userId: string, field: string) {
  await ensureUserStats(userId);
  const { data } = await supabase.from('user_stats').select('*').eq('user_id', userId).maybeSingle();
  if (data) {
    const current = (data as any)[field] || 0;
    await supabase.from('user_stats').update({ [field]: current + 1, last_active_at: new Date().toISOString() }).eq('user_id', userId);
  }
}

export async function ensureLoyaltyBalance(userId: string) {
  const { data } = await supabase
    .from('loyalty_balances')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    await supabase.from('loyalty_balances').insert({ user_id: userId });
  }
}

export async function awardPoints(userId: string, points: number, reason: string, referenceId?: string) {
  await ensureLoyaltyBalance(userId);

  await supabase.from('loyalty_points').insert({
    user_id: userId,
    transaction_type: 'earn',
    points,
    reason,
    reference_id: referenceId || null,
  });

  const { data: balance } = await supabase
    .from('loyalty_balances')
    .select('total_points, lifetime_earned')
    .eq('user_id', userId)
    .maybeSingle();

  if (balance) {
    const newTotal = balance.total_points + points;
    const newLifetime = balance.lifetime_earned + points;
    const tier =
      newLifetime >= 5000 ? 'platinum' :
      newLifetime >= 2000 ? 'gold' :
      newLifetime >= 500 ? 'silver' : 'bronze';

    await supabase.from('loyalty_balances').update({
      total_points: newTotal,
      lifetime_earned: newLifetime,
      tier,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);
  }
}

export async function ensureOnboardingSteps(userId: string) {
  const { data } = await supabase
    .from('onboarding_steps')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    await supabase.from('onboarding_steps').insert({ user_id: userId });
  }
}

export async function markOnboardingStep(userId: string, step: 'profile_complete' | 'first_search' | 'first_favourite' | 'first_booking' | 'first_service_use') {
  await ensureOnboardingSteps(userId);

  const { data } = await supabase
    .from('onboarding_steps')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data || data[step]) return;

  const updated = { [step]: true, updated_at: new Date().toISOString() } as any;

  const steps = ['profile_complete', 'first_search', 'first_favourite', 'first_booking', 'first_service_use'];
  const allComplete = steps.every(s => s === step ? true : data[s]);
  if (allComplete) updated.completed_at = new Date().toISOString();

  await supabase.from('onboarding_steps').update(updated).eq('user_id', userId);
}
