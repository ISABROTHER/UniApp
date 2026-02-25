import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import { Session } from '@supabase/supabase-js';

const DEV_PHONE = '0576040160';
const DEV_PASSWORD = '1234567890';

const DEV_MEMBER: Member = {
  id: 'dev-user-001',
  student_id: 'STU-2025-001',
  full_name: 'Dev User',
  email: 'dev@test.com',
  phone: DEV_PHONE,
  date_of_birth: null,
  gender: null,
  faculty: null,
  department: null,
  level: null,
  hall_of_residence: null,
  avatar_url: null,
  membership_status: 'active',
  role: 'student',
  ghana_card_number: null,
  id_verified: false,
  id_verified_at: null,
  joined_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEV_SESSION = {
  access_token: 'dev-token',
  refresh_token: 'dev-refresh',
  expires_in: 999999,
  token_type: 'bearer',
  user: {
    id: 'dev-user-001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'dev@test.com',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
} as unknown as Session;

interface AuthContextType {
  session: Session | null;
  member: Member | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isStudent: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, phone: string, role?: 'student' | 'owner') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  member: null,
  isLoading: true,
  isAdmin: false,
  isOwner: false,
  isStudent: true,
  signIn: async (_phone: string, _password: string) => ({ error: null }),
  signUp: async (_email: string, _password: string, _fullName: string, _phone: string) => ({ error: null }),
  signOut: async () => {},
  refreshMember: async () => {},
  resetPassword: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMember = async (userId: string) => {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setMember(data as Member | null);
  };

  const refreshMember = async () => {
    if (session?.user?.id) {
      await fetchMember(session.user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user?.id) {
        fetchMember(s.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user?.id) {
        (async () => {
          await fetchMember(s.user.id);
        })();
      } else {
        setMember(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (phone: string, password: string) => {
    if (phone.trim() === DEV_PHONE && password === DEV_PASSWORD) {
      setSession(DEV_SESSION);
      setMember(DEV_MEMBER);
      return { error: null };
    }

    const { data: memberData, error: lookupError } = await supabase
      .from('members')
      .select('email')
      .eq('phone', phone.trim())
      .maybeSingle();

    if (lookupError) return { error: lookupError.message };
    if (!memberData?.email) return { error: 'No account found with this phone number.' };

    const { error } = await supabase.auth.signInWithPassword({ email: memberData.email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string, role: 'student' | 'owner' = 'student') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };

    if (data.user) {
      const { error: profileError } = await supabase.from('members').insert({
        id: data.user.id,
        email,
        phone: phone.trim(),
        full_name: fullName,
        role,
        membership_status: 'active',
      });
      if (profileError) return { error: profileError.message };
    }

    return { error: null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMember(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        member,
        isLoading,
        isAdmin: member?.role === 'admin',
        isOwner: member?.role === 'owner',
        isStudent: !member || member?.role === 'student',
        signIn,
        signUp,
        signOut,
        refreshMember,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
