import { useQuery } from '@tanstack/react-query';
import { useParams, Redirect } from 'wouter';
import { api } from '@/lib/api';

export default function AppDetailPage() {
  const params = useParams<{ appId: string }>();

  const { isLoading, error } = useQuery({
    queryKey: ['apps', params.appId],
    queryFn: () => api.apps.get(params.appId!),
    enabled: !!params.appId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return <Redirect to="/" />;
  }

  return <Redirect to={`/apps/${params.appId}/notifications`} />;
}


