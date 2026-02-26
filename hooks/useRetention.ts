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
  await supabase.rpc('increment_user_stat', {
    p_user_id: userId,
    p_field: field,
  });
}

export async function awardPoints(userId: string, points: number, reason: string, referenceId?: string) {
  await supabase.rpc('award_loyalty_points', {
    p_user_id: userId,
    p_points: points,
    p_reason: reason,
    p_reference_id: referenceId || null,
  });
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
