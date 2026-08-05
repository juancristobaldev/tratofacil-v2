export enum Role {
  ADMIN = 'ADMIN',
  CITY_ADMIN = 'CITY_ADMIN',
  CLIENT = 'CLIENT',
  PROVIDER = 'PROVIDER',
}

export enum OrderStatus {
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
}

export enum RealtimeOrderStatus {
  ACCEPTED = 'ACCEPTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PENDING = 'PENDING',
  QUOTED = 'QUOTED',
  REJECTED = 'REJECTED',
}

export enum PaymentProvider {
  FLOW = 'FLOW',
  MERCADOPAGO = 'MERCADOPAGO',
  WEBPAY = 'WEBPAY',
}

export enum PaymentStatus {
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  INITIATED = 'INITIATED',
}

export enum ProviderPlan {
  FREE = 'FREE',
  TRATOFACIL_SRV_PREMIUM = 'TRATOFACIL_SRV_PREMIUM',
  TRATOFACIL_SRV_PRO = 'TRATOFACIL_SRV_PRO',
}

export enum UserPlan {
  FREE = 'FREE',
  TRATOFACIL_PUB_BUSINESS = 'TRATOFACIL_PUB_BUSINESS',
  TRATOFACIL_PUB_FULL = 'TRATOFACIL_PUB_FULL',
  TRATOFACIL_PUB_INITIAL = 'TRATOFACIL_PUB_INITIAL',
  TRATOFACIL_PUB_PRO = 'TRATOFACIL_PUB_PRO',
}

export enum IdentityStatus {
  APPROVED = 'APPROVED',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

export interface Image {
  id: number;
  cdnUrl: string | null;
  compressedKey: string | null;
  extension: string | null;
  key: string | null;
  status: string | null;
}

export interface User {
  id: number;
  email: string | null;
  emailVerified: boolean;
  birthday: string | null;
  kycStatus: boolean | null;
  phone: string;
  displayName: string | null;
  flowCustomerId: string;
  creditCardType: string;
  last4CardDigits: string;
  username: string;
  role: Role;
  isProfileComplete: boolean;
  isProfileFullyComplete: boolean;
  isGuest: boolean;
  provider: Provider | null;
  wallet: Wallet | null;
  identitys: Identity[];
  planOrders: PlanOrder[];
  marketplacePlanOrders: PlanUserOrder[];
}

export interface Identity {
  id: number;
  status: IdentityStatus;
}

export interface Provider {
  id: number;
  name: string;
  bio: string | null;
  slug: string;
  lat: number | null;
  lng: number | null;
  location: string | null;
  logoUrl: string | null;
  logoImage: Image | null;
  rut: string | null;
  priority: number;
  isRealtimeActive: boolean;
  hasSchedule: boolean;
  completedOrdersCount: number | null;
  bank: BankAccount | null;
  services: ServiceProvider[];
  reviews: ProviderReview[];
  realtimeReviews: RealtimeProviderReview[];
  certificates: ProviderCertificate[];
  hobbys: Hobby[];
  schedules: ProviderSchedule[];
  activeRealtimeOrder: OrderRealTime | null;
  user: User | null;
  userId: number;
}

export interface BankAccount {
  id: number;
  bankName: string;
  accountType: string;
  accountNumber: string;
  email: string | null;
  rut: string | null;
}

export interface BankAccountUser {
  id: number;
  bankName: string;
  accountType: string;
  accountNumber: string;
  email: string | null;
  rut: string | null;
}

export interface Service {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  image: Image | null;
  category: Category | null;
  serviceProviders: ServiceProvider[] | null;
}

export interface ServiceDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  hasHomeVisit: boolean | null;
  commission: number | null;
  netAmount: number | null;
  imageUrl: string | null;
  image: Image | null;
  category: Category | null;
  service: Service | null;
  provider: Provider | null;
  serviceProviders: ServiceProvider[] | null;
}

