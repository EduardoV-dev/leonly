import { supabase } from '@/lib/supabase';
import { useMutation } from '@tanstack/react-query';

const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
};

export const useLoginWithGoogle = () => {
  return useMutation({
    mutationFn: loginWithGoogle,
  });
};
