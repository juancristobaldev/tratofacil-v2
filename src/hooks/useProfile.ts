import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_PUBLIC_PROFILE,
  ADD_PROVIDER_PORTFOLIO_ITEM,
  DELETE_PROVIDER_PORTFOLIO_ITEM,
  UPDATE_PROVIDER_PORTFOLIO_ITEM,
} from '../graphql/operations/providers';
import { SEND_EMAIL_VERIFICATION_CODE, CONFIRM_EMAIL_AND_REGISTER } from '../graphql/operations/auth';
import {
  UPDATE_USER,
  UPDATE_PROVIDER,
  UPDATE_BANK,
  UPDATE_MY_BANK_ACCOUNT,
  UPDATE_IDENTITY,
  CREATE_USER_IDENTITY,
  CREATE_KYC_SESSION,
  COMPLETE_KYC,
  GET_PROVIDER_REGISTRATION_STATUS,
} from '../graphql/operations/wallet';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types/graphql';

interface CreatePortfolioInput {
  imageUrl: string;
  title?: string;
  description?: string;
  position?: number;
}

interface UpdatePortfolioInput {
  id: number;
  title?: string;
  description?: string;
  imageUrl?: string;
  position?: number;
}

interface UpdateUserInput {
  displayName?: string;
  email?: string;
  phone?: string;
  birthday?: string;
}

interface UpdateProviderInput {
  name?: string;
  bio?: string;
  location?: string;
  rut?: string;
  logoUrl?: string;
}

interface UpdateBankInput {
  bankName: string;
  accountType: string;
  accountNumber: string;
  email?: string;
  rut?: string;
}

interface IdentityInput {
  userId: number;
  firstName: string;
  lastName: string;
  birthday: string;
  rut: string;
  phone: string;
  company?: string;
}

interface CreateIdentityInput {
  dniFront: string;
  qrSession: string;
  selfie: string;
}

interface RegistrationStatus {
  hasUser: boolean;
  emailVerified: boolean;
  identityCompleted: boolean;
  kycVerified: boolean;
  bankCreated: boolean;
}

interface UseProfileReturn {
  publicProfile: User | null;
  publicProfileLoading: boolean;
  publicProfileError: any;
  registrationStatus: RegistrationStatus | null;
  fetchPublicProfile: (userId: number) => void;
  updateProfile: (input: UpdateUserInput) => Promise<void>;
  updateProviderProfile: (providerId: number, input: UpdateProviderInput) => Promise<void>;
  updateProviderBank: (providerId: number, input: UpdateBankInput) => Promise<void>;
  updateMyBank: (input: UpdateBankInput) => Promise<void>;
  updateIdentity: (input: IdentityInput) => Promise<void>;
  createIdentity: (input: CreateIdentityInput) => Promise<void>;
  createKycSession: (userId: number) => Promise<string | null>;
  completeKyc: (session: string) => Promise<void>;
  sendEmailVerificationCode: (email: string) => Promise<void>;
  confirmEmail: (code: string, email: string) => Promise<void>;
  addPortfolioItem: (input: CreatePortfolioInput) => Promise<void>;
  updatePortfolioItem: (input: UpdatePortfolioInput) => Promise<void>;
  deletePortfolioItem: (id: number) => Promise<void>;
  saving: boolean;
  setSaving: Dispatch<SetStateAction<boolean>>;
}

