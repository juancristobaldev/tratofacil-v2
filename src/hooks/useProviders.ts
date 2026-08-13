import { useQuery } from '@apollo/client/react';
import { GET_PROVIDERS } from '../graphql/operations/providers';
import { EMPTY_ARRAY } from '../utils/emptyArray';

interface UseProvidersReturn {
  providers: any[];
  loading: boolean;
  error: any;
  refetch: () => void;
}

export function useProviders(): UseProvidersReturn {
  const { data, loading, error, refetch } = useQuery<{ providers: any[] }>(GET_PROVIDERS);
  return {
    providers: data?.providers ?? EMPTY_ARRAY,
    loading,
    error,
    refetch,
  };
}
