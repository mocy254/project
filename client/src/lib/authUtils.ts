// From blueprint:javascript_log_in_with_replit
// Handle unauthorized errors by redirecting to login
export function handleUnauthorized(error: any) {
  if (error?.message?.includes('Unauthorized') || error?.status === 401) {
    window.location.href = '/api/login';
  }
}
