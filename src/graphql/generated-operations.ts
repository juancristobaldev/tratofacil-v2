/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from './generated';
export type ApplyToJobInput = {
  additionalDocs?: Array<string> | null | undefined;
  antecedentesUrl: string;
  jobId: number;
  message?: string | null | undefined;
};

export type BankAccountInput = {
  accountNumber: string;
  accountType: string;
  bankName: string;
  email?: string | null | undefined;
  rut?: string | null | undefined;
};

/** Estado canónico del pago a nivel global de la orden */
export type CanonicalPaymentStatus =
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'
  | 'PAID'
  | 'PARTIALLY_REFUNDED'
  | 'PENDING'
  | 'PROCESSING'
  | 'REFUNDED'
  | 'REFUND_PENDING';

/** Plataforma cliente que inicia el checkout (WEB, IOS, ANDROID) */
export type ClientPlatform =
  | 'ANDROID'
  | 'IOS'
  | 'WEB';

export type ConditionDeliveryInput = {
  confirmationDeadline: string;
  deliveryType: string;
  maxDispatchDays: number;
  shippingPayer: string;
};

export type CounterOfferRealtimeOrderInput = {
  orderRealtimeId: number;
  quotedHours: number;
  quotedPrice: number;
  quotedTransport: number;
};

export type CreateCertificateInput = {
  fileUrl: string;
  institution?: string | null | undefined;
  serviceProviderId?: number | null | undefined;
  title: string;
  year?: number | null | undefined;
};

export type CreateCheckoutInput = {
  idempotencyKey: string;
  order: PaymentOrderReferenceInput;
  paymentMethod: PaymentMethodType;
  platform: ClientPlatform;
};

export type CreateClientReviewInput = {
  clientId: number;
  comment?: string | null | undefined;
  orderRealtimeId: number;
  rating: number;
};

export type CreateContactRequestInput = {
  clientAddress?: string | null | undefined;
  clientLat: number;
  clientLng: number;
  clientPlaceId?: string | null | undefined;
  serviceProviderId: number;
};

export type CreateJobInput = {
  description?: string | null | undefined;
  location?: string | null | undefined;
  price?: number | null | undefined;
  title: string;
};

export type CreateOrderJobInput = {
  jobId: number;
  workerId?: number | null | undefined;
};

export type CreateOrderProductInput = {
  productId: number;
  quantity: number;
};

export type CreatePlanOrderGeneralInput = {
  couponCode?: string | null | undefined;
  customerId?: string | null | undefined;
  interval: PlanInterval;
  plan: string;
  type: string;
};

export type CreateProductInput = {
  basePrice?: number | null | undefined;
  categoryProductId: number;
  conditions?: ConditionDeliveryInput | null | undefined;
  description?: string | null | undefined;
  imageUrls?: Array<string> | null | undefined;
  location?: string | null | undefined;
  name: string;
  price: number;
  shippingDisabled?: boolean | null | undefined;
  slug: string;
  stock: number;
};

export type CreateProviderInput = {
  bank?: BankAccountInput | null | undefined;
  bio?: string | null | undefined;
  id?: number | null | undefined;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
  location?: string | null | undefined;
  logoUrl?: string | null | undefined;
};

export type CreateProviderPortfolioInput = {
  description?: string | null | undefined;
  imageUrl: string;
  position?: number | null | undefined;
  serviceProviderId?: number | null | undefined;
  title?: string | null | undefined;
};

export type CreateRealtimeOrderInput = {
  clientAddress?: string | null | undefined;
  clientDescription?: string | null | undefined;
  clientLat: number;
  clientLng: number;
  clientPlaceId?: string | null | undefined;
  serviceProviderId: number;
};

export type CreateRealtimeProviderReviewInput = {
  comment?: string | null | undefined;
  orderRealtimeId: number;
  providerId: number;
  rating: number;
};

export type CreateReviewsJobInput = {
  comment?: string | null | undefined;
  orderJobId: number;
  rating: number;
  workerId: number;
};

export type CreateServiceInput = {
  categoryId?: number | null | undefined;
  city?: string | null | undefined;
  description?: string | null | undefined;
  hasHomeVisit: boolean;
  price: number;
  slug: string;
};

export type CreateShippingInfoInput = {
  commune: string;
  dept?: string | null | undefined;
  number: string;
  phone: string;
  reference?: string | null | undefined;
  region: string;
  street: string;
};

export type CreateSupportTicketInput = {
  email: string;
  message: string;
  subject: string;
  userId?: number | null | undefined;
};

export type CreateUserIdentityInput = {
  /** Key o URL del documento frontal subido */
  dniFront: string;
  /** qr session */
  qrSession: string;
  /** Key o URL de la selfie subida */
  selfie: string;
};

export type CredentialsInput = {
  birthday?: string | null | undefined;
  email: string;
  name?: string | null | undefined;
  password?: string | null | undefined;
  phone?: string | null | undefined;
};

export type GuestCreateRealtimeOrderInput = {
  clientAddress?: string | null | undefined;
  clientDescription?: string | null | undefined;
  clientLat: number;
  clientLng: number;
  clientPlaceId?: string | null | undefined;
  guestEmail: string;
  guestName?: string | null | undefined;
  guestPhone: string;
  serviceProviderId: number;
};

export type IdentityInput = {
  birthday: string;
  company?: string | null | undefined;
  firstName: string;
  lastName: string;
  phone: string;
  rut: string;
  userId: number;
};

/** Estado actual de la validación biométrica */
export type IdentityStatus =
  | 'APPROVED'
  | 'FAILED'
  | 'PENDING';

export type LoginInput = {
  email: string;
  password: string;
};

export type ManageSubscriptionInput = {
  orderId: number;
  type: SubscriptionType;
};

/** Estado de una orden */
export type OrderStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'FAILED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS';

/** Estado del intento concreto de cobro */
export type PaymentAttemptStatus =
  | 'CANCELLED'
  | 'CHECKOUT_READY'
  | 'CREATED'
  | 'EXPIRED'
  | 'FAILED'
  | 'PROCESSING'
  | 'SUBMITTED'
  | 'SUCCEEDED'
  | 'UNKNOWN';

/** Dominio o tipo de recurso de la orden a pagar */
export type PaymentDomainType =
  | 'AD'
  | 'JOB'
  | 'PLAN'
  | 'PRODUCT'
  | 'REALTIME'
  | 'SERVICE';

export type PaymentEntryType =
  | 'AD'
  | 'JOB'
  | 'PRODUCT'
  | 'REALTIME'
  | 'SERVICE_CLIENT'
  | 'SUBSCRIPTION_MARKETPLACE'
  | 'SUBSCRIPTION_PROVIDER';

/** Método de pago a utilizar (FLOW_HOSTED, FLOW_SAVED_CARD, FLOW_SUBSCRIPTION) */
export type PaymentMethodType =
  | 'FLOW_HOSTED'
  | 'FLOW_SAVED_CARD'
  | 'FLOW_SUBSCRIPTION';

export type PaymentOrderReferenceInput = {
  domainType: PaymentDomainType;
  orderId: number;
};

