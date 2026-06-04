import { supabase } from '@/lib/supabase';
import React from 'react';
import { useAuthStore } from '../stores/auth';

export const useAuth = () => {
  const authStore = useAuthStore();

  React.useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(event, session);
      authStore.setToken(session?.access_token ?? null);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [authStore.setToken]);
};
