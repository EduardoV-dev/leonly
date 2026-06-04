// import { supabase } from '@/lib/supabase/client';
import React from 'react';
import { useAuthStore } from '../stores/auth';

export const useAuth = () => {
  const authStore = useAuthStore();

  // React.useEffect(() => {
  //   let isMounted = true;

  //   void supabase.auth.getSession().then(({ data }) => {
  //     if (!isMounted) {
  //       return;
  //     }

  //     authStore.setToken(data.session?.access_token ?? null);
  //     authStore.setIsReady(true);
  //   });

  //   const { data } = supabase.auth.onAuthStateChange((event, session) => {
  //     console.log(event, session);
  //     authStore.setToken(session?.access_token ?? null);
  //     authStore.setIsReady(true);
  //   });

  //   return () => {
  //     isMounted = false;
  //     data.subscription.unsubscribe();
  //   };
  // }, [authStore.setIsReady, authStore.setToken]);
};