export type PaymentStatus =
  | 'CONFIRMED'
  | 'FAILED'
  | 'INITIATED';

export type PlanInterval =
  | 'MONTHLY'
  | 'YEARLY';

/** Planes disponibles para los proveedores: FREE, PREMIUM, FULL */
export type ProviderPlan =
  | 'FREE'
  | 'TRATOFACIL_SRV_PREMIUM'
  | 'TRATOFACIL_SRV_PRO';

/** Estado de solicitudes en tiempo real desde /find */
export type RealtimeOrderStatus =
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'IN_PROGRESS'
  | 'PAYMENT_PENDING'
  | 'PENDING'
  | 'QUOTED'
  | 'REJECTED';

export type RegisterUserInput = {
  birthday?: string | null | undefined;
  displayName?: string | null | undefined;
  email: string;
  password: string;
  phone?: string | null | undefined;
  role?: Role;
  username?: string | null | undefined;
};

/** Roles de usuario permitidos en la aplicación */
export type Role =
  | 'ADMIN'
  | 'CITY_ADMIN'
  | 'CLIENT'
  | 'PROVIDER';

export type SubscriptionType =
  | 'MARKETPLACE'
  | 'PROVIDER';

export type UpdateBankUserInput = {
  accountNumber: string;
  accountType: string;
  bankName: string;
  rut?: string | null | undefined;
};

export type UpdateJobInput = {
  description?: string | null | undefined;
  id: number;
  location?: string | null | undefined;
  price?: number | null | undefined;
  title?: string | null | undefined;
};

export type UpdateProductInput = {
  basePrice?: number | null | undefined;
  categoryProductId?: number | null | undefined;
  conditions?: ConditionDeliveryInput | null | undefined;
  description?: string | null | undefined;
  id: number;
  imageUrls?: Array<string> | null | undefined;
  location?: string | null | undefined;
  name?: string | null | undefined;
  price?: number | null | undefined;
  shippingDisabled?: boolean | null | undefined;
  slug?: string | null | undefined;
  stock?: number | null | undefined;
};

export type UpdateProviderInput = {
  bank?: BankAccountInput | null | undefined;
  bio?: string | null | undefined;
  id?: number | null | undefined;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
  location?: string | null | undefined;
  logoUrl?: string | null | undefined;
  name?: string | null | undefined;
  rut?: string | null | undefined;
};

export type UpdateProviderPortfolioInput = {
  description?: string | null | undefined;
  id: number;
  imageUrl?: string | null | undefined;
  position?: number | null | undefined;
  serviceProviderId?: number | null | undefined;
  title?: string | null | undefined;
};

export type UpdateServiceInput = {
  categoryId?: number | null | undefined;
  city?: string | null | undefined;
  description?: string | null | undefined;
  hasHomeVisit?: boolean | null | undefined;
  name?: string | null | undefined;
  price?: number | null | undefined;
};

export type UpdateShippingInput = {
  orderId: number;
  shippingCompany?: string | null | undefined;
  trackingCode?: string | null | undefined;
};

export type UpdateUserInput = {
  birthday?: string | null | undefined;
  displayName?: string | null | undefined;
  email?: string | null | undefined;
  id?: number | null | undefined;
  nicename?: string | null | undefined;
  phone?: string | null | undefined;
  url?: string | null | undefined;
};

/** Planes disponibles para los usuarios */
export type UserPlan =
  | 'FREE'
  | 'TRATOFACIL_PUB_BUSINESS'
  | 'TRATOFACIL_PUB_FULL'
  | 'TRATOFACIL_PUB_INITIAL'
  | 'TRATOFACIL_PUB_PRO';

export type WithdrawalStatus =
  | 'APPROVED'
  | 'COMPLETED'
  | 'FAILED'
  | 'PENDING'
  | 'PROCESSED'
  | 'REJECTED';

export type GetAdsQueryVariables = Exact<{
  slug?: string | null | undefined;
  city?: string | null | undefined;
}>;


export type GetAdsQuery = { getAds: { ads: Array<{ id: number, orders: Array<{ days: number, total: number, link: string, favicon: string | null, info: string, city: string | null, imageRelation: { id: number, cdnUrl: string | null, compressedKey: string | null, key: string | null, extension: string | null } | null, service: { id: number, name: string } | null, category: { id: number, name: string } | null, user: { id: number, displayName: string | null, email: string | null, phone: string | null } | null }> | null }>, marketingHero: Array<{ id: number, image: { id: number, cdnUrl: string | null, compressedKey: string | null, key: string | null, extension: string | null } | null }>, marketingHorizontal: Array<{ id: number, image: { id: number, cdnUrl: string | null, compressedKey: string | null, key: string | null, extension: string | null } | null }>, marketingVertical: Array<{ id: number, image: { id: number, cdnUrl: string | null, compressedKey: string | null, key: string | null, extension: string | null } | null }> } };

export type GetDataAndTransitionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDataAndTransitionsQuery = { getAllImageTransition: Array<{ id: number, duration: number, orientation: string, type: string }> };

export type GetMyAdsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyAdsQuery = { getMyAds: Array<{ id: number, expiredAt: string | null, orders: Array<{ id: number, status: Types.OrderStatus, total: number, days: number, info: string, image: string, city: string | null, link: string, favicon: string | null, createdAt: string, imageRelation: { id: number, cdnUrl: string | null, compressedKey: string | null, key: string | null, extension: string | null } | null, category: { id: number, name: string } | null }> | null }> };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: number, email: string | null, emailVerified: boolean | null, displayName: string | null, flowCustomerId: string | null, role: Types.Role, cardActive: boolean | null, creditCardType: string | null, last4CardDigits: string | null, kycStatus: boolean | null, phone: string | null, birthday: string | null, isProfileComplete: boolean, isProfileFullyComplete: boolean, isGuest: boolean | null, username: string, identitys: Array<{ id: number, status: Types.IdentityStatus }> | null, planOrders: Array<{ id: number, plan: Types.ProviderPlan, planActive: boolean, planEndsAt: string | null, subscriptionFlowId: string | null, interval: Types.PlanInterval | null, status: Types.OrderStatus, total: number }> | null, marketplacePlanOrders: Array<{ id: number, plan: Types.UserPlan, planActive: boolean, planEndsAt: string | null, subscriptionFlowId: string | null, interval: Types.PlanInterval, status: Types.OrderStatus, total: number }> | null, reviewsReceived: Array<{ id: number, rating: number, comment: string | null, createdAt: string, providerId: number, orderRealtimeId: number, provider: { id: number, name: string, logoImage: { id: number, cdnUrl: string | null } | null } | null } | null> | null, provider: { id: number, name: string, slug: string, bio: string | null, location: string | null, lat: number | null, lng: number | null, rut: string | null, isRealtimeActive: boolean | null, hasSchedule: boolean | null, completedOrdersCount: number | null, priority: number, logoImage: { id: number, cdnUrl: string | null } | null, activeRealtimeOrder: { id: number, status: Types.RealtimeOrderStatus } | null, bank: { id: number, bankName: string, accountType: string, accountNumber: string, rut: string | null, email: string | null } | null, services: Array<{ id: number, description: string | null, price: number | null, hasHomeVisit: boolean, slug: string, providerId: number, serviceId: number | null, service: { id: number, name: string, slug: string } | null }> | null, realtimeReviews: Array<{ id: number, rating: number, comment: string | null, clientId: number, orderRealtimeId: number, createdAt: string, client: { id: number, displayName: string | null } | null } | null> | null, reviews: Array<{ id: number, rating: number, comment: string | null, createdAt: string, client: { id: number, displayName: string | null } }> | null, portfolio: Array<{ id: number, title: string | null, description: string | null, imageUrl: string, position: number, createdAt: string, image: { id: number, cdnUrl: string | null } | null }> | null, certificates: Array<{ id: number, title: string, institution: string | null, year: number | null, verified: boolean, fileImage: { id: number, cdnUrl: string | null } | null }> | null } | null, wallet: { id: number, balance: number, transactions: Array<{ id: number, type: string, amount: number, description: string | null, createdAt: string }> } | null } };

