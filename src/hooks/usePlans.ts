import { useQuery, useMutation } from '@apollo/client/react';
import {
  MY_PROVIDER_PLAN,
  REGISTER_CARD,
  INIT_PLAN,
  CANCEL_SUBSCRIPTION,
  REACTIVATE_SUBSCRIPTION,
  MY_WALLET,
  REQUEST_WITHDRAWAL,
  MY_PAYMENT_HISTORY,
  CREATE_ORDER_AD_WITH_PAYMENT,
} from '../graphql/operations/wallet';
import { useAuth } from '../context/AuthContext';
import type {
  PlanOrder,
  PlanUserOrder,
  PlanResponse,
  RegisterCardForPlanResponse,
  Wallet,
  PaymentHistoryEntry,
  PaymentHistoryResponse,
  WithdrawalResult,
} from '../types/graphql';

interface InitPlanInput {
  plan: string;
  interval?: string;
  type?: string;
  customerId: string;
  couponName?: string;
}

interface ManageSubscriptionInput {
  subscriptionFlowId: string;
  type: string;
}

interface CreateAdInput {
  adId?: number;
  categoryId?: number;
  city: string;
  couponCode?: string;
  days: number;
  favicon?: string;
  image: string;
  info: string;
  link: string;
  serviceId?: number;
  total: number;
  userId: number;
}

interface UsePlansReturn {
  providerPlan: PlanOrder | null;
  providerPlanLoading: boolean;
  marketplacePlan: PlanUserOrder | null;
  wallet: Wallet | null;
  walletLoading: boolean;
  paymentHistory: PaymentHistoryEntry[];
  paymentHistoryLoading: boolean;
  paymentHistoryError: Error | undefined;
  totalSpent: number;
  registerCard: (returnUrl: string) => Promise<RegisterCardForPlanResponse>;
  subscribe: (input: InitPlanInput) => Promise<PlanResponse>;
  subscribeLoading: boolean;
  cancelSubscription: (input: ManageSubscriptionInput) => Promise<void>;
  reactivateSubscription: (input: ManageSubscriptionInput) => Promise<void>;
  requestWithdrawal: () => Promise<WithdrawalResult>;
  withdrawalLoading: boolean;
  createAd: (input: CreateAdInput) => Promise<{ id: number; status: string; total: number }>;
  refetch: () => void;
}

export function usePlans(): UsePlansReturn {
  const { token, user } = useAuth();

  const {
    data: planData,
    loading: providerPlanLoading,
    refetch,
  } = useQuery<{ myProviderPlan: PlanOrder }>(MY_PROVIDER_PLAN, {
    skip: !token,
    fetchPolicy: 'network-only',
  });

  const {
    data: walletData,
    loading: walletLoading,
  } = useQuery<{ myWallet: Wallet }>(MY_WALLET, {
    skip: !token,
    fetchPolicy: 'network-only',
  });

  const {
    data: historyData,
    loading: paymentHistoryLoading,
    error: paymentHistoryError,
  } = useQuery<{ myPaymentHistory: PaymentHistoryResponse }>(MY_PAYMENT_HISTORY, {
    skip: !token,
    fetchPolicy: 'network-only',
  });

  const [registerCardMut] = useMutation<{
    registerCard: RegisterCardForPlanResponse;
  }>(REGISTER_CARD);

  const [initPlanMut, { loading: subscribeLoading }] = useMutation<{ initPlan: PlanResponse }>(INIT_PLAN);

  const [cancelMut] = useMutation<{ cancelSubscription: PlanResponse }>(CANCEL_SUBSCRIPTION);

  const [reactivateMut] = useMutation<{ reactivateSubscription: PlanResponse }>(REACTIVATE_SUBSCRIPTION);

  const [withdrawalMut, { loading: withdrawalLoading }] = useMutation<{ requestWithdrawal: WithdrawalResult }>(REQUEST_WITHDRAWAL);

  const [createAdMut] = useMutation<{
    createOrderAdWithPayment: { id: number; status: string; total: number };
  }>(CREATE_ORDER_AD_WITH_PAYMENT);

  const providerPlan = planData?.myProviderPlan || null;
  const marketplacePlans = user?.marketplacePlanOrders || [];
  const marketplacePlan = marketplacePlans.length > 0 ? marketplacePlans[0] : null;

  const registerCard = async (returnUrl: string) => {
    const { data: result } = await registerCardMut({ variables: { returnUrl } });
    return result!.registerCard;
  };

  const subscribe = async (input: InitPlanInput) => {
    const { data: result } = await initPlanMut({
      variables: { input },
    });
    refetch();
    return result!.initPlan;
  };

  const cancelSubscription = async (input: ManageSubscriptionInput) => {
    await cancelMut({ variables: { input } });
    refetch();
  };

  const reactivateSubscription = async (input: ManageSubscriptionInput) => {
    await reactivateMut({ variables: { input } });
    refetch();
  };

  const requestWithdrawal = async () => {
    const { data: result } = await withdrawalMut();
    refetch();
    return result!.requestWithdrawal;
  };

  const createAd = async (input: CreateAdInput) => {
    const { data: result } = await createAdMut({ variables: input });
    return result!.createOrderAdWithPayment;
  };

  return {
    providerPlan,
    providerPlanLoading,
    marketplacePlan,
    wallet: walletData?.myWallet || user?.wallet || null,
    walletLoading,
    paymentHistory: historyData?.myPaymentHistory?.payments || [],
    paymentHistoryLoading,
    paymentHistoryError,
    totalSpent: historyData?.myPaymentHistory?.totalSpent || 0,
    registerCard,
    subscribe,
    subscribeLoading,
    cancelSubscription,
    reactivateSubscription,
    requestWithdrawal,
    withdrawalLoading,
    createAd,
    refetch,
  };
}
