import { useQuery } from '@apollo/client/react';
import { GET_PROVIDERS } from '../graphql/operations/providers';

interface UseProvidersReturn {
  providers: any[];
  loading: boolean;
  error: any;
  refetch: () => void;
}

export function useProviders(): UseProvidersReturn {
  const { data, loading, error, refetch } = useQuery<{ providers: any[] }>(GET_PROVIDERS);
  return {
    providers: data?.providers || [],
    loading,
    error,
    refetch,
  };
}