export interface ServiceProvider {
  id: number;
  price: number | null;
  commission: number | null;
  netAmount: number | null;
  description: string | null;
  hasHomeVisit: boolean;
  slug: string;
  providerId: number;
  serviceId: number | null;
  provider: Provider | null;
  service: Service | null;
  orders: Order[] | null;
  cities: ServiceProviderOnCity[] | null;
}

export interface ServiceProviderOnCity {
  city: string;
  serviceProviderId: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  imageUrl: string | null;
  image: Image | null;
  parent: Category | null;
  parentId: number | null;
  services: Service[] | null;
  subCategories: Category[] | null;
}

export interface CategoryProduct {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  shippingDisabled: boolean;
  parent: CategoryProduct | null;
  parentId: number | null;
  products: Product[] | null;
  subCategories: CategoryProduct[] | null;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  description: string | null;
  location: string | null;
  stock: number;
  categoryProductId: number;
  subCategorySlug: string | null;
  categoryProduct: CategoryProduct | null;
  user: User | null;
  userId: number;
  images: ProductImage[] | null;
  deliveryCondition: ConditionDelivery | null;
}

export interface ProductImage {
  id: number;
  url: string;
  image: Image | null;
}

export interface ConditionDelivery {
  id: number;
  deliveryType: string;
  shippingPayer: string;
  maxDispatchDays: number;
  confirmationDeadline: string;
}

