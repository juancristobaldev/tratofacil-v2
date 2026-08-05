import { gql } from '@apollo/client';

export const MY_WALLET = gql`
  query MyWallet {
    myWallet {
      id
      balance
      transactions {
        id
        type
        amount
        description
        createdAt
      }
    }
  }
`;

export const REQUEST_WITHDRAWAL = gql`
  mutation RequestWithdrawal {
    requestWithdrawal {
      id
      amount
      status
      bankName
      accountType
      accountNumber
      rut
      email
      createdAt
    }
  }
`;

export const MY_PAYMENT_HISTORY = gql`
  query MyPaymentHistory {
    myPaymentHistory {
      payments {
        id
        amount
        description
        details
        createdAt
        type
        status
        transactionId
        orderId
      }
      totalSpent
    }
  }
`;

export const REGISTER_CARD = gql`
  mutation RegisterCard($returnUrl: String!) {
    registerCard(returnUrl: $returnUrl) {
      alreadyRegistered
      url
      token
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      displayName
      email
      phone
      birthday
    }
  }
`;

export const UPDATE_PROVIDER = gql`
  mutation UpdateProvider($id: Int!, $input: UpdateProviderInput!) {
    updateProvider(id: $id, input: $input) {
      id
      name
      bio
      location
    }
  }
`;

export const UPDATE_BANK = gql`
  mutation UpdateBank($input: BankAccountInput!, $providerId: Int!) {
    updateBank(input: $input, providerId: $providerId) {
      id
      bankName
      accountType
      accountNumber
    }
  }
`;

export const UPDATE_MY_BANK_ACCOUNT = gql`
  mutation UpdateMyBankAccount($input: UpdateBankUserInput!) {
    updateMyBankAccount(input: $input) {
      id
      bankName
      accountType
      accountNumber
    }
  }
`;

export const MY_PROVIDER_PLAN = gql`
  query MyProviderPlan {
    myProviderPlan {
      id
      plan
      planActive
      planEndsAt
      subscriptionFlowId
      interval
      status
      total
    }
  }
`;

export const INIT_PLAN = gql`
  mutation InitPlan($input: CreatePlanOrderGeneralInput!) {
    initPlan(input: $input) {
      success
      message
      planEndsAt
      externalSubscriptionId
    }
  }
`;

export const CANCEL_SUBSCRIPTION = gql`
  mutation CancelSubscription($input: ManageSubscriptionInput!) {
    cancelSubscription(input: $input) {
      success
      message
      planEndsAt
    }
  }
`;

export const REACTIVATE_SUBSCRIPTION = gql`
  mutation ReactivateSubscription($input: ManageSubscriptionInput!) {
    reactivateSubscription(input: $input) {
      success
      message
      planEndsAt
      externalSubscriptionId
    }
  }
`;

export const UPDATE_IDENTITY = gql`
  mutation UpdateIdentity($input: IdentityInput!) {
    updateIdentity(input: $input) {
      id
      displayName
    }
  }
`;

export const CREATE_USER_IDENTITY = gql`
  mutation CreateUserIdentity($input: CreateUserIdentityInput!) {
    createUserIdentity(input: $input) {
      id
      status
    }
  }
`;

export const CREATE_KYC_SESSION = gql`
  mutation CreateKycSession($userId: Int!) {
    createKycSession(userId: $userId)
  }
`;

export const COMPLETE_KYC = gql`
  mutation CompleteKyc($session: String!) {
    completeKyc(session: $session)
  }
`;

export const GET_PROVIDER_REGISTRATION_STATUS = gql`
  query GetProviderRegistrationStatus {
    getProviderRegistrationStatus {
      hasUser
      emailVerified
      identityCompleted
      kycVerified
      bankCreated
    }
  }
`;

export const CREATE_ORDER_AD_WITH_PAYMENT = gql`
  mutation CreateOrderAdWithPayment(
    $adId: Int
    $categoryId: Int
    $city: String!
    $couponCode: String
    $days: Int!
    $favicon: String
    $image: String!
    $info: String!
    $link: String!
    $serviceId: Int
    $total: Float!
    $userId: Int!
  ) {
    createOrderAdWithPayment(
      adId: $adId
      categoryId: $categoryId
      city: $city
      couponCode: $couponCode
      days: $days
      favicon: $favicon
      image: $image
      info: $info
      link: $link
      serviceId: $serviceId
      total: $total
      userId: $userId
    ) {
      id
      status
      total
    }
  }
`;
