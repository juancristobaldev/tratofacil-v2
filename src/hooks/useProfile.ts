import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_PUBLIC_PROFILE } from '../graphql/operations/providers';
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
}

interface UpdateBankInput {
  bankName: string;
  accountType: string;
  accountNumber: string;
  email?: string;
  rut?: string;
}

interface IdentityInput {
  displayName: string;
}

interface CreateIdentityInput {
  dniUrl?: string;
  selfieUrl?: string;
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
  saving: boolean;
  setSaving: Dispatch<SetStateAction<boolean>>;
}

export function useProfile(): UseProfileReturn {
  const { token, role, refetch: refetchAuth } = useAuth();
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

  const updateProfile = async (input: UpdateUserInput) => {
    setSaving(true);
    try {
      await updateUserMut({ variables: { input } });
      await refetchAuth();
    } finally {
      setSaving(false);
    }
  };

  const updateProviderProfile = async (providerId: number, input: UpdateProviderInput) => {
    setSaving(true);
    try {
      await updateProviderMut({ variables: { id: providerId, input } });
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
    saving,
    setSaving,
  };
}