export function useProfile(): UseProfileReturn {
  const { token, role, refetch: refetchAuth, user } = useAuth();
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    data: publicData,
    loading: publicProfileLoading,
    error: publicProfileError,
  } = useQuery<{ publicProfile: User }>(GET_PUBLIC_PROFILE, {
    variables: { userId: profileUserId! },
    skip: !profileUserId,
    fetchPolicy: 'cache-first',
  });

  useEffect(() => {
    if (!__DEV__) return;
    const p = publicData?.publicProfile?.provider;
    if (p) {
      console.log(
        '[TRACE:QUERY] GetPublicProfile | providerId:', p.id,
        '| name:', p.name,
        '| logoImage.id:', p.logoImage?.id,
        '| cdnUrl:', p.logoImage?.cdnUrl,
        '| hasLogoUrl:', !!p.logoUrl,
        '| loading:', publicProfileLoading,
      );
    } else if (publicProfileLoading) {
      console.log('[TRACE:QUERY] GetPublicProfile | loading');
    }
  }, [publicData, publicProfileLoading]);

  const { data: regData } = useQuery<{
    getProviderRegistrationStatus: RegistrationStatus;
  }>(GET_PROVIDER_REGISTRATION_STATUS, {
    skip: !token || role !== 'provider',
    fetchPolicy: 'network-only',
  });

  const [updateUserMut] = useMutation(UPDATE_USER);
  const [updateProviderMut] = useMutation(UPDATE_PROVIDER);
  const [updateBankMut] = useMutation(UPDATE_BANK);
  const [updateMyBankMut] = useMutation(UPDATE_MY_BANK_ACCOUNT);
  const [updateIdentityMut] = useMutation(UPDATE_IDENTITY);
  const [createIdentityMut] = useMutation(CREATE_USER_IDENTITY);
  const [createKycMut] = useMutation<{ createKycSession: string }>(CREATE_KYC_SESSION);
  const [completeKycMut] = useMutation(COMPLETE_KYC);
  const [sendEmailCodeMut] = useMutation(SEND_EMAIL_VERIFICATION_CODE);
  const [confirmEmailMut] = useMutation(CONFIRM_EMAIL_AND_REGISTER);
  const [addPortfolioMut] = useMutation(ADD_PROVIDER_PORTFOLIO_ITEM);
  const [updatePortfolioMut] = useMutation(UPDATE_PROVIDER_PORTFOLIO_ITEM);
  const [deletePortfolioMut] = useMutation(DELETE_PROVIDER_PORTFOLIO_ITEM);

  const updateProfile = async (input: UpdateUserInput) => {
    setSaving(true);
    try {
      await updateUserMut({ variables: { input: { ...input, id: user?.id } } });
      await refetchAuth();
    } finally {
      setSaving(false);
    }
  };

  const updateProviderProfile = async (providerId: number, input: UpdateProviderInput) => {
    setSaving(true);
    try {
      await updateProviderMut({ variables: { id: providerId, input: { ...input, id: providerId } } });
      await refetchAuth();
    } finally {
      setSaving(false);
    }
  };

  const updateProviderBank = async (providerId: number, input: UpdateBankInput) => {
    setSaving(true);
    try {
      await updateBankMut({ variables: { input, providerId } });
      await refetchAuth();
    } finally {
      setSaving(false);
    }
  };

  const updateMyBank = async (input: UpdateBankInput) => {
    setSaving(true);
    try {
      await updateMyBankMut({ variables: { input } });
      await refetchAuth();
    } finally {
      setSaving(false);
    }
  };

  const updateIdentity = async (input: IdentityInput) => {
    setSaving(true);
    try {
      await updateIdentityMut({ variables: { input } });
      await refetchAuth();
    } finally {
      setSaving(false);
    }
  };

  const createIdentity = async (input: CreateIdentityInput) => {
    setSaving(true);
    try {
      await createIdentityMut({ variables: { input } });
      await refetchAuth();
    } finally {
      setSaving(false);
    }
  };

  const createKycSession = async (userId: number): Promise<string | null> => {
    const { data: result } = await createKycMut({ variables: { userId } });
    return result?.createKycSession || null;
  };

  const completeKyc = async (session: string) => {
    await completeKycMut({ variables: { session } });
    await refetchAuth();
  };

  const sendEmailVerificationCode = async (email: string) => {
    await sendEmailCodeMut({ variables: { email } });
  };

  const confirmEmail = async (code: string, email: string) => {
    await confirmEmailMut({ variables: { code, credentials: { email } } });
    await refetchAuth();
  };

  const addPortfolioItem = async (input: CreatePortfolioInput) => {
    setSaving(true);
    try {
      await addPortfolioMut({ variables: { input } });
      await refetchAuth();
    } finally {
      setSaving(false);
    }
  };

  const updatePortfolioItem = async (input: UpdatePortfolioInput) => {
    setSaving(true);
    try {
      await updatePortfolioMut({ variables: { input } });
      await refetchAuth();
    } finally {
      setSaving(false);
    }
  };

  const deletePortfolioItem = async (id: number) => {
    setSaving(true);
    try {
      await deletePortfolioMut({ variables: { id } });
      await refetchAuth();
    } finally {
      setSaving(false);
    }
  };

  return {
    publicProfile: publicData?.publicProfile || null,
    publicProfileLoading,
    publicProfileError,
    registrationStatus: regData?.getProviderRegistrationStatus || null,
    fetchPublicProfile: setProfileUserId,
    updateProfile,
    updateProviderProfile,
    updateProviderBank,
    updateMyBank,
    updateIdentity,
    createIdentity,
    createKycSession,
    completeKyc,
    sendEmailVerificationCode,
    confirmEmail,
    addPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    saving,
    setSaving,
  };
}