export type LoginMutationVariables = Exact<{
  loginInput: Types.LoginInput;
}>;


export type LoginMutation = { login: { accessToken: string, user: { id: number, email: string | null, role: Types.Role, displayName: string | null, username: string, phone: string | null, kycStatus: boolean | null, emailVerified: boolean | null, provider: { id: number, name: string } | null } } };

export type LoginWithGoogleMutationVariables = Exact<{
  idToken: string;
}>;


export type LoginWithGoogleMutation = { loginWithGoogle: { accessToken: string, user: { id: number, email: string | null, role: Types.Role, displayName: string | null, username: string, phone: string | null, kycStatus: boolean | null, provider: { id: number, name: string } | null } } };

export type RegisterMutationVariables = Exact<{
  input: Types.RegisterUserInput;
}>;


export type RegisterMutation = { register: { accessToken: string, user: { id: number, email: string | null, role: Types.Role, displayName: string | null, username: string, phone: string | null } } };

export type CheckLoginEmailExistsQueryVariables = Exact<{
  email: string;
}>;


export type CheckLoginEmailExistsQuery = { checkLoginEmailExists: { exists: boolean, hasPassword: boolean } };

export type SendEmailVerificationCodeMutationVariables = Exact<{
  email: string;
}>;


export type SendEmailVerificationCodeMutation = { sendEmailVerificationCode: boolean };

export type ConfirmEmailAndRegisterMutationVariables = Exact<{
  code: string;
  credentials: Types.CredentialsInput;
}>;


export type ConfirmEmailAndRegisterMutation = { confirmEmailAndRegister: boolean };

export type RequestPasswordResetMutationVariables = Exact<{
  email: string;
}>;


export type RequestPasswordResetMutation = { requestPasswordReset: boolean };

export type ResetPasswordMutationVariables = Exact<{
  newPassword: string;
  token: string;
}>;


export type ResetPasswordMutation = { resetPassword: boolean };

export type SetGuestPasswordMutationVariables = Exact<{
  newPassword: string;
}>;


export type SetGuestPasswordMutation = { setGuestPassword: boolean };

export type RegisterPushTokenMutationVariables = Exact<{
  token: string;
  platform: string;
}>;


export type RegisterPushTokenMutation = { registerPushToken: boolean };

export type UnregisterPushTokenMutationVariables = Exact<{
  token: string;
}>;


export type UnregisterPushTokenMutation = { unregisterPushToken: boolean };

export type DeleteAccountMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteAccountMutation = { deleteAccount: boolean };

export type GetMainCategoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMainCategoriesQuery = { mainCategories: Array<{ id: number, name: string, slug: string }> };

export type GetCategoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCategoriesQuery = { categories: Array<{ id: number, name: string, slug: string, description: string | null, position: number, parentId: number | null, image: { id: number, cdnUrl: string | null } | null, subCategories: Array<{ id: number, name: string, slug: string }> | null, services: Array<{ id: number, name: string, slug: string }> | null }> };

export type GetCategoryBySlugQueryVariables = Exact<{
  slug: string;
}>;


export type GetCategoryBySlugQuery = { categoryBySlug: { id: number, name: string, slug: string, description: string | null, subCategories: Array<{ id: number, name: string, slug: string }> | null } | null };

export type GetServicesByCategoryQueryVariables = Exact<{
  slug: string;
  city?: string | null | undefined;
  includeProvidersOnly?: boolean | null | undefined;
  skip?: number | null | undefined;
  take?: number | null | undefined;
  subCategorySlug?: string | null | undefined;
}>;


export type GetServicesByCategoryQuery = { servicesByCategory: Array<{ id: number, name: string, slug: string, category: { id: number, name: string, slug: string } | null, serviceProviders: Array<{ id: number, price: number | null, hasHomeVisit: boolean, description: string | null, cities: Array<{ city: string }> | null, provider: { id: number, name: string, location: string | null, lat: number | null, lng: number | null, slug: string, isRealtimeActive: boolean | null, logoImage: { id: number, cdnUrl: string | null } | null, reviews: Array<{ id: number, rating: number, comment: string | null, createdAt: string }> | null, realtimeReviews: Array<{ id: number, rating: number } | null> | null, certificates: Array<{ id: number, verified: boolean }> | null } | null }> | null }> };

export type MyJobsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyJobsQuery = { myJobs: Array<{ id: number, title: string, description: string | null, price: number | null, location: string | null, createdAt: string, updatedAt: string, applications: Array<{ id: number, message: string | null, status: string, antecedentesUrl: string | null, additionalDocs: Array<string> | null, worker: { id: number, displayName: string | null } }> | null, orders: Array<{ id: number, status: Types.OrderStatus, worker: { id: number, displayName: string | null } | null }> | null }> };

export type MyApplicationsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyApplicationsQuery = { myApplications: Array<{ id: number, message: string | null, status: string, job: { id: number, title: string, description: string | null, price: number | null, location: string | null, user: { id: number, displayName: string | null } } }> };

export type GetJobsQueryVariables = Exact<{
  city?: string | null | undefined;
  skip: number;
  take: number;
}>;


export type GetJobsQuery = { jobs: Array<{ id: number, title: string, description: string | null, price: number | null, location: string | null, createdAt: string, user: { id: number, displayName: string | null }, reviews: Array<{ id: number, rating: number, comment: string | null }> | null }> };

export type GetJobQueryVariables = Exact<{
  id: number;
}>;


export type GetJobQuery = { job: { id: number, title: string, description: string | null, price: number | null, location: string | null, createdAt: string, user: { id: number, displayName: string | null }, applications: Array<{ id: number, message: string | null, status: string, worker: { id: number, displayName: string | null } }> | null, reviews: Array<{ id: number, rating: number, comment: string | null, createdAt: string, client: { id: number, displayName: string | null } }> | null } };

export type CreateJobMutationVariables = Exact<{
  input: Types.CreateJobInput;
}>;


export type CreateJobMutation = { createJob: { id: number, title: string, price: number | null } };

export type UpdateJobMutationVariables = Exact<{
  input: Types.UpdateJobInput;
}>;


export type UpdateJobMutation = { updateJob: { id: number, title: string, price: number | null } };

