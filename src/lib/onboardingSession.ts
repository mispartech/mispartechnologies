import { supabase } from "@/integrations/supabase/client";

export type OnboardingSessionPayload = {
  step: number;
  data: Record<string, unknown>;
};

export const getOnboardingStorageKeys = (userId: string) => ({
  data: `mispar_onboarding_data:${userId}`,
  step: `mispar_onboarding_step:${userId}`,
});

export const loadOnboardingSession = async (userId: string) => {
  const { data, error } = await supabase
    .from("onboarding_sessions")
    .select("step, data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as { step: number; data: Record<string, unknown> } | null;
};

export const saveOnboardingSession = async (userId: string, payload: OnboardingSessionPayload) => {
  // Cast to bypass type issue until Supabase types regenerate
  const { error } = await supabase
    .from("onboarding_sessions")
    .upsert(
      {
        user_id: userId,
        step: payload.step,
        data: payload.data,
      } as never,
      { onConflict: "user_id" }
    );

  if (error) throw error;
};

export const deleteOnboardingSession = async (userId: string) => {
  const { error } = await supabase.from("onboarding_sessions").delete().eq("user_id", userId);
  if (error) throw error;
};
