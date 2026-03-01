import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import { Session } from '@supabase/supabase-js';

function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@phone.studentnest.app`;
}

interface AuthContextType {
  session: Session | null;
  member: Member | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isStudent: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  signUp: (password: string, fullName: string, phone: string, role?: 'student' | 'owner') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
  resetPassword: (phone: string) => Promise<{ error: string | null }>;
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

  const signIn = async (phone: string, password: string) => {
    const email = phoneToEmail(phone.trim());
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Invalid phone number or password.' };
      }
      return { error: error.message };
    }

    return { error: null };
  };

  const signUp = async (password: string, fullName: string, phone: string, role: 'student' | 'owner' = 'student') => {
    const email = phoneToEmail(phone);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          full_name: fullName,
          phone: phone.trim(),
        },
      },
    });
    if (error) return { error: error.message };

    if (data.user) {
      const { data: existing } = await supabase
        .from('members')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase.from('members').update({
          email,
          phone: phone.trim(),
          full_name: fullName,
          role,
          membership_status: 'active',
        }).eq('id', data.user.id);
        if (updateError) return { error: updateError.message };
      } else {
        const { error: insertError } = await supabase.from('members').insert({
          id: data.user.id,
          email,
          phone: phone.trim(),
          full_name: fullName,
          role,
          membership_status: 'active',
        });
        if (insertError) return { error: insertError.message };
      }
    }

    return { error: null };
  };

  const resetPassword = async (phone: string) => {
    return {
      error: 'Password reset is not available via phone. Please contact support at support@studentnest.app for assistance.'
    };
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