export type RemoveJobMutationVariables = Exact<{
  id: number;
}>;


export type RemoveJobMutation = { removeJob: { id: number } };

export type ApplyToJobMutationVariables = Exact<{
  input?: Types.ApplyToJobInput | null | undefined;
  jobId?: number | null | undefined;
  message?: string | null | undefined;
  antecedentesUrl?: string | null | undefined;
  additionalDocs?: Array<string> | string | null | undefined;
}>;


export type ApplyToJobMutation = { applyToJob: { id: number, message: string | null, status: string, antecedentesUrl: string | null, additionalDocs: Array<string> | null } };

export type CreateOrderJobWithPaymentMutationVariables = Exact<{
  input: Types.CreateOrderJobInput;
}>;


export type CreateOrderJobWithPaymentMutation = { createOrderJobWithPayment: { id: number, status: Types.OrderStatus, total: number | null } };

export type InitFlowJobMutationVariables = Exact<{
  orderJobId: number;
  returnUrl: string;
}>;


export type InitFlowJobMutation = { initFlowJob: { url: string, token: string } };

export type ConfirmFlowJobMutationVariables = Exact<{
  token: string;
}>;


export type ConfirmFlowJobMutation = { confirmFlowJob: { id: number, status: Types.OrderStatus } };

export type CreateReviewJobMutationVariables = Exact<{
  input: Types.CreateReviewsJobInput;
}>;


export type CreateReviewJobMutation = { createReviewJob: { id: number, rating: number, comment: string | null } };

export type CancelOrderJobMutationVariables = Exact<{
  orderId: number;
}>;


export type CancelOrderJobMutation = { cancelOrderJob: { id: number, status: Types.OrderStatus } };

export type MyOrdersQueryVariables = Exact<{ [key: string]: never; }>;


export type MyOrdersQuery = { myOrders: { services: Array<{ id: number, status: Types.OrderStatus, total: number, createdAt: string, scheduledAt: string | null, clientAddress: string | null, serviceProvider: { id: number, service: { id: number, name: string } | null, provider: { id: number, name: string, logoImage: { id: number, cdnUrl: string | null } | null } | null } | null }> | null, products: Array<{ id: number, status: Types.OrderStatus, total: number, quantity: number, unitPrice: number, createdAt: string, commission: number, shippingCompany: string | null, trackingCode: string | null, product: { id: number, name: string, shippingDisabled: boolean, images: Array<{ id: number, image: { id: number, cdnUrl: string | null } | null }> | null, user: { id: number, displayName: string | null, provider: { id: number, name: string } | null } | null }, shippingInfo: { id: number, street: string, number: string, commune: string, region: string, phone: string } | null }> | null, jobs: Array<{ id: number, status: Types.OrderStatus, total: number | null, createdAt: string, job: { id: number, title: string, location: string | null }, worker: { id: number, displayName: string | null } | null }> | null } };

export type GetMySalesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMySalesQuery = { getMySales: Array<{ id: number, status: Types.OrderStatus, total: number, quantity: number, unitPrice: number, createdAt: string, commission: number, shippingCompany: string | null, trackingCode: string | null, product: { id: number, name: string, shippingDisabled: boolean, images: Array<{ id: number, image: { id: number, cdnUrl: string | null } | null }> | null }, client: { id: number, displayName: string | null, reviewsReceived: Array<{ id: number, rating: number } | null> | null }, shippingInfo: { id: number, street: string, number: string, dept: string | null, reference: string | null, commune: string, region: string, phone: string } | null }> };

export type UpdateOrderProductShippingMutationVariables = Exact<{
  input: Types.UpdateShippingInput;
}>;


export type UpdateOrderProductShippingMutation = { updateOrderProductShipping: { id: number, status: Types.OrderStatus, shippingCompany: string | null, trackingCode: string | null } };

export type UpdateOrderProductStatusMutationVariables = Exact<{
  orderId: number;
  status: Types.OrderStatus;
}>;


export type UpdateOrderProductStatusMutation = { updateOrderProductStatus: { id: number, status: Types.OrderStatus } };

export type CancelOrderProductMutationVariables = Exact<{
  orderId: number;
}>;


export type CancelOrderProductMutation = { cancelOrderProduct: { id: number, status: Types.OrderStatus } };

export type UpdateOrderServiceStatusMutationVariables = Exact<{
  orderId: number;
  status: Types.OrderStatus;
}>;


export type UpdateOrderServiceStatusMutation = { updateOrderServiceStatus: { id: number, status: Types.OrderStatus } };

export type UpdateOrderJobStatusMutationVariables = Exact<{
  orderId: number;
  status: Types.OrderStatus;
}>;


export type UpdateOrderJobStatusMutation = { updateOrderJobStatus: { id: number, status: Types.OrderStatus } };

export type CreateCheckoutMutationVariables = Exact<{
  input: Types.CreateCheckoutInput;
}>;


export type CreateCheckoutMutation = { createCheckout: { paymentId: string, attemptId: string, status: string, checkoutUrl: string | null, expiresAt: string | null, requiresAction: boolean } };

export type PaymentStatusQueryVariables = Exact<{
  paymentId?: string | null | undefined;
  attemptId?: string | null | undefined;
  token?: string | null | undefined;
}>;


export type PaymentStatusQuery = { paymentStatus: { paymentId: string, attemptId: string | null, domainType: Types.PaymentDomainType, orderId: number, paymentStatus: Types.CanonicalPaymentStatus, attemptStatus: Types.PaymentAttemptStatus | null, amount: number, currency: string, isPaid: boolean, isTerminal: boolean, paidAt: string | null, errorMessage: string | null } };

export type GetProductsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetProductsQuery = { products: Array<{ id: number, name: string, slug: string, price: number, stock: number, description: string | null, location: string | null, shippingDisabled: boolean, categoryProductId: number, subCategorySlug: string | null, images: Array<{ id: number, url: string, image: { id: number, cdnUrl: string | null } | null }> | null, user: { id: number, displayName: string | null, provider: { id: number, name: string } | null } | null, deliveryCondition: { id: number, deliveryType: string, shippingPayer: string, maxDispatchDays: number } | null }> };

export type GetProductQueryVariables = Exact<{
  id: number;
}>;


export type GetProductQuery = { product: { id: number, name: string, slug: string, price: number, stock: number, description: string | null, location: string | null, shippingDisabled: boolean, categoryProductId: number, subCategorySlug: string | null, categoryProduct: { id: number, name: string, slug: string, shippingDisabled: boolean } | null, images: Array<{ id: number, url: string, image: { id: number, cdnUrl: string | null } | null }> | null, user: { id: number, displayName: string | null, identitys: Array<{ id: number, status: Types.IdentityStatus }> | null } | null, deliveryCondition: { id: number, deliveryType: string, shippingPayer: string, maxDispatchDays: number, confirmationDeadline: string } | null } };

export type GetProductBySlugQueryVariables = Exact<{
  slug: string;
}>;


