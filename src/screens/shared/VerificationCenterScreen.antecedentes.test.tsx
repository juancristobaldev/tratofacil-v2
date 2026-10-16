import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VerificationCenterScreen } from './VerificationCenterScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockUser: any = null;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({
    updateProfile: jest.fn(),
    updateProviderProfile: jest.fn(),
    updateProviderBank: jest.fn(),
    updateMyBank: jest.fn(),
    sendEmailVerificationCode: jest.fn(),
    confirmEmail: jest.fn(),
    createKycSession: jest.fn(),
    saving: false,
  }),
}));

jest.mock('@apollo/client/react', () => ({
  useQuery: () => ({ data: null, stopPolling: jest.fn() }),
  useMutation: () => [jest.fn().mockResolvedValue({ data: {} }), { loading: false }],
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('../../utils/uploadImage', () => ({
  uploadImage: jest.fn().mockResolvedValue('test-key-cert.jpg'),
}));

describe('VerificationCenterScreen - Antecedentes Requirement for Providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Step 2 as Certificado de Antecedentes immediately after Step 1 for providers', async () => {
    mockUser = {
      id: 10,
      displayName: 'Carlos Gasfíter',
      birthday: '1988-04-15T00:00:00.000Z',
      email: 'carlos@example.com',
      emailVerified: false,
      provider: {
        id: 99,
        name: 'Gasfitería Pro',
        rut: '12345678-9',
        certificates: [],
      },
    };

    const view = await render(<VerificationCenterScreen />);

    // Step 1: Datos personales
    expect(view.getByText('Datos personales')).toBeTruthy();

    // Step 2: Certificado de antecedentes directly visible for provider
    expect(view.getByText('Certificado de antecedentes')).toBeTruthy();

    // When not uploaded, status says Pendiente
    expect(view.getByText('Emitido por Registro Civil (PDF o imagen)')).toBeTruthy();
  });

  it('displays "En revisión por administración" when certificate is uploaded but verified is false', async () => {
    mockUser = {
      id: 10,
      displayName: 'Carlos Gasfíter',
      birthday: '1988-04-15T00:00:00.000Z',
      email: 'carlos@example.com',
      emailVerified: true,
      provider: {
        id: 99,
        name: 'Gasfitería Pro',
        rut: '12345678-9',
        certificates: [
          {
            id: 50,
            title: 'Certificado de Antecedentes',
            institution: 'Registro Civil de Chile',
            verified: false,
          },
        ],
      },
    };

    const view = await render(<VerificationCenterScreen />);

    expect(view.getByText('Certificado de antecedentes')).toBeTruthy();
    expect(view.getByText('En revisión por administración')).toBeTruthy();
    expect(view.getByText('En revisión')).toBeTruthy();
  });

  it('displays "Aprobado por administración" and status "Completado" when admin verified is true', async () => {
    mockUser = {
      id: 10,
      displayName: 'Carlos Gasfíter',
      birthday: '1988-04-15T00:00:00.000Z',
      email: 'carlos@example.com',
      emailVerified: true,
      provider: {
        id: 99,
        name: 'Gasfitería Pro',
        rut: '12345678-9',
        certificates: [
          {
            id: 50,
            title: 'Certificado de Antecedentes',
            institution: 'Registro Civil de Chile',
            verified: true,
          },
        ],
      },
    };

    const view = await render(<VerificationCenterScreen />);

    expect(view.getByText('Certificado de antecedentes')).toBeTruthy();
    expect(view.getByText('Aprobado por administración')).toBeTruthy();
    expect(view.getAllByText('Completado').length).toBeGreaterThan(0);
  });

  it('does NOT display Certificado de Antecedentes for client users without provider', async () => {
    mockUser = {
      id: 20,
      displayName: 'Cliente Normal',
      birthday: '1995-08-20T00:00:00.000Z',
      email: 'cliente@example.com',
      emailVerified: true,
      provider: null,
    };

    const view = await render(<VerificationCenterScreen />);

    // Clients see Datos personales and Correo verificado
    expect(view.getByText('Datos personales')).toBeTruthy();
    expect(view.getByText('Correo verificado')).toBeTruthy();

    // Clients do NOT see Certificado de antecedentes
    expect(view.queryByText('Certificado de antecedentes')).toBeNull();
  });

  it('displays optional bank account and become provider banner for client users', async () => {
    mockUser = {
      id: 20,
      displayName: 'Cliente Normal',
      birthday: '1995-08-20T00:00:00.000Z',
      email: 'cliente@example.com',
      emailVerified: true,
      provider: null,
    };

    const view = await render(<VerificationCenterScreen />);

    // Clients see optional bank account
    expect(view.getByText('Cuenta bancaria')).toBeTruthy();
    expect(view.getByText('OPCIONAL')).toBeTruthy();

    // Clients see become provider CTA banner
    expect(view.getByText('¿Quieres ofrecer tus servicios en TratoFácil?')).toBeTruthy();
    expect(view.getByText('Convertirse en Proveedor')).toBeTruthy();
  });
});
