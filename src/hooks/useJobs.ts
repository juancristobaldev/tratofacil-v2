import { useQuery, useMutation } from '@apollo/client/react';
import { useMemo } from 'react';
import {
  GET_JOBS,
  GET_JOB,
  MY_JOBS,
  MY_APPLICATIONS,
  CREATE_JOB,
  UPDATE_JOB,
  REMOVE_JOB,
  APPLY_TO_JOB,
  CREATE_ORDER_JOB_WITH_PAYMENT,
  CREATE_REVIEW_JOB,
} from '../graphql/operations/jobs';
import { useAuth } from '../context/AuthContext';
import { EMPTY_ARRAY } from '../utils/emptyArray';
import type {
  Job,
  JobApplication,
  OrderJob,
} from '../types/graphql';

interface CreateJobInput {
  title: string;
  description?: string;
  price?: number;
  location?: string;
}

interface UpdateJobInput {
  id: number;
  title?: string;
  description?: string;
  price?: number;
  location?: string;
}

interface CreateOrderInput {
  jobId: number;
  workerId?: number;
}

interface ReviewsJobInput {
  rating: number;
  comment?: string;
  workerId: number;
  jobId: number;
}

interface UseJobsReturn {
  jobs: Job[];
  jobsLoading: boolean;
  jobsError: any;
  refetchJobs: () => void;
  myJobs: Job[];
  myJobsLoading: boolean;
  myJobsError: any;
  myApplications: JobApplication[];
  applicationsLoading: boolean;
  myOfferOrders: OrderJob[];
  fetchJobs: (city?: string, skip?: number, take?: number) => void;
  createJob: (input: CreateJobInput) => Promise<{ id: number; title: string; price: number }>;
  createLoading: boolean;
  updateJob: (input: UpdateJobInput) => Promise<void>;
  removeJob: (id: number) => Promise<void>;
  applyToJob: (jobId: number, message?: string) => Promise<void>;
  createOrder: (input: CreateOrderInput) => Promise<{ id: number; status: string; total: number }>;
  reviewJob: (input: ReviewsJobInput) => Promise<void>;
  refetchMyJobs: () => void;
}

export function useJobs(): UseJobsReturn {
  const { token } = useAuth();

  const {
    data: jobsData,
    loading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs,
  } = useQuery<{ jobs: Job[] }>(GET_JOBS, {
    variables: { skip: 0, take: 20 },
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  const {
    data: myJobsData,
    loading: myJobsLoading,
    error: myJobsError,
    refetch: refetchMyJobs,
  } = useQuery<{ myJobs: Job[] }>(MY_JOBS, {
    fetchPolicy: 'network-only',
    skip: !token,
  });

  const {
    data: appsData,
    loading: applicationsLoading,
  } = useQuery<{ myApplications: JobApplication[] }>(MY_APPLICATIONS, {
    fetchPolicy: 'network-only',
    skip: !token,
  });

  const [createMut, { loading: createLoading }] = useMutation<{
    createJob: { id: number; title: string; price: number };
  }>(CREATE_JOB);

  const [updateMut] = useMutation(UPDATE_JOB);
  const [removeMut] = useMutation(REMOVE_JOB);
  const [applyMut] = useMutation(APPLY_TO_JOB);
  const [createOrderMut] = useMutation<{
    createOrderJobWithPayment: { id: number; status: string; total: number };
  }>(CREATE_ORDER_JOB_WITH_PAYMENT);
  const [reviewMut] = useMutation(CREATE_REVIEW_JOB);

  const myJobOrders = useMemo(
    () => (myJobsData?.myJobs || []).flatMap((job) => job.orders || []) as OrderJob[],
    [myJobsData],
  );

  const createJob = async (input: CreateJobInput) => {
    const { data: result } = await createMut({
      variables: { input },
      refetchQueries: ['MyJobs'],
    });
    return result!.createJob;
  };

  const updateJob = async (input: UpdateJobInput) => {
    await updateMut({ variables: { input }, refetchQueries: ['MyJobs'] });
  };

  const removeJob = async (id: number) => {
    await removeMut({ variables: { id }, refetchQueries: ['MyJobs'] });
  };

  const applyToJob = async (jobId: number, message?: string) => {
    await applyMut({ variables: { jobId, message } });
  };

  const createOrder = async (input: CreateOrderInput) => {
    const { data: result } = await createOrderMut({
      variables: { input: { jobId: input.jobId, workerId: input.workerId } },
    });
    return result!.createOrderJobWithPayment;
  };

  const reviewJob = async (input: ReviewsJobInput) => {
    await reviewMut({ variables: { input } });
    refetchMyJobs();
  };

  const fetchJobs = (city?: string, skip?: number, take?: number) => {
    refetchJobs({ city, skip: skip ?? 0, take: take ?? 20 });
  };

  return {
    jobs: jobsData?.jobs ?? EMPTY_ARRAY,
    jobsLoading,
    jobsError,
    refetchJobs: () => refetchJobs({ skip: 0, take: 20 }),
    myJobs: myJobsData?.myJobs ?? EMPTY_ARRAY,
    myJobsLoading,
    myJobsError,
    myApplications: appsData?.myApplications ?? EMPTY_ARRAY,
    applicationsLoading,
    myOfferOrders: myJobOrders,
    fetchJobs,
    createJob,
    createLoading,
    updateJob,
    removeJob,
    applyToJob,
    createOrder,
    reviewJob,
    refetchMyJobs,
  };
}
