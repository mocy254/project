import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    retry: false,
  });

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(["session"], session);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const user = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    firstName: session.user.user_metadata?.first_name,
    lastName: session.user.user_metadata?.last_name,
    profileImageUrl: session.user.user_metadata?.avatar_url,
  } : null;

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
  };
}