export type GetProductBySlugQuery = { productBySlug: { id: number, name: string, price: number, stock: number, description: string | null, location: string | null, shippingDisabled: boolean, subCategorySlug: string | null, categoryProduct: { shippingDisabled: boolean } | null, images: Array<{ id: number, url: string, image: { id: number, cdnUrl: string | null } | null }> | null, user: { id: number, displayName: string | null, provider: { id: number, name: string } | null } | null, deliveryCondition: { id: number, deliveryType: string, shippingPayer: string, maxDispatchDays: number } | null } };

export type CreateProductMutationVariables = Exact<{
  input: Types.CreateProductInput;
}>;


export type CreateProductMutation = { createProduct: { id: number, name: string, slug: string, price: number, stock: number, shippingDisabled: boolean } };

export type FindAllCategoryQueryVariables = Exact<{ [key: string]: never; }>;


export type FindAllCategoryQuery = { findAllCategory: Array<{ id: number, name: string, parentId: number | null, shippingDisabled: boolean }> };

export type ProductsByUserQueryVariables = Exact<{
  userId: number;
}>;


export type ProductsByUserQuery = { productsByUser: Array<{ id: number }> };

export type UpdateProductMutationVariables = Exact<{
  input: Types.UpdateProductInput;
}>;


export type UpdateProductMutation = { updateProduct: { id: number, name: string, price: number, stock: number } };

export type RemoveProductMutationVariables = Exact<{
  id: number;
}>;


export type RemoveProductMutation = { removeProduct: { id: number } };

export type GetCategoriesProductsQueryVariables = Exact<{
  city?: string | null | undefined;
}>;


export type GetCategoriesProductsQuery = { categoriesProducts: Array<{ id: number, name: string, slug: string, shippingDisabled: boolean, subCategories: Array<{ id: number, name: string, slug: string }> | null }> };

export type GetMarketplaceDataQueryVariables = Exact<{
  city?: string | null | undefined;
}>;


export type GetMarketplaceDataQuery = { categoriesProducts: Array<{ id: number, name: string, slug: string, subCategories: Array<{ id: number, name: string, slug: string }> | null, products: Array<{ id: number, name: string, slug: string, price: number, location: string | null, stock: number, description: string | null, shippingDisabled: boolean, categoryProductId: number, subCategorySlug: string | null, user: { id: number, displayName: string | null, identitys: Array<{ status: Types.IdentityStatus }> | null } | null, images: Array<{ id: number, url: string, image: { id: number, cdnUrl: string | null } | null }> | null, deliveryCondition: { id: number, deliveryType: string, shippingPayer: string, maxDispatchDays: number, confirmationDeadline: string } | null }> | null }> };

export type CreateOrderProductWithPaymentMutationVariables = Exact<{
  input: Types.CreateOrderProductInput;
  shippingInput: Types.CreateShippingInfoInput;
}>;


export type CreateOrderProductWithPaymentMutation = { createOrderProductWithPayment: { id: number, status: Types.OrderStatus, total: number } };

export type InitFlowProductMutationVariables = Exact<{
  orderProductId: number;
  returnUrl: string;
}>;


export type InitFlowProductMutation = { initFlowProduct: { url: string, token: string } };

export type ConfirmFlowProductMutationVariables = Exact<{
  token: string;
}>;


export type ConfirmFlowProductMutation = { confirmFlowProduct: { id: number, status: Types.OrderStatus } };

export type PayProductOrderWithSavedCardMutationVariables = Exact<{
  orderProductId: number;
}>;


export type PayProductOrderWithSavedCardMutation = { payProductOrderWithSavedCard: { id: number, status: Types.OrderStatus, total: number } };

export type ConfirmOrderProductReceiptMutationVariables = Exact<{
  orderId: number;
}>;


export type ConfirmOrderProductReceiptMutation = { confirmOrderProductReceipt: { id: number, status: Types.OrderStatus } };

export type GetPublicProfileQueryVariables = Exact<{
  userId: number;
}>;


export type GetPublicProfileQuery = { publicProfile: { id: number, displayName: string | null, email: string | null, phone: string | null, role: Types.Role, provider: { id: number, name: string, slug: string, bio: string | null, location: string | null, lat: number | null, lng: number | null, isRealtimeActive: boolean | null, hasSchedule: boolean | null, completedOrdersCount: number | null, priority: number, rut: string | null, logoImage: { id: number, cdnUrl: string | null } | null, services: Array<{ id: number, price: number | null, hasHomeVisit: boolean, description: string | null, slug: string, serviceId: number | null, isCertified: boolean, portfolio: Array<{ id: number, title: string | null, description: string | null, imageUrl: string, createdAt: string, image: { id: number, cdnUrl: string | null } | null }> | null, service: { id: number, name: string, slug: string, description: string | null } | null }> | null, reviews: Array<{ id: number, rating: number, comment: string | null, createdAt: string, client: { id: number, displayName: string | null } }> | null, realtimeReviews: Array<{ id: number, rating: number, comment: string | null, createdAt: string, clientId: number, client: { id: number, displayName: string | null } | null } | null> | null, certificates: Array<{ id: number, title: string, institution: string | null, year: number | null, verified: boolean, fileImage: { id: number, cdnUrl: string | null } | null }> | null, portfolio: Array<{ id: number, title: string | null, description: string | null, imageUrl: string, createdAt: string, image: { id: number, cdnUrl: string | null } | null }> | null, hobbys: Array<{ id: number, name: string }> | null } | null } | null };

export type GetServiceDetailQueryVariables = Exact<{
  serviceId: number;
  providerId: number;
}>;


export type GetServiceDetailQuery = { serviceDetail: { id: number, description: string | null, price: number | null, hasHomeVisit: boolean | null, commission: number | null, netAmount: number | null, slug: string, service: { id: number, name: string, slug: string, image: { id: number, cdnUrl: string | null } | null } | null, provider: { id: number, name: string, location: string | null, logoImage: { id: number, cdnUrl: string | null } | null, reviews: Array<{ id: number, rating: number, comment: string | null, createdAt: string, client: { displayName: string | null } }> | null } | null } };

export type GetProvidersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetProvidersQuery = { providers: Array<{ id: number, name: string, slug: string, location: string | null, lat: number | null, lng: number | null, isRealtimeActive: boolean | null, priority: number, hasSchedule: boolean | null, logoImage: { id: number, cdnUrl: string | null } | null, services: Array<{ id: number, price: number | null, hasHomeVisit: boolean, description: string | null, slug: string, service: { id: number, name: string, slug: string } | null, cities: Array<{ city: string }> | null }> | null }> };

export type GetProviderDailyAvailabilityQueryVariables = Exact<{
  date: string;
  providerId: number;
}>;


export type GetProviderDailyAvailabilityQuery = { providerDailyAvailability: { date: string, slots: Array<string>, availableSlots: Array<string>, occupiedSlots: Array<string> } };

export type RegisterProviderMutationVariables = Exact<{
  input: Types.CreateProviderInput;
}>;


export type RegisterProviderMutation = { registerProvider: { accessToken: string, user: { id: number, role: Types.Role } } };

export type CreateServiceContactRequestMutationVariables = Exact<{
  input: Types.CreateContactRequestInput;
}>;