export interface Job {
  id: number;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  userId: number;
  user: User;
  applications: JobApplication[] | null;
  orders: OrderJob[] | null;
  reviews: ReviewsJob[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: number;
  message: string | null;
  status: string;
  jobId: number;
  workerId: number;
  job: Job;
  worker: User;
}

export interface Order {
  id: number;
  total: number;
  commission: number;
  status: OrderStatus;
  scheduledAt: string | null;
  clientAddress: string | null;
  clientLat: number | null;
  clientLng: number | null;
  clientId: number;
  client: User;
  serviceProviderId: number | null;
  serviceProvider: ServiceProvider | null;
  payment: Payment | null;
  review: ProviderReview | null;
  scheduleStatus: string;
  requestStatus: string;
}

export interface OrderJob {
  id: number;
  total: number | null;
  commission: number | null;
  status: OrderStatus;
  jobId: number;
  job: Job;
  clientId: number;
  client: User;
  workerId: number | null;
  worker: User | null;
  payment: PaymentJob | null;
}

export interface OrderProduct {
  id: number;
  total: number;
  unitPrice: number;
  quantity: number;
  commission: number;
  status: OrderStatus;
  productId: number;
  product: Product;
  clientId: number;
  client: User;
  sellerId: number;
  seller: User;
  shippingCompany: string | null;
  trackingCode: string | null;
  shippingInfo: ShippingInfo | null;
  payment: PaymentProduct | null;
  createdAt: string;
}

export interface OrderRealTime {
  id: number;
  status: RealtimeOrderStatus;
  clientAddress: string | null;
  clientDescription: string | null;
  clientLat: number;
  clientLng: number;
  clientPlaceId: string | null;
  providerLat: number | null;
  providerLng: number | null;
  quotedPrice: number | null;
  quotedHours: number | null;
  quotedTransport: number | null;
  counterOfferPrice: number | null;
  counterOfferHours: number | null;
  counterOfferTransport: number | null;
  commission: number | null;
  clientId: number;
  providerId: number;
  serviceProviderId: number;
  client: User;
  provider: Provider;
  serviceProvider: ServiceProvider;
  payment: PaymentRealTime | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  respondedAt: string | null;
  expiresAt: string | null;
  paymentExpiresAt: string | null;
}

export interface Wallet {
  id: number;
  balance: number;
  userId: number;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: number;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface Payment {
  id: number;
  amount: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  transactionId: string | null;
  orderId: number;
}

export interface PaymentJob {
  id: number;
  amount: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  transactionId: string | null;
}

export interface PaymentProduct {
  id: number;
  amount: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  transactionId: string | null;
}

export interface PaymentRealTime {
  id: number;
  amount: number;
}

export interface ProviderReview {
  id: number;
  rating: number;
  comment: string | null;
  providerId: number;
  clientId: number;
  orderId: number | null;
  client: User;
  order: Order | null;
  createdAt: string;
}

export interface RealtimeProviderReview {
  id: number;
  rating: number;
  comment: string | null;
  providerId: number;
  clientId: number;
  orderRealtimeId: number;
  client: User | null;
  createdAt: string;
}

export interface ClientReview {
  id: number;
  rating: number;
  comment: string | null;
  providerId: number;
  clientId: number;
  orderRealtimeId: number;
  provider: Provider | null;
}

export interface ReviewsJob {
  id: number;
  rating: number;
  comment: string | null;
  workerId: number;
  clientId: number;
  jobId: number;
  client: User;
  worker: User;
}

export interface ReviewsProduct {
  rating: number;
  comment: string | null;
  orderId: number;
}

export interface ProviderCertificate {
  id: number;
  title: string;
  institution: string | null;
  year: number | null;
  fileUrl: string | null;
  fileImage: Image | null;
  verified: boolean;
  providerId: number;
}

export interface Hobby {
  id: number;
  name: string;
  providerId: number;
}

export interface ProviderSchedule {
  id: number;
  dayOfWeek: number;
  providerId: number;
  slots: ProviderScheduleSlot[] | null;
}

export interface ProviderScheduleSlot {
  id: number;
  time: string;
}

export interface ShippingInfo {
  id: number;
  street: string;
  number: string;
  commune: string;
  region: string;
  reference: string | null;
  dept: string | null;
  phone: string;
}

export interface PlanOrder {
  id: number;
  plan: ProviderPlan;
  planActive: boolean;
  planEndsAt: string | null;
  subscriptionFlowId: string | null;
  interval: string | null;
  status: string;
  total: number;
}

export interface PlanUserOrder {
  id: number;
  plan: UserPlan;
  planActive: boolean;
  planEndsAt: string | null;
  subscriptionFlowId: string | null;
  interval: string;
  status: string;
  total: number;
}

export interface PaymentHistoryEntry {
  id: string;
  amount: number;
  description: string;
  details: string | null;
  createdAt: string;
  type: string;
  status: PaymentStatus;
  transactionId: string | null;
  orderId: number | null;
}

export interface PaymentHistoryResponse {
  payments: PaymentHistoryEntry[];
  totalSpent: number;
}

export interface WithdrawalResult {
  id: number;
  amount: number;
  status: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  rut: string;
  email: string;
  createdAt: string;
  userId: number;
}

export interface ProviderDailyAvailability {
  date: string;
  slots: string[];
  availableSlots: string[];
  occupiedSlots: string[];
}

export interface AdsWithMarketing {
  ads: Ads[];
  marketingHero: ImageMarketing[];
  marketingHorizontal: ImageMarketing[];
  marketingVertical: ImageMarketing[];
}

export interface Ads {
  id: number;
  userId: number;
  user: User;
  expiredAt: string;
}

export interface ImageMarketing {
  id: number;
  key: string;
  orientation: string | null;
  type: string | null;
  image: Image;
}

export interface PlanResponse {
  success: boolean;
  message: string;
  planEndsAt: string | null;
  externalSubscriptionId: string | null;
}

export interface WebpayResponse {
  url: string;
  token: string;
}

export interface RealtimePaymentInitResponse {
  url: string;
  token: string;
  paymentExpiresAt: string;
}

export interface GuestCheckoutResponse {
  accessToken: string;
  token: string;
  url: string;
  orderId: number;
  user: User;
}

export interface ChatMessageEntity {
  id: number;
  message: string | null;
  senderId: number;
  orderRealtimeId: number;
  sender: User;
  image: Image | null;
  createdAt: string;
}

export interface RegisterCardForPlanResponse {
  alreadyRegistered: boolean;
  url: string | null;
  token: string | null;
}

export type AppRole = 'guest' | 'client' | 'provider';

export interface OrdersObject {
  services: Order[] | null;
  products: OrderProduct[] | null;
  jobs: OrderJob[] | null;
}
