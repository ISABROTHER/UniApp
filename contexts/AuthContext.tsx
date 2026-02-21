import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  member: Member | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isStudent: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: 'student' | 'owner') => Promise<{ error: string | null }>;
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
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'student' | 'owner' = 'student') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };

    if (data.user) {
      const { error: profileError } = await supabase.from('members').insert({
        id: data.user.id,
        email,
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
