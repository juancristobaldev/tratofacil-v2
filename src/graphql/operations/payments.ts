import { gql } from '@apollo/client';

export const CREATE_CHECKOUT = gql`
  mutation CreateCheckout($input: CreateCheckoutInput!) {
    createCheckout(input: $input) {
      paymentId
      attemptId
      status
      checkoutUrl
      expiresAt
      requiresAction
    }
  }
`;

export const PAYMENT_STATUS = gql`
  query PaymentStatus($paymentId: String, $attemptId: String, $token: String) {
    paymentStatus(paymentId: $paymentId, attemptId: $attemptId, token: $token) {
      paymentId
      attemptId
      domainType
      orderId
      paymentStatus
      attemptStatus
      amount
      currency
      isPaid
      isTerminal
      paidAt
      errorMessage
    }
  }
`;

export type PaymentDomainType = 'PRODUCT' | 'SERVICE' | 'JOB' | 'AD' | 'REALTIME' | 'PLAN';
export type PaymentMethodType = 'FLOW_HOSTED' | 'FLOW_SAVED_CARD' | 'FLOW_SUBSCRIPTION';
export type ClientPlatform = 'WEB' | 'IOS' | 'ANDROID';

export interface CreateCheckoutInput {
  order: {
    domainType: PaymentDomainType;
    orderId: number;
  };
  paymentMethod: PaymentMethodType;
  platform: ClientPlatform;
  idempotencyKey: string;
}

export interface CheckoutSessionResult {
  paymentId: string;
  attemptId: string;
  status: string;
  checkoutUrl?: string | null;
  expiresAt?: string | null;
  requiresAction: boolean;
}

export interface PaymentStatusResultData {
  paymentId: string;
  attemptId?: string | null;
  domainType: PaymentDomainType;
  orderId: number;
  paymentStatus: string;
  attemptStatus?: string | null;
  amount: number;
  currency: string;
  isPaid: boolean;
  isTerminal: boolean;
  paidAt?: string | null;
  errorMessage?: string | null;
}