export type CreateServiceContactRequestMutation = { createServiceContactRequest: { id: number, status: Types.OrderStatus } };

export type GetMyPortfolioQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyPortfolioQuery = { myPortfolio: Array<{ id: number, title: string | null, description: string | null, imageUrl: string, position: number, createdAt: string, image: { id: number, cdnUrl: string | null } | null }> };

export type AddProviderPortfolioItemMutationVariables = Exact<{
  input: Types.CreateProviderPortfolioInput;
}>;


export type AddProviderPortfolioItemMutation = { addProviderPortfolioItem: { id: number, title: string | null, description: string | null, imageUrl: string, position: number, createdAt: string, image: { id: number, cdnUrl: string | null } | null } };

export type UpdateProviderPortfolioItemMutationVariables = Exact<{
  input: Types.UpdateProviderPortfolioInput;
}>;


export type UpdateProviderPortfolioItemMutation = { updateProviderPortfolioItem: { id: number, title: string | null, description: string | null, imageUrl: string, position: number, createdAt: string, image: { id: number, cdnUrl: string | null } | null } };

export type DeleteProviderPortfolioItemMutationVariables = Exact<{
  id: number;
}>;


export type DeleteProviderPortfolioItemMutation = { deleteProviderPortfolioItem: boolean };

export type CreateCertificateMutationVariables = Exact<{
  input: Types.CreateCertificateInput;
}>;


export type CreateCertificateMutation = { createCertificate: { id: number, title: string, institution: string | null, year: number | null, fileUrl: string, verified: boolean, createdAt: string } };

export type GetMyRealtimeOrdersAsProviderQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyRealtimeOrdersAsProviderQuery = { myRealtimeOrdersAsProvider: Array<{ id: number, status: Types.RealtimeOrderStatus, createdAt: string, arrivedAt: string | null, startedAt: string | null, completedAt: string | null, respondedAt: string | null, expiresAt: string | null, paymentExpiresAt: string | null, commission: number | null, clientAddress: string | null, clientDescription: string | null, clientLat: number, clientLng: number, providerAddress: string | null, providerLat: number | null, providerLng: number | null, quotedPrice: number | null, quotedHours: number | null, quotedTransport: number | null, counterOfferPrice: number | null, counterOfferHours: number | null, counterOfferTransport: number | null, payment: { amount: number } | null, provider: { id: number, name: string, logoImage: { id: number, cdnUrl: string | null } | null }, client: { id: number, displayName: string | null, reviewsReceived: Array<{ id: number, rating: number } | null> | null }, serviceProvider: { id: number, price: number | null, service: { id: number, name: string } | null } }> };

export type GetMyRealtimeOrdersAsClientQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyRealtimeOrdersAsClientQuery = { myRealtimeOrdersAsClient: Array<{ id: number, status: Types.RealtimeOrderStatus, createdAt: string, arrivedAt: string | null, startedAt: string | null, completedAt: string | null, clientAddress: string | null, clientDescription: string | null, clientLat: number, clientLng: number, providerLat: number | null, providerLng: number | null, quotedPrice: number | null, quotedHours: number | null, quotedTransport: number | null, counterOfferPrice: number | null, counterOfferHours: number | null, counterOfferTransport: number | null, payment: { amount: number } | null, provider: { id: number, name: string, lat: number | null, lng: number | null, location: string | null, logoImage: { id: number, cdnUrl: string | null } | null, reviews: Array<{ id: number, rating: number }> | null, realtimeReviews: Array<{ id: number, rating: number } | null> | null, certificates: Array<{ id: number, verified: boolean }> | null }, serviceProvider: { id: number, price: number | null, service: { id: number, name: string } | null } }> };

export type GetMyRealtimeStateQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyRealtimeStateQuery = { me: { id: number, provider: { id: number, isRealtimeActive: boolean | null, activeRealtimeOrder: { id: number, status: Types.RealtimeOrderStatus, clientLat: number, clientLng: number, providerLat: number | null, providerLng: number | null, clientAddress: string | null, quotedPrice: number | null, quotedHours: number | null, quotedTransport: number | null, counterOfferPrice: number | null, counterOfferHours: number | null, counterOfferTransport: number | null, startedAt: string | null, completedAt: string | null, clientDescription: string | null, client: { id: number, displayName: string | null, reviewsReceived: Array<{ id: number, rating: number } | null> | null }, serviceProvider: { id: number, price: number | null, service: { id: number, name: string } | null }, payment: { amount: number } | null } | null } | null, activeRealtimeOrder: { id: number, status: Types.RealtimeOrderStatus, clientLat: number, clientLng: number, providerLat: number | null, providerLng: number | null, clientAddress: string | null, quotedPrice: number | null, quotedHours: number | null, quotedTransport: number | null, counterOfferPrice: number | null, counterOfferHours: number | null, counterOfferTransport: number | null, startedAt: string | null, completedAt: string | null, clientDescription: string | null, providerId: number, provider: { id: number, name: string, lat: number | null, lng: number | null, logoImage: { id: number, cdnUrl: string | null } | null, reviews: Array<{ id: number, rating: number }> | null, realtimeReviews: Array<{ id: number, rating: number } | null> | null, certificates: Array<{ id: number, verified: boolean }> | null }, serviceProvider: { id: number, price: number | null, service: { id: number, name: string } | null }, payment: { amount: number } | null } | null } };

export type GetMessagesQueryVariables = Exact<{
  orderRealtimeId: number;
}>;


export type GetMessagesQuery = { messages: Array<{ id: number, message: string | null, senderId: number, createdAt: string, sender: { id: number, displayName: string | null }, image: { id: number, cdnUrl: string | null } | null }> };

export type SetMyRealtimeAvailabilityMutationVariables = Exact<{
  active: boolean;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
}>;


export type SetMyRealtimeAvailabilityMutation = { setMyRealtimeAvailability: boolean };

export type CreateRealtimeContactRequestMutationVariables = Exact<{
  input: Types.CreateRealtimeOrderInput;
}>;


export type CreateRealtimeContactRequestMutation = { createRealtimeContactRequest: { id: number, status: Types.RealtimeOrderStatus, clientLat: number, clientLng: number, providerLat: number | null, providerLng: number | null, clientAddress: string | null, clientDescription: string | null, provider: { id: number, name: string, lat: number | null, lng: number | null, logoImage: { id: number, cdnUrl: string | null } | null, reviews: Array<{ id: number, rating: number }> | null, realtimeReviews: Array<{ id: number, rating: number } | null> | null, certificates: Array<{ id: number, verified: boolean }> | null }, serviceProvider: { id: number, price: number | null, service: { id: number, name: string } | null } } };

export type QuoteRealtimeOrderMutationVariables = Exact<{
  orderRealtimeId: number;
  quotedHours: number;
  quotedTransport: number;
  quotedPrice: number;
}>;


export type QuoteRealtimeOrderMutation = { quoteRealtimeOrder: { id: number, status: Types.RealtimeOrderStatus, quotedPrice: number | null, quotedHours: number | null, quotedTransport: number | null } };

