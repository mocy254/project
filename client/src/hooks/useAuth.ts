import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import type { User } from '@shared/schema';

// From blueprint:javascript_log_in_with_replit
export function useAuth() {
  // Fetch current user
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: Infinity,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      window.location.href = '/api/login';
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      window.location.href = '/api/logout';
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: () => loginMutation.mutate(),
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}
