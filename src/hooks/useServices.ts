import type { CreateServiceInput, UpdateServiceInput } from '../graphql/generated';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  MY_SERVICES,
  CREATE_SERVICE,
  UPDATE_SERVICE,
  DELETE_SERVICE,
} from '../graphql/operations/services';
import type { Service, ServiceProvider } from '../graphql/generated';
import { EMPTY_ARRAY } from '../utils/emptyArray';

type CreateServiceInput_old = {
  categoryId: number;
  city: string;
  description?: string;
  hasHomeVisit: boolean;
  price: number;
  slug: string;
}

type UpdateServiceInput_old = {
  price?: number;
  hasHomeVisit?: boolean;
  description?: string;
  slug?: string;
}

interface CreateServiceResult {
  id: number;
  price: number;
  hasHomeVisit: boolean;
  description: string;
  slug: string;
  providerId: number;
  serviceId: number;
  service: { id: number; name: string; slug: string };
}

interface UseServicesReturn {
  myServices: Service[];
  myServicesLoading: boolean;
  myServicesError: any;
  createService: (input: CreateServiceInput) => Promise<CreateServiceResult>;
  createLoading: boolean;
  updateService: (id: number, input: UpdateServiceInput) => Promise<void>;
  deleteService: (id: number) => Promise<void>;
  refetch: () => void;
}

export function useServices(): UseServicesReturn {
  const { data, loading: myServicesLoading, error: myServicesError, refetch } = useQuery<{
    myServices: Service[];
  }>(MY_SERVICES, { fetchPolicy: 'network-only' });

  const [createMut, { loading: createLoading }] = useMutation<{
    createService: CreateServiceResult;
  }>(CREATE_SERVICE, {
    refetchQueries: ['MyServices'],
  });

  const [updateMut] = useMutation(UPDATE_SERVICE, {
    refetchQueries: ['MyServices'],
  });

  const [deleteMut] = useMutation(DELETE_SERVICE, {
    refetchQueries: ['MyServices'],
  });

  const createService = async (input: CreateServiceInput): Promise<CreateServiceResult> => {
    const { data: result } = await createMut({ variables: { input } });
    return result!.createService;
  };

  const updateService = async (id: number, input: UpdateServiceInput): Promise<void> => {
    await updateMut({ variables: { id, input } });
  };

  const deleteService = async (id: number): Promise<void> => {
    await deleteMut({ variables: { id } });
  };

  return {
    myServices: data?.myServices ?? EMPTY_ARRAY,
    myServicesLoading,
    myServicesError,
    createService,
    createLoading,
    updateService,
    deleteService,
    refetch,
  };
}