export type UpdateRealtimeQuoteMutationVariables = Exact<{
  orderRealtimeId: number;
  quotedHours: number;
  quotedTransport: number;
  quotedPrice: number;
}>;


export type UpdateRealtimeQuoteMutation = { updateRealtimeQuote: { id: number, status: Types.RealtimeOrderStatus, quotedPrice: number | null, quotedHours: number | null, quotedTransport: number | null } };

export type AcceptRealtimeOrderQuoteMutationVariables = Exact<{
  orderRealtimeId: number;
}>;


export type AcceptRealtimeOrderQuoteMutation = { acceptRealtimeOrderQuote: { id: number, status: Types.RealtimeOrderStatus } };

export type RejectRealtimeOrderQuoteMutationVariables = Exact<{
  orderRealtimeId: number;
}>;


export type RejectRealtimeOrderQuoteMutation = { rejectRealtimeOrderQuote: { id: number, status: Types.RealtimeOrderStatus, respondedAt: string | null } };

export type RespondRealtimeContactRequestMutationVariables = Exact<{
  orderRealtimeId: number;
  decision: string;
}>;


export type RespondRealtimeContactRequestMutation = { respondRealtimeContactRequest: { id: number, status: Types.RealtimeOrderStatus, respondedAt: string | null } };

export type ConfirmRealtimeArrivalMutationVariables = Exact<{
  orderRealtimeId: number;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
}>;


export type ConfirmRealtimeArrivalMutation = { confirmRealtimeArrival: { id: number, status: Types.RealtimeOrderStatus, arrivedAt: string | null, providerLat: number | null, providerLng: number | null } };

export type StartRealtimeOrderMutationVariables = Exact<{
  orderRealtimeId: number;
}>;


export type StartRealtimeOrderMutation = { startRealtimeOrder: { id: number, status: Types.RealtimeOrderStatus, startedAt: string | null, arrivedAt: string | null } };

export type FinishRealtimeOrderMutationVariables = Exact<{
  orderRealtimeId: number;
}>;


export type FinishRealtimeOrderMutation = { finishRealtimeOrder: { id: number, status: Types.RealtimeOrderStatus, completedAt: string | null } };

export type CancelRealtimeOrderMutationVariables = Exact<{
  orderRealtimeId: number;
}>;


export type CancelRealtimeOrderMutation = { cancelRealtimeOrder: { id: number, status: Types.RealtimeOrderStatus, respondedAt: string | null } };

export type UpdateRealtimeOrderLocationMutationVariables = Exact<{
  orderRealtimeId: number;
  lat: number;
  lng: number;
  timestamp?: number | null | undefined;
}>;


export type UpdateRealtimeOrderLocationMutation = { updateRealtimeOrderLocation: { id: number, clientLat: number, clientLng: number, providerLat: number | null, providerLng: number | null, updatedAt: string } };

export type UpdateProviderLocationMutationVariables = Exact<{
  lat: number;
  lng: number;
  timestamp?: number | null | undefined;
}>;


export type UpdateProviderLocationMutation = { updateProviderLocation: boolean };

export type InitRealtimeFlowPaymentMutationVariables = Exact<{
  orderRealtimeId: number;
  returnUrl: string;
}>;


export type InitRealtimeFlowPaymentMutation = { initRealtimeFlowPayment: { url: string, token: string, paymentExpiresAt: string } };

export type ConfirmRealtimeFlowPaymentMutationVariables = Exact<{
  token: string;
}>;


export type ConfirmRealtimeFlowPaymentMutation = { confirmRealtimeFlowPayment: { id: number, status: Types.RealtimeOrderStatus } };

export type PayRealtimeOrderWithSavedCardMutationVariables = Exact<{
  orderRealtimeId: number;
}>;


export type PayRealtimeOrderWithSavedCardMutation = { payRealtimeOrderWithSavedCard: { id: number, status: Types.RealtimeOrderStatus, quotedPrice: number | null, quotedHours: number | null, quotedTransport: number | null, respondedAt: string | null, provider: { id: number, name: string, lat: number | null, lng: number | null }, payment: { amount: number } | null } };

export type SendMessageMutationVariables = Exact<{
  orderRealtimeId: number;
  message: string;
}>;


export type SendMessageMutation = { sendMessage: { id: number, message: string | null, senderId: number, createdAt: string, sender: { id: number, displayName: string | null } } };

export type CreateRealtimeProviderReviewMutationVariables = Exact<{
  input: Types.CreateRealtimeProviderReviewInput;
}>;


export type CreateRealtimeProviderReviewMutation = { createRealtimeProviderReview: { id: number, rating: number, comment: string | null } };

export type CreateClientReviewMutationVariables = Exact<{
  input: Types.CreateClientReviewInput;
}>;


export type CreateClientReviewMutation = { createClientReview: { id: number, rating: number, comment: string | null } };

export type RequestProviderToConnectMutationVariables = Exact<{
  serviceProviderId: number;
}>;


export type RequestProviderToConnectMutation = { requestProviderToConnect: boolean };

export type GuestCreateRealtimeContactRequestMutationVariables = Exact<{
  input: Types.GuestCreateRealtimeOrderInput;
}>;


export type GuestCreateRealtimeContactRequestMutation = { guestCreateRealtimeContactRequest: { accessToken: string, order: { id: number, status: Types.RealtimeOrderStatus, clientLat: number, clientLng: number, providerLat: number | null, providerLng: number | null, clientAddress: string | null, clientDescription: string | null, provider: { id: number, name: string, lat: number | null, lng: number | null, logoImage: { id: number, cdnUrl: string | null } | null, reviews: Array<{ id: number, rating: number }> | null, realtimeReviews: Array<{ id: number, rating: number } | null> | null, certificates: Array<{ id: number, verified: boolean }> | null }, serviceProvider: { id: number, price: number | null, service: { id: number, name: string } | null } }, user: { id: number, displayName: string | null, email: string | null, phone: string | null } } };

export type ClientCounterOfferRealtimeOrderMutationVariables = Exact<{
  input: Types.CounterOfferRealtimeOrderInput;
}>;


export type ClientCounterOfferRealtimeOrderMutation = { clientCounterOfferRealtimeOrder: { id: number, status: Types.RealtimeOrderStatus, counterOfferPrice: number | null, counterOfferHours: number | null, counterOfferTransport: number | null } };

export type RespondToCounterOfferMutationVariables = Exact<{
  orderRealtimeId: number;
  decision: string;
}>;


export type RespondToCounterOfferMutation = { respondToCounterOffer: { id: number, status: Types.RealtimeOrderStatus, quotedPrice: number | null, quotedHours: number | null, quotedTransport: number | null, counterOfferPrice: number | null, counterOfferHours: number | null, counterOfferTransport: number | null } };

export type GetProviderPlanQueryVariables = Exact<{ [key: string]: never; }>;


export type GetProviderPlanQuery = { myProviderPlan: { plan: Types.ProviderPlan } | null };

export type MyServicesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyServicesQuery = { myServices: Array<{ id: number, name: string, slug: string, description: string | null, imageUrl: string | null, image: { id: number, cdnUrl: string | null } | null, category: { id: number, name: string, slug: string } | null, serviceProviders: Array<{ id: number, price: number | null, hasHomeVisit: boolean, description: string | null, providerId: number, slug: string, serviceId: number | null, isCertified: boolean, portfolio: Array<{ id: number, title: string | null, description: string | null, imageUrl: string, image: { id: number, cdnUrl: string | null } | null }> | null, certificates: Array<{ id: number, title: string, institution: string | null, year: number | null, verified: boolean, fileUrl: string }> | null, cities: Array<{ city: string }> | null }> | null }> };

export type CreateServiceMutationVariables = Exact<{
  input: Types.CreateServiceInput;
}>;


export type CreateServiceMutation = { createService: { id: number, price: number | null, hasHomeVisit: boolean, description: string | null, slug: string, providerId: number, serviceId: number | null, service: { id: number, name: string, slug: string } | null } };

export type UpdateServiceMutationVariables = Exact<{
  id: number;
  input: Types.UpdateServiceInput;
}>;


export type UpdateServiceMutation = { updateService: { id: number, price: number | null, hasHomeVisit: boolean, description: string | null, slug: string } };

export type DeleteServiceMutationVariables = Exact<{
  id: number;
}>;


export type DeleteServiceMutation = { deleteService: boolean };

export type CreateSupportTicketMutationVariables = Exact<{
  input: Types.CreateSupportTicketInput;
}>;


export type CreateSupportTicketMutation = { createSupportTicket: { id: number, email: string, subject: string, message: string, status: string, createdAt: string } };

export type MyWalletQueryVariables = Exact<{ [key: string]: never; }>;


export type MyWalletQuery = { myWallet: { id: number, balance: number, transactions: Array<{ id: number, type: string, amount: number, description: string | null, createdAt: string, orderRealtimeId: number | null }> } };

export type RequestWithdrawalMutationVariables = Exact<{ [key: string]: never; }>;


export type RequestWithdrawalMutation = { requestWithdrawal: { id: number, amount: number, status: Types.WithdrawalStatus, bankName: string, accountType: string, accountNumber: string, rut: string, email: string, createdAt: string } };

export type MyPaymentHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPaymentHistoryQuery = { myPaymentHistory: { totalSpent: number, payments: Array<{ id: string, amount: number, description: string, details: string | null, createdAt: string, type: Types.PaymentEntryType, status: Types.PaymentStatus, transactionId: string | null, orderId: number | null }> } };

export type RegisterCardMutationVariables = Exact<{
  returnUrl: string;
}>;


export type RegisterCardMutation = { registerCard: { alreadyRegistered: boolean, url: string | null, token: string | null } };

export type UpdateUserMutationVariables = Exact<{
  input: Types.UpdateUserInput;
}>;


export type UpdateUserMutation = { updateUser: { id: number, displayName: string | null, email: string | null, phone: string | null, birthday: string | null } };

export type UpdateProviderMutationVariables = Exact<{
  id: number;
  input: Types.UpdateProviderInput;
}>;


export type UpdateProviderMutation = { updateProvider: { id: number, name: string, bio: string | null, location: string | null, logoImage: { id: number, cdnUrl: string | null } | null } };

export type UpdateBankMutationVariables = Exact<{
  input: Types.BankAccountInput;
  providerId: number;
}>;


export type UpdateBankMutation = { updateBank: { id: number, bankName: string, accountType: string, accountNumber: string } };

export type UpdateMyBankAccountMutationVariables = Exact<{
  input: Types.UpdateBankUserInput;
}>;


export type UpdateMyBankAccountMutation = { updateMyBankAccount: { id: number, bankName: string, accountType: string, accountNumber: string } };

export type MyProviderPlanQueryVariables = Exact<{ [key: string]: never; }>;


export type MyProviderPlanQuery = { myProviderPlan: { id: number, plan: Types.ProviderPlan, planActive: boolean, planEndsAt: string | null, subscriptionFlowId: string | null, interval: Types.PlanInterval | null, status: Types.OrderStatus, total: number } | null };

export type InitPlanMutationVariables = Exact<{
  input: Types.CreatePlanOrderGeneralInput;
}>;


export type InitPlanMutation = { initPlan: { success: boolean, message: string | null, planEndsAt: string | null, externalSubscriptionId: string | null } };

export type CancelSubscriptionMutationVariables = Exact<{
  input: Types.ManageSubscriptionInput;
}>;


export type CancelSubscriptionMutation = { cancelSubscription: { success: boolean, message: string | null, planEndsAt: string | null } };

export type ReactivateSubscriptionMutationVariables = Exact<{
  input: Types.ManageSubscriptionInput;
}>;


export type ReactivateSubscriptionMutation = { reactivateSubscription: { success: boolean, message: string | null, planEndsAt: string | null, externalSubscriptionId: string | null } };

export type UpdateIdentityMutationVariables = Exact<{
  input: Types.IdentityInput;
}>;


export type UpdateIdentityMutation = { updateIdentity: { id: number, displayName: string | null } };

export type CreateUserIdentityMutationVariables = Exact<{
  input: Types.CreateUserIdentityInput;
}>;


export type CreateUserIdentityMutation = { createUserIdentity: { id: number, status: Types.IdentityStatus } };

export type CreateKycSessionMutationVariables = Exact<{
  userId: number;
}>;


export type CreateKycSessionMutation = { createKycSession: string };

export type CompleteKycMutationVariables = Exact<{
  session: string;
}>;


export type CompleteKycMutation = { completeKyc: boolean };

export type GetProviderRegistrationStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type GetProviderRegistrationStatusQuery = { getProviderRegistrationStatus: { hasUser: boolean, emailVerified: boolean, identityCompleted: boolean, kycVerified: boolean, bankCreated: boolean } };

export type KycStatusQueryVariables = Exact<{
  session: string;
}>;


export type KycStatusQuery = { kycStatus: boolean };

export type CreateOrderAdWithPaymentMutationVariables = Exact<{
  adId?: number | null | undefined;
  categoryId?: number | null | undefined;
  city: string;
  couponCode?: string | null | undefined;
  days: number;
  favicon?: string | null | undefined;
  image: string;
  info: string;
  link: string;
  serviceId?: number | null | undefined;
  total: number;
}>;


export type CreateOrderAdWithPaymentMutation = { createOrderAdWithPayment: { id: number, status: Types.OrderStatus, total: number } };

export type CreateFlowAdTransactionMutationVariables = Exact<{
  orderId: number;
  returnUrl?: string | null | undefined;
}>;


export type CreateFlowAdTransactionMutation = { createFlowAdTransaction: { url: string, token: string } };

export type ConfirmFlowAdMutationVariables = Exact<{
  token: string;
}>;


export type ConfirmFlowAdMutation = { confirmFlowAdTransaction: { id: number, status: Types.OrderStatus } };

export type PayAdOrderWithSavedCardMutationVariables = Exact<{
  orderAdsId: number;
}>;


export type PayAdOrderWithSavedCardMutation = { payAdOrderWithSavedCard: { id: number, status: Types.OrderStatus } };

export type DeleteSavedCardMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteSavedCardMutation = { deleteSavedCard: boolean };
