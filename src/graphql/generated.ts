export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: unknown; output: unknown; }
};

export type Ads = {
  __typename?: 'Ads';
  expiredAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  orders: Array<OrderAds>;
  user: User;
  userId: Scalars['Int']['output'];
};

export type AdsWithMarketing = {
  __typename?: 'AdsWithMarketing';
  ads: Array<Ads>;
  marketingHero: Array<ImageMarketing>;
  marketingHorizontal: Array<ImageMarketing>;
  marketingVertical: Array<ImageMarketing>;
};

export type AuthType = {
  __typename?: 'AuthType';
  /** Token JWT para sesiones autorizadas */
  accessToken: Scalars['String']['output'];
  /** Información del usuario autenticado */
  user: User;
};

export type BankAccount = {
  __typename?: 'BankAccount';
  accountNumber: Scalars['String']['output'];
  accountType: Scalars['String']['output'];
  bankName: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  providerId: Scalars['Int']['output'];
  rut?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type BankAccountInput = {
  accountNumber: Scalars['String']['input'];
  accountType: Scalars['String']['input'];
  bankName: Scalars['String']['input'];
  email?: InputMaybe<Scalars['String']['input']>;
  rut?: InputMaybe<Scalars['String']['input']>;
};

export type BankAccountUser = {
  __typename?: 'BankAccountUser';
  accountNumber: Scalars['String']['output'];
  accountType: Scalars['String']['output'];
  bankName: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  rut?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['Int']['output'];
};

export type Category = {
  __typename?: 'Category';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  image?: Maybe<Image>;
  /** @deprecated Usar image.cdnUrl */
  imageUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  parent?: Maybe<Category>;
  parentId?: Maybe<Scalars['Int']['output']>;
  position: Scalars['Int']['output'];
  services?: Maybe<Array<Maybe<Service>>>;
  slug: Scalars['String']['output'];
  subCategories?: Maybe<Array<Maybe<Category>>>;
};

export type CategoryProduct = {
  __typename?: 'CategoryProduct';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  parent?: Maybe<CategoryProduct>;
  parentId?: Maybe<Scalars['Int']['output']>;
  /** Lista de productos que pertenecen a esta categoría */
  products?: Maybe<Array<Maybe<Product>>>;
  shippingDisabled: Scalars['Boolean']['output'];
  slug: Scalars['String']['output'];
  /** Subcategorías dependientes de este rubro principal */
  subCategories?: Maybe<Array<Maybe<CategoryProduct>>>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ChatMessageEntity = {
  __typename?: 'ChatMessageEntity';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  image?: Maybe<Image>;
  /** @deprecated Usar image.cdnUrl */
  imageUrl?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  orderRealtimeId: Scalars['Int']['output'];
  sender: User;
  senderId: Scalars['Int']['output'];
};

export type ClientReview = {
  __typename?: 'ClientReview';
  clientId: Scalars['Int']['output'];
  comment?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  orderRealtimeId: Scalars['Int']['output'];
  provider?: Maybe<Provider>;
  providerId: Scalars['Int']['output'];
  rating: Scalars['Int']['output'];
};

export type ComissionServices = {
  __typename?: 'ComissionServices';
  comissionJob: Scalars['Float']['output'];
  comissionMarketplace: Scalars['Float']['output'];
  id: Scalars['Int']['output'];
};

export type ConditionDelivery = {
  __typename?: 'ConditionDelivery';
  confirmationDeadline: Scalars['DateTime']['output'];
  createdAt: Scalars['DateTime']['output'];
  deliveryType: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  maxDispatchDays: Scalars['Int']['output'];
  productId: Scalars['Int']['output'];
  shippingPayer: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ConditionDeliveryInput = {
  confirmationDeadline: Scalars['DateTime']['input'];
  deliveryType: Scalars['String']['input'];
  maxDispatchDays: Scalars['Int']['input'];
  shippingPayer: Scalars['String']['input'];
};

export type CounterOfferRealtimeOrderInput = {
  orderRealtimeId: Scalars['Int']['input'];
  quotedHours: Scalars['Int']['input'];
  quotedPrice: Scalars['Int']['input'];
  quotedTransport: Scalars['Int']['input'];
};

export type Coupon = {
  __typename?: 'Coupon';
  amount?: Maybe<Scalars['Int']['output']>;
  duration: Scalars['String']['output'];
  expires: Scalars['DateTime']['output'];
  id: Scalars['Float']['output'];
  max_redemptions: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  percent_off?: Maybe<Scalars['Int']['output']>;
  redemtions: Scalars['Float']['output'];
  scope: Scalars['String']['output'];
};

export type CouponResponse = {
  __typename?: 'CouponResponse';
  couponId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export type CreateCategoryProductInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  parentId?: InputMaybe<Scalars['Int']['input']>;
  shippingDisabled?: InputMaybe<Scalars['Boolean']['input']>;
  slug: Scalars['String']['input'];
};

export type CreateCertificateInput = {
  fileUrl: Scalars['String']['input'];
  institution?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  year?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateClientReviewInput = {
  clientId: Scalars['Int']['input'];
  comment?: InputMaybe<Scalars['String']['input']>;
  orderRealtimeId: Scalars['Int']['input'];
  rating: Scalars['Int']['input'];
};

export type CreateContactRequestInput = {
  clientAddress?: InputMaybe<Scalars['String']['input']>;
  clientLat: Scalars['Float']['input'];
  clientLng: Scalars['Float']['input'];
  clientPlaceId?: InputMaybe<Scalars['String']['input']>;
  serviceProviderId: Scalars['Int']['input'];
};

export type CreateCouponInput = {
  amount?: InputMaybe<Scalars['Int']['input']>;
  currency?: Scalars['String']['input'];
  duration?: InputMaybe<Scalars['Int']['input']>;
  expires?: InputMaybe<Scalars['String']['input']>;
  max_redemptions?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  percent_off?: InputMaybe<Scalars['Int']['input']>;
  scope?: Scalars['String']['input'];
  times?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateHobbyInput = {
  name: Scalars['String']['input'];
  providerId: Scalars['Int']['input'];
};

export type CreateImageMarketingInput = {
  key: Scalars['String']['input'];
  orientation?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type CreateImageTransitionInput = {
  duration: Scalars['Int']['input'];
  orientation: Scalars['String']['input'];
  type?: Scalars['String']['input'];
};

export type CreateJobInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  location: Scalars['String']['input'];
  price?: InputMaybe<Scalars['Float']['input']>;
  title: Scalars['String']['input'];
};

export type CreateOrderInput = {
  clientAddress?: InputMaybe<Scalars['String']['input']>;
  clientLat?: InputMaybe<Scalars['Float']['input']>;
  clientLng?: InputMaybe<Scalars['Float']['input']>;
  clientPlaceId?: InputMaybe<Scalars['String']['input']>;
  scheduledAt?: InputMaybe<Scalars['DateTime']['input']>;
  serviceProviderId: Scalars['Int']['input'];
  total: Scalars['Float']['input'];
  wcOrderId?: InputMaybe<Scalars['Int']['input']>;
  wcOrderKey?: InputMaybe<Scalars['String']['input']>;
};

export type CreateOrderJobInput = {
  jobId: Scalars['Int']['input'];
  workerId?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateOrderProductInput = {
  productId: Scalars['Int']['input'];
  quantity: Scalars['Int']['input'];
};

export type CreatePlanOrderGeneralInput = {
  couponCode?: InputMaybe<Scalars['String']['input']>;
  customerId: Scalars['String']['input'];
  interval: PlanInterval;
  plan: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

export type CreateProductInput = {
  basePrice?: InputMaybe<Scalars['Float']['input']>;
  categoryProductId: Scalars['Int']['input'];
  conditions?: InputMaybe<ConditionDeliveryInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrls?: InputMaybe<Array<Scalars['String']['input']>>;
  location?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  price: Scalars['Float']['input'];
  shippingDisabled?: InputMaybe<Scalars['Boolean']['input']>;
  slug: Scalars['String']['input'];
  stock: Scalars['Int']['input'];
};

export type CreateProviderInput = {
  bank?: InputMaybe<BankAccountInput>;
  bio?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  lat?: InputMaybe<Scalars['Float']['input']>;
  lng?: InputMaybe<Scalars['Float']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
};

export type CreateProviderPortfolioInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrl: Scalars['String']['input'];
  position?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type CreateRealtimeOrderInput = {
  clientAddress?: InputMaybe<Scalars['String']['input']>;
  clientDescription?: InputMaybe<Scalars['String']['input']>;
  clientLat: Scalars['Float']['input'];
  clientLng: Scalars['Float']['input'];
  clientPlaceId?: InputMaybe<Scalars['String']['input']>;
  serviceProviderId: Scalars['Int']['input'];
};

export type CreateRealtimeProviderReviewInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  orderRealtimeId: Scalars['Int']['input'];
  providerId: Scalars['Int']['input'];
  rating: Scalars['Int']['input'];
};

export type CreateReviewInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  orderId?: InputMaybe<Scalars['Int']['input']>;
  providerId: Scalars['Int']['input'];
  rating: Scalars['Int']['input'];
};

export type CreateReviewsJobInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  orderJobId: Scalars['Int']['input'];
  rating: Scalars['Int']['input'];
  workerId: Scalars['Int']['input'];
};

export type CreateReviewsProductInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  orderId: Scalars['Int']['input'];
  rating: Scalars['Int']['input'];
};

export type CreateServiceInput = {
  categoryId?: InputMaybe<Scalars['Int']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  hasHomeVisit: Scalars['Boolean']['input'];
  price: Scalars['Int']['input'];
  slug: Scalars['String']['input'];
};

export type CreateShippingInfoInput = {
  commune: Scalars['String']['input'];
  dept?: InputMaybe<Scalars['String']['input']>;
  number: Scalars['String']['input'];
  phone: Scalars['String']['input'];
  reference?: InputMaybe<Scalars['String']['input']>;
  region: Scalars['String']['input'];
  street: Scalars['String']['input'];
};

export type CreateSupportTicketInput = {
  email: Scalars['String']['input'];
  message: Scalars['String']['input'];
  subject: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateUserIdentityInput = {
  /** Key o URL del documento frontal subido */
  dniFront: Scalars['String']['input'];
  /** qr session */
  qrSession: Scalars['String']['input'];
  /** Key o URL de la selfie subida */
  selfie: Scalars['String']['input'];
};

export type CredentialsInput = {
  birthday?: InputMaybe<Scalars['DateTime']['input']>;
  email: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type DeleteHobbyInput = {
  id: Scalars['Int']['input'];
};

export type GenericResponse = {
  __typename?: 'GenericResponse';
  status: Scalars['String']['output'];
};

export type GuestCheckoutResponse = {
  __typename?: 'GuestCheckoutResponse';
  accessToken: Scalars['String']['output'];
  orderId: Scalars['Int']['output'];
  token: Scalars['String']['output'];
  url: Scalars['String']['output'];
  user: User;
};

export type GuestCreateOrderInput = {
  clientAddress?: InputMaybe<Scalars['String']['input']>;
  clientLat?: InputMaybe<Scalars['Float']['input']>;
  clientLng?: InputMaybe<Scalars['Float']['input']>;
  clientPlaceId?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  phone: Scalars['String']['input'];
  scheduledAt?: InputMaybe<Scalars['DateTime']['input']>;
  serviceProviderId: Scalars['Int']['input'];
  total: Scalars['Float']['input'];
};

export type GuestCreateRealtimeOrderInput = {
  clientAddress?: InputMaybe<Scalars['String']['input']>;
  clientDescription?: InputMaybe<Scalars['String']['input']>;
  clientLat: Scalars['Float']['input'];
  clientLng: Scalars['Float']['input'];
  clientPlaceId?: InputMaybe<Scalars['String']['input']>;
  guestEmail: Scalars['String']['input'];
  guestName?: InputMaybe<Scalars['String']['input']>;
  guestPhone: Scalars['String']['input'];
  serviceProviderId: Scalars['Int']['input'];
};

export type GuestRealtimeContactResponse = {
  __typename?: 'GuestRealtimeContactResponse';
  accessToken: Scalars['String']['output'];
  order: OrderRealTime;
  user: User;
};

export type Hobby = {
  __typename?: 'Hobby';
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  providerId: Scalars['Int']['output'];
};

export type IdentityInput = {
  birthday: Scalars['DateTime']['input'];
  company?: InputMaybe<Scalars['String']['input']>;
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  phone: Scalars['String']['input'];
  rut: Scalars['String']['input'];
  userId: Scalars['Int']['input'];
};

/** Estado actual de la validación biométrica */
export enum IdentityStatus {
  Approved = 'APPROVED',
  Failed = 'FAILED',
  Pending = 'PENDING'
}

export type Image = {
  __typename?: 'Image';
  cdnUrl?: Maybe<Scalars['String']['output']>;
  compressedKey?: Maybe<Scalars['String']['output']>;
  extension?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  key?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
};

export type ImageMarketing = {
  __typename?: 'ImageMarketing';
  id: Scalars['Int']['output'];
  image?: Maybe<Image>;
  /** @deprecated Usar image.cdnUrl */
  key: Scalars['String']['output'];
  orientation?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export type ImageMarketingDurationType = {
  __typename?: 'ImageMarketingDurationType';
  duration: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  orientation: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type ImageMarketingGrouped = {
  __typename?: 'ImageMarketingGrouped';
  hero: Array<ImageMarketing>;
  horizontal: Array<ImageMarketing>;
  vertical: Array<ImageMarketing>;
};

export type Job = {
  __typename?: 'Job';
  applications?: Maybe<Array<JobApplication>>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  location?: Maybe<Scalars['String']['output']>;
  orders?: Maybe<Array<Maybe<OrderJob>>>;
  price?: Maybe<Scalars['Float']['output']>;
  reviews?: Maybe<Array<Maybe<ReviewsJob>>>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['Int']['output'];
};

export type JobApplication = {
  __typename?: 'JobApplication';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  job: Job;
  jobId: Scalars['Int']['output'];
  message?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  worker: User;
  workerId: Scalars['Int']['output'];
};

export type LoginEmailCheckResult = {
  __typename?: 'LoginEmailCheckResult';
  exists: Scalars['Boolean']['output'];
  hasPassword: Scalars['Boolean']['output'];
};

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type ManageSubscriptionInput = {
  orderId: Scalars['Int']['input'];
  type: SubscriptionType;
};

export type Mutation = {
  __typename?: 'Mutation';
  UpdateKyc: User;
  acceptRealtimeOrderQuote: OrderRealTime;
  addProviderPortfolioItem: ProviderPortfolio;
  adminApproveWithdrawal: Withdrawal;
  adminCommission: ComissionServices;
  adminCreateCategory: Category;
  adminCreatePayoutBatch: Array<Withdrawal>;
  adminCreateService: Service;
  adminDeleteCategory: Scalars['Boolean']['output'];
  adminDeleteJob: Job;
  adminDeleteJobReview: Scalars['Boolean']['output'];
  adminDeleteOrder: Scalars['Boolean']['output'];
  adminDeleteReview: Scalars['Boolean']['output'];
  adminDeleteService: Scalars['Boolean']['output'];
  adminDeleteUser: Scalars['Boolean']['output'];
  /** God Mode: Suplantar sesin de cualquier usuario como admin */
  adminLoginAsUser: AuthType;
  adminRejectWithdrawal: Withdrawal;
  adminSetServiceActive: Service;
  adminSetServiceProviderActive: Scalars['Boolean']['output'];
  adminUpdateCategory: Category;
  adminUpdateOrderJobStatus: OrderJob;
  adminUpdateOrderProductStatus: OrderProduct;
  adminUpdateOrderStatus: Order;
  adminUpdateService: Service;
  adminUpdateUser: User;
  adminVerifyCertificate: ProviderCertificate;
  applyToJob: JobApplication;
  approveCertificate: ProviderCertificate;
  cancelOrderJob: OrderJob;
  cancelOrderProduct: OrderProduct;
  cancelRealtimeOrder: OrderRealTime;
  cancelSubscription: PlanResponse;
  clientCounterOfferRealtimeOrder: OrderRealTime;
  completeKyc: Scalars['Boolean']['output'];
  /** Confirma el código y crea el perfil de usuario + proveedor */
  confirmEmailAndCreateUser: AuthType;
  /** Confirma el código y crea el perfil de usuario + proveedor */
  confirmEmailAndRegister: Scalars['Boolean']['output'];
  confirmFlowAdTransaction: OrderAds;
  confirmFlowJob: OrderJob;
  confirmFlowProduct: OrderProduct;
  confirmFlowService: Order;
  confirmOrderProductReceipt: OrderProduct;
  confirmRealtimeFlowPayment: OrderRealTime;
  confirmWebpayProductTransaction: OrderProduct;
  createCategoryProduct: CategoryProduct;
  createCertificate: ProviderCertificate;
  createClientReview: ClientReview;
  createCoupon: CouponResponse;
  createFlowAdTransaction: WebpayResponse;
  createHobby: Hobby;
  createImageMarketing: ImageMarketing;
  createImageTransition: ImageMarketingDurationType;
  createJob: Job;
  createKycSession: Scalars['String']['output'];
  createOrderAdWithPayment: OrderAds;
  createOrderJobWithPayment: OrderJob;
  createOrderProductWithPayment: OrderProduct;
  createOrderServiceWithPayment: Order;
  createProduct: Product;
  createRealtimeContactRequest: OrderRealTime;
  createRealtimeProviderReview: RealtimeProviderReview;
  createReview: ProviderReview;
  createReviewJob: ReviewsJob;
  createReviewProduct: ReviewsProduct;
  createService: ServiceProvider;
  createServiceContactRequest: Order;
  createSupportTicket: SupportTicket;
  createUserIdentity: UserIdentity;
  deleteCategory: Category;
  deleteCertificate: Scalars['Boolean']['output'];
  deleteCoupon: GenericResponse;
  deleteHobby: Hobby;
  deleteImageMarketing: Scalars['Boolean']['output'];
  deleteImageTransition: ImageMarketingDurationType;
  deleteProviderPortfolioItem: Scalars['Boolean']['output'];
  deleteSavedCard: Scalars['Boolean']['output'];
  deleteService: Scalars['Boolean']['output'];
  deleteUserIdentity: Scalars['Boolean']['output'];
  /** Verifica disponibilidad de email y envía código de validación */
  findCredentialsAfterSendEmail: Scalars['Boolean']['output'];
  finishRealtimeOrder: OrderRealTime;
  getCoupon: CouponResponse;
  guestCreateOrderServiceWithPayment: GuestCheckoutResponse;
  guestCreateRealtimeContactRequest: GuestRealtimeContactResponse;
  initFlowJob: WebpayResponse;
  initFlowProduct: WebpayResponse;
  initFlowService: WebpayResponse;
  initPlan: PlanResponse;
  initRealtimeFlowPayment: RealtimePaymentInitResponse;
  initWebpayProductTransaction: WebpayResponse;
  /** Inicia sesión y retorna el token con la info del usuario */
  login: AuthType;
  /** Inicia sesión con Google y retorna el token con la info del usuario */
  loginWithGoogle: AuthType;
  payAdOrderWithSavedCard: OrderAds;
  payJobOrderWithSavedCard: OrderJob;
  payProductOrderWithSavedCard: OrderProduct;
  payRealtimeOrderWithSavedCard: OrderRealTime;
  payServiceOrderWithSavedCard: Order;
  quoteRealtimeOrder: OrderRealTime;
  reactivateSubscription: PlanResponse;
  /** Registra un usuario nuevo (Cliente por defecto) */
  register: AuthType;
  registerCard: RegisterCardForPlanResponse;
  registerProvider: AuthType;
  registerPushToken: Scalars['Boolean']['output'];
  rejectCertificate: ProviderCertificate;
  rejectRealtimeOrderQuote: OrderRealTime;
  removeCategoryProduct: CategoryProduct;
  removeJob: Job;
  removeProduct: Product;
  requestPasswordReset: Scalars['Boolean']['output'];
  requestProviderToConnect: Scalars['Boolean']['output'];
  requestWithdrawal: WithdrawalResult;
  resetPassword: Scalars['Boolean']['output'];
  respondRealtimeContactRequest: OrderRealTime;
  respondServiceContactRequest: Order;
  respondToCounterOffer: OrderRealTime;
  saveMyProviderScheduleDay: ProviderSchedule;
  /** Verifica disponibilidad de email y envía código de validación */
  sendEmailVerificationCode: Scalars['Boolean']['output'];
  sendMessage: ChatMessageEntity;
  setGuestPassword: Scalars['Boolean']['output'];
  setMyRealtimeAvailability: Scalars['Boolean']['output'];
  startRealtimeOrder: OrderRealTime;
  updateBank: BankAccount;
  updateCategoryProduct: CategoryProduct;
  updateCertificate: ProviderCertificate;
  updateCoupon: CouponResponse;
  updateIdentity: User;
  updateIdentityStatus: UserIdentity;
  updateImageMarketing: ImageMarketing;
  updateImageTransition: ImageMarketingDurationType;
  updateJob: Job;
  updateMyBankAccount: BankAccountUser;
  updateOrderAd: OrderAds;
  updateOrderJobStatus: OrderJob;
  updateOrderProductShipping: OrderProduct;
  updateOrderProductStatus: OrderProduct;
  updateOrderServiceStatus: Order;
  updateProduct: Product;
  updateProductStock: Product;
  updateProvider: Provider;
  updateProviderLocation: Scalars['Boolean']['output'];
  updateProviderPortfolioItem: ProviderPortfolio;
  updateRealtimeOrderLocation: OrderRealTime;
  updateRealtimeQuote: OrderRealTime;
  updateService: ServiceProvider;
  updateUser: User;
  validateSubscriptionPayment: Scalars['Boolean']['output'];
};


export type MutationUpdateKycArgs = {
  qrSession: Scalars['String']['input'];
  status: Scalars['Boolean']['input'];
};


export type MutationAcceptRealtimeOrderQuoteArgs = {
  orderRealtimeId: Scalars['Int']['input'];
};


export type MutationAddProviderPortfolioItemArgs = {
  input: CreateProviderPortfolioInput;
};


export type MutationAdminApproveWithdrawalArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAdminCommissionArgs = {
  comissionJob: Scalars['Int']['input'];
  comissionMarketplace: Scalars['Int']['input'];
};


export type MutationAdminCreateCategoryArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  parentId?: InputMaybe<Scalars['Int']['input']>;
  position: Scalars['Int']['input'];
  slug: Scalars['String']['input'];
};


export type MutationAdminCreatePayoutBatchArgs = {
  items: Array<PayoutItemInput>;
};


export type MutationAdminCreateServiceArgs = {
  categoryId: Scalars['Int']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  slug: Scalars['String']['input'];
};


export type MutationAdminDeleteCategoryArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAdminDeleteJobArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAdminDeleteJobReviewArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAdminDeleteOrderArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAdminDeleteReviewArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAdminDeleteServiceArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAdminDeleteUserArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAdminLoginAsUserArgs = {
  userId: Scalars['Int']['input'];
};


export type MutationAdminRejectWithdrawalArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAdminSetServiceActiveArgs = {
  active: Scalars['Boolean']['input'];
  id: Scalars['Int']['input'];
};


export type MutationAdminSetServiceProviderActiveArgs = {
  active: Scalars['Boolean']['input'];
  id: Scalars['Int']['input'];
};


export type MutationAdminUpdateCategoryArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  parentId?: InputMaybe<Scalars['Int']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type MutationAdminUpdateOrderJobStatusArgs = {
  id: Scalars['Int']['input'];
  status: OrderStatus;
};


export type MutationAdminUpdateOrderProductStatusArgs = {
  id: Scalars['Int']['input'];
  status: OrderStatus;
};


export type MutationAdminUpdateOrderStatusArgs = {
  id: Scalars['Int']['input'];
  status: OrderStatus;
};


export type MutationAdminUpdateServiceArgs = {
  categoryId?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type MutationAdminUpdateUserArgs = {
  id: Scalars['Int']['input'];
  role?: InputMaybe<Role>;
  status?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationAdminVerifyCertificateArgs = {
  id: Scalars['Int']['input'];
  verified: Scalars['Boolean']['input'];
};


export type MutationApplyToJobArgs = {
  jobId: Scalars['Int']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
};


export type MutationApproveCertificateArgs = {
  id: Scalars['Int']['input'];
};


export type MutationCancelOrderJobArgs = {
  orderId: Scalars['Int']['input'];
};


export type MutationCancelOrderProductArgs = {
  orderId: Scalars['Int']['input'];
};


export type MutationCancelRealtimeOrderArgs = {
  orderRealtimeId: Scalars['Int']['input'];
};


export type MutationCancelSubscriptionArgs = {
  input: ManageSubscriptionInput;
};


export type MutationClientCounterOfferRealtimeOrderArgs = {
  input: CounterOfferRealtimeOrderInput;
};


export type MutationCompleteKycArgs = {
  session: Scalars['String']['input'];
};


export type MutationConfirmEmailAndCreateUserArgs = {
  code: Scalars['String']['input'];
  credentials: CredentialsInput;
};


export type MutationConfirmEmailAndRegisterArgs = {
  code: Scalars['String']['input'];
  credentials: CredentialsInput;
};


export type MutationConfirmFlowAdTransactionArgs = {
  token: Scalars['String']['input'];
};


export type MutationConfirmFlowJobArgs = {
  token: Scalars['String']['input'];
};


export type MutationConfirmFlowProductArgs = {
  token: Scalars['String']['input'];
};


export type MutationConfirmFlowServiceArgs = {
  token: Scalars['String']['input'];
};


export type MutationConfirmOrderProductReceiptArgs = {
  orderId: Scalars['Int']['input'];
};


export type MutationConfirmRealtimeFlowPaymentArgs = {
  token: Scalars['String']['input'];
};


export type MutationConfirmWebpayProductTransactionArgs = {
  token: Scalars['String']['input'];
};


export type MutationCreateCategoryProductArgs = {
  input: CreateCategoryProductInput;
};


export type MutationCreateCertificateArgs = {
  input: CreateCertificateInput;
};


export type MutationCreateClientReviewArgs = {
  input: CreateClientReviewInput;
};


export type MutationCreateCouponArgs = {
  input: CreateCouponInput;
};


export type MutationCreateFlowAdTransactionArgs = {
  orderId: Scalars['Int']['input'];
  returnUrl?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateHobbyArgs = {
  createHobbyInput: CreateHobbyInput;
};


export type MutationCreateImageMarketingArgs = {
  input: CreateImageMarketingInput;
};


export type MutationCreateImageTransitionArgs = {
  input: CreateImageTransitionInput;
};


export type MutationCreateJobArgs = {
  input: CreateJobInput;
};


export type MutationCreateKycSessionArgs = {
  userId: Scalars['Int']['input'];
};


export type MutationCreateOrderAdWithPaymentArgs = {
  adId?: InputMaybe<Scalars['Int']['input']>;
  categoryId?: InputMaybe<Scalars['Int']['input']>;
  city: Scalars['String']['input'];
  couponCode?: InputMaybe<Scalars['String']['input']>;
  days: Scalars['Int']['input'];
  favicon?: InputMaybe<Scalars['String']['input']>;
  image: Scalars['String']['input'];
  info: Scalars['String']['input'];
  link: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['Int']['input']>;
  total: Scalars['Float']['input'];
};


export type MutationCreateOrderJobWithPaymentArgs = {
  input: CreateOrderJobInput;
};


export type MutationCreateOrderProductWithPaymentArgs = {
  input: CreateOrderProductInput;
  shippingInput: CreateShippingInfoInput;
};


export type MutationCreateOrderServiceWithPaymentArgs = {
  input: CreateOrderInput;
};


export type MutationCreateProductArgs = {
  input: CreateProductInput;
};


export type MutationCreateRealtimeContactRequestArgs = {
  input: CreateRealtimeOrderInput;
};


export type MutationCreateRealtimeProviderReviewArgs = {
  input: CreateRealtimeProviderReviewInput;
};


export type MutationCreateReviewArgs = {
  input: CreateReviewInput;
};


export type MutationCreateReviewJobArgs = {
  input: CreateReviewsJobInput;
};


export type MutationCreateReviewProductArgs = {
  input: CreateReviewsProductInput;
};


export type MutationCreateServiceArgs = {
  input: CreateServiceInput;
};


export type MutationCreateServiceContactRequestArgs = {
  input: CreateContactRequestInput;
};


export type MutationCreateSupportTicketArgs = {
  input: CreateSupportTicketInput;
};


export type MutationCreateUserIdentityArgs = {
  input: CreateUserIdentityInput;
};


export type MutationDeleteCategoryArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteCertificateArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteCouponArgs = {
  couponId: Scalars['Int']['input'];
};


export type MutationDeleteHobbyArgs = {
  deleteHobbyInput: DeleteHobbyInput;
};


export type MutationDeleteImageMarketingArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteImageTransitionArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteProviderPortfolioItemArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteServiceArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteUserIdentityArgs = {
  id: Scalars['Int']['input'];
};


export type MutationFindCredentialsAfterSendEmailArgs = {
  input: CredentialsInput;
};


export type MutationFinishRealtimeOrderArgs = {
  orderRealtimeId: Scalars['Int']['input'];
};


export type MutationGetCouponArgs = {
  name: Scalars['String']['input'];
};


export type MutationGuestCreateOrderServiceWithPaymentArgs = {
  input: GuestCreateOrderInput;
};


export type MutationGuestCreateRealtimeContactRequestArgs = {
  input: GuestCreateRealtimeOrderInput;
};


export type MutationInitFlowJobArgs = {
  orderJobId: Scalars['Int']['input'];
  returnUrl: Scalars['String']['input'];
};


export type MutationInitFlowProductArgs = {
  orderProductId: Scalars['Int']['input'];
  returnUrl: Scalars['String']['input'];
};


export type MutationInitFlowServiceArgs = {
  orderId: Scalars['Int']['input'];
  returnUrl: Scalars['String']['input'];
};


export type MutationInitPlanArgs = {
  input: CreatePlanOrderGeneralInput;
};


export type MutationInitRealtimeFlowPaymentArgs = {
  orderRealtimeId: Scalars['Int']['input'];
  returnUrl: Scalars['String']['input'];
};


export type MutationInitWebpayProductTransactionArgs = {
  orderId: Scalars['Int']['input'];
  returnUrl: Scalars['String']['input'];
};


export type MutationLoginArgs = {
  loginInput: LoginInput;
};


export type MutationLoginWithGoogleArgs = {
  idToken: Scalars['String']['input'];
};


export type MutationPayAdOrderWithSavedCardArgs = {
  orderAdsId: Scalars['Int']['input'];
};


export type MutationPayJobOrderWithSavedCardArgs = {
  orderJobId: Scalars['Int']['input'];
};


export type MutationPayProductOrderWithSavedCardArgs = {
  orderProductId: Scalars['Int']['input'];
};


export type MutationPayRealtimeOrderWithSavedCardArgs = {
  orderRealtimeId: Scalars['Int']['input'];
};


export type MutationPayServiceOrderWithSavedCardArgs = {
  orderId: Scalars['Int']['input'];
};


export type MutationQuoteRealtimeOrderArgs = {
  orderRealtimeId: Scalars['Int']['input'];
  quotedHours: Scalars['Int']['input'];
  quotedPrice: Scalars['Int']['input'];
  quotedTransport: Scalars['Int']['input'];
};


export type MutationReactivateSubscriptionArgs = {
  input: ManageSubscriptionInput;
};


export type MutationRegisterArgs = {
  input: RegisterUserInput;
};


export type MutationRegisterCardArgs = {
  returnUrl: Scalars['String']['input'];
};


export type MutationRegisterProviderArgs = {
  input: CreateProviderInput;
};


export type MutationRegisterPushTokenArgs = {
  platform: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type MutationRejectCertificateArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRejectRealtimeOrderQuoteArgs = {
  orderRealtimeId: Scalars['Int']['input'];
};


export type MutationRemoveCategoryProductArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveJobArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveProductArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRequestPasswordResetArgs = {
  email: Scalars['String']['input'];
};


export type MutationRequestProviderToConnectArgs = {
  serviceProviderId: Scalars['Int']['input'];
};


export type MutationResetPasswordArgs = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type MutationRespondRealtimeContactRequestArgs = {
  decision: Scalars['String']['input'];
  orderRealtimeId: Scalars['Int']['input'];
};


export type MutationRespondServiceContactRequestArgs = {
  decision: Scalars['String']['input'];
  orderId: Scalars['Int']['input'];
};


export type MutationRespondToCounterOfferArgs = {
  decision: Scalars['String']['input'];
  orderRealtimeId: Scalars['Int']['input'];
};


export type MutationSaveMyProviderScheduleDayArgs = {
  input: SaveProviderScheduleDayInput;
};


export type MutationSendEmailVerificationCodeArgs = {
  email: Scalars['String']['input'];
};


export type MutationSendMessageArgs = {
  message: Scalars['String']['input'];
  orderRealtimeId: Scalars['Int']['input'];
};


export type MutationSetGuestPasswordArgs = {
  newPassword: Scalars['String']['input'];
};


export type MutationSetMyRealtimeAvailabilityArgs = {
  active: Scalars['Boolean']['input'];
  lat?: InputMaybe<Scalars['Float']['input']>;
  lng?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationStartRealtimeOrderArgs = {
  orderRealtimeId: Scalars['Int']['input'];
};


export type MutationUpdateBankArgs = {
  input: BankAccountInput;
  providerId: Scalars['Int']['input'];
};


export type MutationUpdateCategoryProductArgs = {
  input: UpdateCategoryProductInput;
};


export type MutationUpdateCertificateArgs = {
  input: UpdateCertificateInput;
};


export type MutationUpdateCouponArgs = {
  couponId: Scalars['Int']['input'];
  input: UpdateCouponInput;
};


export type MutationUpdateIdentityArgs = {
  input: IdentityInput;
};


export type MutationUpdateIdentityStatusArgs = {
  id: Scalars['Int']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  status: Scalars['String']['input'];
};


export type MutationUpdateImageMarketingArgs = {
  id: Scalars['Int']['input'];
  input: UpdateImageMarketingInput;
};


export type MutationUpdateImageTransitionArgs = {
  input: UpdateImageTransitionInput;
};


export type MutationUpdateJobArgs = {
  input: UpdateJobInput;
};


export type MutationUpdateMyBankAccountArgs = {
  input: UpdateBankUserInput;
};


export type MutationUpdateOrderAdArgs = {
  categoryId?: InputMaybe<Scalars['Int']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  favicon?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  image?: InputMaybe<Scalars['String']['input']>;
  info?: InputMaybe<Scalars['String']['input']>;
  link?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationUpdateOrderJobStatusArgs = {
  orderId: Scalars['Int']['input'];
  status: OrderStatus;
};


export type MutationUpdateOrderProductShippingArgs = {
  input: UpdateShippingInput;
};


export type MutationUpdateOrderProductStatusArgs = {
  orderId: Scalars['Int']['input'];
  status: OrderStatus;
};


export type MutationUpdateOrderServiceStatusArgs = {
  orderId: Scalars['Int']['input'];
  status: OrderStatus;
};


export type MutationUpdateProductArgs = {
  input: UpdateProductInput;
};


export type MutationUpdateProductStockArgs = {
  id: Scalars['Int']['input'];
  quantity: Scalars['Int']['input'];
};


export type MutationUpdateProviderArgs = {
  id: Scalars['Int']['input'];
  input: UpdateProviderInput;
};


export type MutationUpdateProviderLocationArgs = {
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
  timestamp?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationUpdateProviderPortfolioItemArgs = {
  input: UpdateProviderPortfolioInput;
};


export type MutationUpdateRealtimeOrderLocationArgs = {
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
  orderRealtimeId: Scalars['Int']['input'];
  timestamp?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationUpdateRealtimeQuoteArgs = {
  orderRealtimeId: Scalars['Int']['input'];
  quotedHours: Scalars['Int']['input'];
  quotedPrice: Scalars['Int']['input'];
  quotedTransport: Scalars['Int']['input'];
};


export type MutationUpdateServiceArgs = {
  id: Scalars['Int']['input'];
  input: UpdateServiceInput;
};


export type MutationUpdateUserArgs = {
  input: UpdateUserInput;
};


export type MutationValidateSubscriptionPaymentArgs = {
  subscriptionId: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

export type Order = {
  __typename?: 'Order';
  /** Cliente que realizó la orden */
  client: User;
  clientAddress?: Maybe<Scalars['String']['output']>;
  clientId: Scalars['Int']['output'];
  clientLat?: Maybe<Scalars['Float']['output']>;
  clientLng?: Maybe<Scalars['Float']['output']>;
  clientPlaceId?: Maybe<Scalars['String']['output']>;
  commission: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  payment?: Maybe<Payment>;
  requestRespondedAt?: Maybe<Scalars['DateTime']['output']>;
  requestStatus: Scalars['String']['output'];
  review?: Maybe<ProviderReview>;
  scheduleCancelledAt?: Maybe<Scalars['DateTime']['output']>;
  scheduleConfirmedAt?: Maybe<Scalars['DateTime']['output']>;
  scheduleStatus: ScheduleStatus;
  scheduledAt?: Maybe<Scalars['DateTime']['output']>;
  /** Servicio específico contratado */
  serviceProvider?: Maybe<ServiceProvider>;
  serviceProviderId?: Maybe<Scalars['Int']['output']>;
  status: OrderStatus;
  total: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
  wcOrderId?: Maybe<Scalars['Int']['output']>;
  wcOrderKey?: Maybe<Scalars['String']['output']>;
};

export type OrderAds = {
  __typename?: 'OrderAds';
  ads?: Maybe<Ads>;
  adsId?: Maybe<Scalars['Int']['output']>;
  category?: Maybe<Category>;
  categoryId?: Maybe<Scalars['Int']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  days: Scalars['Int']['output'];
  favicon?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  /** @deprecated Usar imageRelation.cdnUrl */
  image: Scalars['String']['output'];
  imageRelation?: Maybe<Image>;
  info: Scalars['String']['output'];
  link: Scalars['String']['output'];
  payment?: Maybe<PaymentAd>;
  service?: Maybe<Service>;
  serviceId?: Maybe<Scalars['Int']['output']>;
  status: OrderStatus;
  total: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['Int']['output']>;
};

export type OrderJob = {
  __typename?: 'OrderJob';
  /** Cliente que contrata el trabajo */
  client: User;
  clientId: Scalars['Int']['output'];
  /** Comisión retenida por la plataforma (10%) */
  commission?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  /** Trabajo específico contratado */
  job: Job;
  jobId: Scalars['Int']['output'];
  /** Información del pago asociado */
  payment?: Maybe<PaymentJob>;
  status: OrderStatus;
  total?: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  /** Trabajador asignado */
  worker?: Maybe<User>;
  workerId?: Maybe<Scalars['Int']['output']>;
};

export type OrderProduct = {
  __typename?: 'OrderProduct';
  /** Cliente que realizó la compra */
  client: User;
  clientId: Scalars['Int']['output'];
  commission: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  /** Información del pago asociado */
  payment?: Maybe<PaymentProduct>;
  /** Producto físico adquirido */
  product: Product;
  productId: Scalars['Int']['output'];
  quantity: Scalars['Int']['output'];
  /** Usuario que vende el producto */
  seller: User;
  sellerId: Scalars['Int']['output'];
  /** Empresa de transporte encargada del envío */
  shippingCompany?: Maybe<Scalars['String']['output']>;
  /** Información de despacho asociada */
  shippingInfo?: Maybe<ShippingInfo>;
  status: OrderStatus;
  total: Scalars['Float']['output'];
  /** Código de seguimiento del paquete */
  trackingCode?: Maybe<Scalars['String']['output']>;
  unitPrice: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type OrderRealTime = {
  __typename?: 'OrderRealTime';
  client: User;
  clientAddress?: Maybe<Scalars['String']['output']>;
  clientDescription?: Maybe<Scalars['String']['output']>;
  clientId: Scalars['Int']['output'];
  clientLat: Scalars['Float']['output'];
  clientLng: Scalars['Float']['output'];
  clientPlaceId?: Maybe<Scalars['String']['output']>;
  commission?: Maybe<Scalars['Int']['output']>;
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  counterOfferHours?: Maybe<Scalars['Int']['output']>;
  counterOfferPrice?: Maybe<Scalars['Int']['output']>;
  counterOfferTransport?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['Int']['output'];
  payment?: Maybe<PaymentRealTime>;
  paymentExpiresAt?: Maybe<Scalars['DateTime']['output']>;
  provider: Provider;
  providerAddress?: Maybe<Scalars['String']['output']>;
  providerId: Scalars['Int']['output'];
  providerLat?: Maybe<Scalars['Float']['output']>;
  providerLng?: Maybe<Scalars['Float']['output']>;
  quotedHours?: Maybe<Scalars['Int']['output']>;
  quotedPrice?: Maybe<Scalars['Int']['output']>;
  quotedTransport?: Maybe<Scalars['Int']['output']>;
  respondedAt?: Maybe<Scalars['DateTime']['output']>;
  serviceProvider: ServiceProvider;
  serviceProviderId: Scalars['Int']['output'];
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  status: RealtimeOrderStatus;
  updatedAt: Scalars['DateTime']['output'];
};

/** Estado de una orden */
export enum OrderStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Success = 'SUCCESS'
}

export type OrdersObject = {
  __typename?: 'OrdersObject';
  jobs?: Maybe<Array<OrderJob>>;
  products?: Maybe<Array<OrderProduct>>;
  services?: Maybe<Array<Order>>;
};

export type PayableItem = {
  __typename?: 'PayableItem';
  accountNumber?: Maybe<Scalars['String']['output']>;
  amount?: Maybe<Scalars['Int']['output']>;
  bankName?: Maybe<Scalars['String']['output']>;
  commision?: Maybe<Scalars['Int']['output']>;
  date: Scalars['DateTime']['output'];
  detail: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  total?: Maybe<Scalars['Int']['output']>;
  type: Scalars['String']['output'];
  user: User;
};

export type Payment = {
  __typename?: 'Payment';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  /** Orden asociada a este pago */
  order: Order;
  orderId: Scalars['Int']['output'];
  provider: PaymentProvider;
  status: PaymentStatus;
  transactionId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type PaymentAd = {
  __typename?: 'PaymentAd';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  orderAd: OrderAds;
  orderAdId: Scalars['Int']['output'];
  provider?: Maybe<PaymentProvider>;
  status: PaymentStatus;
  transactionId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export enum PaymentEntryType {
  Ad = 'AD',
  Job = 'JOB',
  Product = 'PRODUCT',
  Realtime = 'REALTIME',
  ServiceClient = 'SERVICE_CLIENT',
  SubscriptionMarketplace = 'SUBSCRIPTION_MARKETPLACE',
  SubscriptionProvider = 'SUBSCRIPTION_PROVIDER'
}

export type PaymentHistoryEntry = {
  __typename?: 'PaymentHistoryEntry';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  details?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  orderId?: Maybe<Scalars['Int']['output']>;
  status: PaymentStatus;
  transactionId?: Maybe<Scalars['String']['output']>;
  type: PaymentEntryType;
};

export type PaymentHistoryResponse = {
  __typename?: 'PaymentHistoryResponse';
  payments: Array<PaymentHistoryEntry>;
  totalSpent: Scalars['Float']['output'];
};

export type PaymentJob = {
  __typename?: 'PaymentJob';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  orderJob?: Maybe<OrderJob>;
  orderJobId?: Maybe<Scalars['Int']['output']>;
  provider: PaymentProvider;
  status: PaymentStatus;
  transactionId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type PaymentPlan = {
  __typename?: 'PaymentPlan';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  orderId?: Maybe<Scalars['Int']['output']>;
  planOrderId?: Maybe<Scalars['Int']['output']>;
  status: PaymentStatus;
  transactionId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type PaymentProduct = {
  __typename?: 'PaymentProduct';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  orderProduct: OrderProduct;
  orderProductId: Scalars['Int']['output'];
  provider: PaymentProvider;
  status: PaymentStatus;
  transactionId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export enum PaymentProvider {
  Flow = 'FLOW',
  Mercadopago = 'MERCADOPAGO',
  Webpay = 'WEBPAY'
}

export type PaymentRealTime = {
  __typename?: 'PaymentRealTime';
  amount: Scalars['Float']['output'];
  id: Scalars['Int']['output'];
};

export enum PaymentStatus {
  Confirmed = 'CONFIRMED',
  Failed = 'FAILED',
  Initiated = 'INITIATED'
}

export type PayoutItemInput = {
  id: Scalars['Int']['input'];
  type: Scalars['String']['input'];
};

export enum PlanInterval {
  Monthly = 'MONTHLY',
  Yearly = 'YEARLY'
}

export type PlanOrder = {
  __typename?: 'PlanOrder';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  interval?: Maybe<PlanInterval>;
  payment?: Maybe<PaymentPlan>;
  plan: ProviderPlan;
  planActive: Scalars['Boolean']['output'];
  planEndsAt?: Maybe<Scalars['DateTime']['output']>;
  status: OrderStatus;
  subscriptionFlowId?: Maybe<Scalars['String']['output']>;
  total: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['Int']['output'];
};

export type PlanResponse = {
  __typename?: 'PlanResponse';
  externalSubscriptionId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  planEndsAt?: Maybe<Scalars['DateTime']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Representa una orden de suscripción de un usuario del marketplace */
export type PlanUserOrder = {
  __typename?: 'PlanUserOrder';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  interval: PlanInterval;
  plan: UserPlan;
  planActive: Scalars['Boolean']['output'];
  planEndsAt?: Maybe<Scalars['DateTime']['output']>;
  status: OrderStatus;
  subscriptionFlowId?: Maybe<Scalars['String']['output']>;
  total: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['Int']['output'];
};

export type Product = {
  __typename?: 'Product';
  categoryProduct?: Maybe<CategoryProduct>;
  categoryProductId: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  deliveryCondition?: Maybe<ConditionDelivery>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  images?: Maybe<Array<Maybe<ProductImage>>>;
  location?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  shippingDisabled: Scalars['Boolean']['output'];
  slug: Scalars['String']['output'];
  stock: Scalars['Int']['output'];
  subCategorySlug?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['Int']['output'];
};

export type ProductImage = {
  __typename?: 'ProductImage';
  id: Scalars['Int']['output'];
  image?: Maybe<Image>;
  productId: Scalars['Int']['output'];
  /** @deprecated Usar image.cdnUrl */
  url: Scalars['String']['output'];
};

export type Provider = {
  __typename?: 'Provider';
  activeRealtimeOrder?: Maybe<OrderRealTime>;
  bank?: Maybe<BankAccount>;
  bio?: Maybe<Scalars['String']['output']>;
  certificates?: Maybe<Array<Maybe<ProviderCertificate>>>;
  completedOrdersCount?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  hasSchedule?: Maybe<Scalars['Boolean']['output']>;
  hobbys?: Maybe<Array<Maybe<Hobby>>>;
  id: Scalars['Int']['output'];
  isRealtimeActive?: Maybe<Scalars['Boolean']['output']>;
  lat?: Maybe<Scalars['Float']['output']>;
  lng?: Maybe<Scalars['Float']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  logoImage?: Maybe<Image>;
  /** @deprecated Usar logoImage.cdnUrl */
  logoUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  portfolio?: Maybe<Array<Maybe<ProviderPortfolio>>>;
  priority: Scalars['Int']['output'];
  realtimeReviews?: Maybe<Array<Maybe<RealtimeProviderReview>>>;
  reviews?: Maybe<Array<Maybe<ProviderReview>>>;
  rut?: Maybe<Scalars['String']['output']>;
  schedules?: Maybe<Array<Maybe<ProviderSchedule>>>;
  services?: Maybe<Array<Maybe<ServiceProvider>>>;
  slug: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['Int']['output'];
  wcCategoryId?: Maybe<Scalars['Int']['output']>;
};

export type ProviderCertificate = {
  __typename?: 'ProviderCertificate';
  createdAt: Scalars['DateTime']['output'];
  fileImage?: Maybe<Image>;
  /** @deprecated Usar fileImage.cdnUrl */
  fileUrl: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  institution?: Maybe<Scalars['String']['output']>;
  providerId: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  verified: Scalars['Boolean']['output'];
  year?: Maybe<Scalars['Int']['output']>;
};

export type ProviderDailyAvailability = {
  __typename?: 'ProviderDailyAvailability';
  availableSlots: Array<Scalars['String']['output']>;
  date: Scalars['String']['output'];
  occupiedSlots: Array<Scalars['String']['output']>;
  slots: Array<Scalars['String']['output']>;
};

/** Planes disponibles para los proveedores: FREE, PREMIUM, FULL */
export enum ProviderPlan {
  Free = 'FREE',
  TratofacilSrvPremium = 'TRATOFACIL_SRV_PREMIUM',
  TratofacilSrvPro = 'TRATOFACIL_SRV_PRO'
}

export type ProviderPortfolio = {
  __typename?: 'ProviderPortfolio';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  image?: Maybe<Image>;
  imageUrl: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  providerId: Scalars['Int']['output'];
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ProviderReview = {
  __typename?: 'ProviderReview';
  client: User;
  clientId: Scalars['Int']['output'];
  comment?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  order?: Maybe<Order>;
  orderId?: Maybe<Scalars['Int']['output']>;
  providerId: Scalars['Int']['output'];
  rating: Scalars['Int']['output'];
};

export type ProviderSchedule = {
  __typename?: 'ProviderSchedule';
  createdAt: Scalars['DateTime']['output'];
  dayOfWeek: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  providerId: Scalars['Int']['output'];
  slots?: Maybe<Array<Maybe<ProviderScheduleSlot>>>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ProviderScheduleSlot = {
  __typename?: 'ProviderScheduleSlot';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  providerScheduleId: Scalars['Int']['output'];
  time: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Listado de todas las categorías */
  adminCategories: Array<Category>;
  adminGetPayableItems: Array<PayableItem>;
  adminGetWithdrawals: Array<Withdrawal>;
  adminJobReviews: Array<ReviewsJob>;
  adminJobs: Array<Job>;
  adminOrderJobs: Array<OrderJob>;
  /** Listado maestro de todas las órdenes del sistema */
  adminOrders: Array<Order>;
  /** Moderación de todas las reseñas */
  adminOrdersProduct: Array<OrderProduct>;
  /** Obtener todos los proveedores con sus detalles */
  adminProviders: Array<Provider>;
  /** Moderación de todas las reseñas */
  adminReviews: Array<ProviderReview>;
  adminSalesByCity: Array<SalesByCityOutput>;
  /** Listado de servicios base disponibles */
  adminServices: Array<Service>;
  adminUserIdentities: Array<UserIdentity>;
  /** Obtener todos los usuarios (Clientes y Admins) */
  adminUsers: Array<User>;
  categories: Array<Category>;
  categoriesProducts: Array<CategoryProduct>;
  category: Category;
  categoryBySlug?: Maybe<Category>;
  categoryProduct: CategoryProduct;
  /** Valida si el correo ya tiene cuenta y si tiene contraseña */
  checkLoginEmailExists: LoginEmailCheckResult;
  coupons: Array<Coupon>;
  findAllCategory: Array<CategoryProduct>;
  getAdminAds: Array<Ads>;
  getAds: AdsWithMarketing;
  getAllImageTransition: Array<ImageMarketingDurationType>;
  getCertificateById: ProviderCertificate;
  getCertificates: Array<ProviderCertificate>;
  getImageTransitionById: ImageMarketingDurationType;
  getMyAds: Array<Ads>;
  getMyCertificates: Array<ProviderCertificate>;
  getMySales: Array<OrderProduct>;
  getMyServiceSales: Array<Order>;
  getOrderJobsByProvider: Array<OrderJob>;
  /** Retorna las órdenes recibidas por el trabajador actual */
  getOrderJobsByWorker: Array<OrderJob>;
  getProviderRegistrationStatus: RegistrationStatus;
  getServicesProvider: Array<Service>;
  hobbies: Array<Hobby>;
  hobbiesByProvider: Array<Hobby>;
  hobby: Hobby;
  imageMarketingsGrouped: ImageMarketingGrouped;
  imageMarketingsHero: Array<ImageMarketing>;
  imageMarketingsHorizontal: Array<ImageMarketing>;
  imageMarketingsVertical: Array<ImageMarketing>;
  job: Job;
  jobApplications: Array<JobApplication>;
  jobs: Array<Job>;
  kycStatus: Scalars['Boolean']['output'];
  mainCategories: Array<Category>;
  mainCategoryProducts: Array<CategoryProduct>;
  me: User;
  messages: Array<ChatMessageEntity>;
  myApplications: Array<JobApplication>;
  myJobs: Array<Job>;
  myOffers: Array<Job>;
  myOrders: OrdersObject;
  myPaymentHistory: PaymentHistoryResponse;
  myPortfolio: Array<ProviderPortfolio>;
  myProviderPlan?: Maybe<PlanOrder>;
  myProviderSchedules: Array<ProviderSchedule>;
  myRealtimeOrdersAsClient: Array<OrderRealTime>;
  myRealtimeOrdersAsProvider: Array<OrderRealTime>;
  myServices: Array<Service>;
  myWallet: Wallet;
  ordersProductsBySeller: Array<OrderProduct>;
  product: Product;
  productBySlug: Product;
  products: Array<Product>;
  productsByCategory: Array<Product>;
  productsByUser: Array<Product>;
  provider?: Maybe<Provider>;
  providerDailyAvailability: ProviderDailyAvailability;
  providerPortfolio: Array<ProviderPortfolio>;
  providers: Array<Provider>;
  publicProfile?: Maybe<User>;
  serviceDetail: ServiceDetail;
  servicesByCategory: Array<Service>;
  shippingInfoByOrderProduct?: Maybe<ShippingInfo>;
  subCategories: Array<Category>;
  subCategoryProducts: Array<CategoryProduct>;
  user?: Maybe<User>;
  users: Array<User>;
};


export type QueryCategoriesProductsArgs = {
  city?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCategoryArgs = {
  id: Scalars['Int']['input'];
};


export type QueryCategoryBySlugArgs = {
  slug: Scalars['String']['input'];
};


export type QueryCategoryProductArgs = {
  id: Scalars['Int']['input'];
};


export type QueryCheckLoginEmailExistsArgs = {
  email: Scalars['String']['input'];
};


export type QueryGetAdminAdsArgs = {
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetAdsArgs = {
  city?: InputMaybe<Scalars['String']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetCertificateByIdArgs = {
  id: Scalars['Int']['input'];
};


export type QueryGetCertificatesArgs = {
  sortOrder?: InputMaybe<Scalars['String']['input']>;
  verified?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryGetImageTransitionByIdArgs = {
  id: Scalars['Int']['input'];
};


export type QueryGetMyServiceSalesArgs = {
  providerId: Scalars['Int']['input'];
};


export type QueryGetServicesProviderArgs = {
  providerId: Scalars['Int']['input'];
};


export type QueryHobbiesByProviderArgs = {
  providerId: Scalars['Int']['input'];
};


export type QueryHobbyArgs = {
  id: Scalars['Int']['input'];
};


export type QueryJobArgs = {
  id: Scalars['Int']['input'];
};


export type QueryJobApplicationsArgs = {
  jobId: Scalars['Int']['input'];
};


export type QueryJobsArgs = {
  city?: InputMaybe<Scalars['String']['input']>;
  skip: Scalars['Int']['input'];
  take: Scalars['Int']['input'];
};


export type QueryKycStatusArgs = {
  session: Scalars['String']['input'];
};


export type QueryMessagesArgs = {
  orderRealtimeId: Scalars['Int']['input'];
};


export type QueryProductArgs = {
  id: Scalars['Int']['input'];
};


export type QueryProductBySlugArgs = {
  slug: Scalars['String']['input'];
};


export type QueryProductsByCategoryArgs = {
  categoryProductId: Scalars['Int']['input'];
};


export type QueryProductsByUserArgs = {
  userId: Scalars['Int']['input'];
};


export type QueryProviderArgs = {
  id: Scalars['Int']['input'];
};


export type QueryProviderDailyAvailabilityArgs = {
  date: Scalars['String']['input'];
  providerId: Scalars['Int']['input'];
};


export type QueryProviderPortfolioArgs = {
  providerId: Scalars['Int']['input'];
};


export type QueryPublicProfileArgs = {
  userId: Scalars['Int']['input'];
};


export type QueryServiceDetailArgs = {
  providerId: Scalars['Int']['input'];
  serviceId: Scalars['Int']['input'];
};


export type QueryServicesByCategoryArgs = {
  categorySlug: Scalars['String']['input'];
  city?: InputMaybe<Scalars['String']['input']>;
  includeProvidersOnly?: InputMaybe<Scalars['Boolean']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subCategorySlug?: InputMaybe<Scalars['String']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryShippingInfoByOrderProductArgs = {
  orderProductId: Scalars['Int']['input'];
};


export type QueryUserArgs = {
  id: Scalars['Int']['input'];
};

/** Estado de solicitudes en tiempo real desde /find */
export enum RealtimeOrderStatus {
  Accepted = 'ACCEPTED',
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Expired = 'EXPIRED',
  InProgress = 'IN_PROGRESS',
  PaymentPending = 'PAYMENT_PENDING',
  Pending = 'PENDING',
  Quoted = 'QUOTED',
  Rejected = 'REJECTED'
}

export type RealtimePaymentInitResponse = {
  __typename?: 'RealtimePaymentInitResponse';
  paymentExpiresAt: Scalars['DateTime']['output'];
  token: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type RealtimeProviderReview = {
  __typename?: 'RealtimeProviderReview';
  client?: Maybe<User>;
  clientId: Scalars['Int']['output'];
  comment?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  orderRealtimeId: Scalars['Int']['output'];
  providerId: Scalars['Int']['output'];
  rating: Scalars['Int']['output'];
};

export type RegisterCardForPlanResponse = {
  __typename?: 'RegisterCardForPlanResponse';
  alreadyRegistered: Scalars['Boolean']['output'];
  customerId?: Maybe<Scalars['String']['output']>;
  orderId?: Maybe<Scalars['Int']['output']>;
  orderType?: Maybe<Scalars['String']['output']>;
  token?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type RegisterUserInput = {
  birthday?: InputMaybe<Scalars['DateTime']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  phone?: InputMaybe<Scalars['String']['input']>;
  role?: Role;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type RegistrationStatus = {
  __typename?: 'RegistrationStatus';
  bankCreated: Scalars['Boolean']['output'];
  emailVerified: Scalars['Boolean']['output'];
  hasUser: Scalars['Boolean']['output'];
  identityCompleted: Scalars['Boolean']['output'];
  kycVerified: Scalars['Boolean']['output'];
};

export type ReviewsJob = {
  __typename?: 'ReviewsJob';
  /** Cliente que califica */
  client: User;
  clientId: Scalars['Int']['output'];
  comment?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  job: Job;
  jobId: Scalars['Int']['output'];
  rating: Scalars['Int']['output'];
  /** Trabajador (User) que recibe la reseña */
  worker: User;
  workerId: Scalars['Int']['output'];
};

export type ReviewsProduct = {
  __typename?: 'ReviewsProduct';
  comment?: Maybe<Scalars['String']['output']>;
  orderId: Scalars['Int']['output'];
  rating: Scalars['Int']['output'];
};

/** Roles de usuario permitidos en la aplicación */
export enum Role {
  Admin = 'ADMIN',
  CityAdmin = 'CITY_ADMIN',
  Client = 'CLIENT',
  Provider = 'PROVIDER'
}

export type SalesByCityOutput = {
  __typename?: 'SalesByCityOutput';
  city: Scalars['String']['output'];
  orders: OrdersObject;
  totalAmount: Scalars['Float']['output'];
  totalSales: Scalars['Int']['output'];
  type: Scalars['String']['output'];
};

export type SaveProviderScheduleDayInput = {
  dayOfWeek: Scalars['Int']['input'];
  slots: Array<Scalars['String']['input']>;
};

/** Estado de la hora agendada */
export enum ScheduleStatus {
  Cancelled = 'CANCELLED',
  Confirmed = 'CONFIRMED',
  Scheduled = 'SCHEDULED'
}

export type Service = {
  __typename?: 'Service';
  category?: Maybe<Category>;
  categoryId?: Maybe<Scalars['Int']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  image?: Maybe<Image>;
  /** @deprecated Usar image.cdnUrl */
  imageUrl?: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  serviceProviders?: Maybe<Array<Maybe<ServiceProvider>>>;
  slug: Scalars['String']['output'];
};

export type ServiceDetail = {
  __typename?: 'ServiceDetail';
  category?: Maybe<Category>;
  categoryId?: Maybe<Scalars['Int']['output']>;
  commission?: Maybe<Scalars['Float']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  hasHomeVisit?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['Int']['output'];
  image?: Maybe<Image>;
  /** @deprecated Usar image.cdnUrl */
  imageUrl?: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  netAmount?: Maybe<Scalars['Float']['output']>;
  price?: Maybe<Scalars['Float']['output']>;
  provider?: Maybe<Provider>;
  service?: Maybe<Service>;
  serviceProviders?: Maybe<Array<Maybe<ServiceProvider>>>;
  slug: Scalars['String']['output'];
};

export type ServiceProvider = {
  __typename?: 'ServiceProvider';
  cities?: Maybe<Array<ServiceProviderOnCity>>;
  commission?: Maybe<Scalars['Float']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  hasHomeVisit: Scalars['Boolean']['output'];
  id: Scalars['Int']['output'];
  netAmount?: Maybe<Scalars['Float']['output']>;
  orders?: Maybe<Array<Maybe<Order>>>;
  price?: Maybe<Scalars['Float']['output']>;
  provider?: Maybe<Provider>;
  providerId: Scalars['Int']['output'];
  service?: Maybe<Service>;
  serviceId?: Maybe<Scalars['Int']['output']>;
  slug: Scalars['String']['output'];
};

export type ServiceProviderOnCity = {
  __typename?: 'ServiceProviderOnCity';
  city: Scalars['String']['output'];
  serviceProviderId: Scalars['Int']['output'];
};

export type ShippingInfo = {
  __typename?: 'ShippingInfo';
  commune: Scalars['String']['output'];
  dept?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  number: Scalars['String']['output'];
  orderProductId: Scalars['Int']['output'];
  phone: Scalars['String']['output'];
  reference?: Maybe<Scalars['String']['output']>;
  region: Scalars['String']['output'];
  street: Scalars['String']['output'];
};

export enum SubscriptionType {
  Marketplace = 'MARKETPLACE',
  Provider = 'PROVIDER'
}

export type SupportTicket = {
  __typename?: 'SupportTicket';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  userId?: Maybe<Scalars['Int']['output']>;
};

export type UpdateBankUserInput = {
  accountNumber: Scalars['String']['input'];
  accountType: Scalars['String']['input'];
  bankName: Scalars['String']['input'];
  rut?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCategoryProductInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  parentId?: InputMaybe<Scalars['Int']['input']>;
  shippingDisabled?: InputMaybe<Scalars['Boolean']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCertificateInput = {
  fileUrl?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  institution?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  year?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateCouponInput = {
  amount?: InputMaybe<Scalars['Int']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  duration?: InputMaybe<Scalars['Int']['input']>;
  expires?: InputMaybe<Scalars['String']['input']>;
  max_redemptions?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  percent_off?: InputMaybe<Scalars['Int']['input']>;
  scope?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['Int']['input']>;
  times?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateImageMarketingInput = {
  key?: InputMaybe<Scalars['String']['input']>;
  orientation?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateImageTransitionInput = {
  duration?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['Int']['input'];
  orientation?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateJobInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProductInput = {
  basePrice?: InputMaybe<Scalars['Float']['input']>;
  categoryProductId?: InputMaybe<Scalars['Int']['input']>;
  conditions?: InputMaybe<ConditionDeliveryInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  imageUrls?: InputMaybe<Array<Scalars['String']['input']>>;
  location?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  shippingDisabled?: InputMaybe<Scalars['Boolean']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  stock?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateProviderInput = {
  bank?: InputMaybe<BankAccountInput>;
  bio?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  lat?: InputMaybe<Scalars['Float']['input']>;
  lng?: InputMaybe<Scalars['Float']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  rut?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProviderPortfolioInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateServiceInput = {
  categoryId?: InputMaybe<Scalars['Int']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  hasHomeVisit?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateShippingInput = {
  orderId: Scalars['Int']['input'];
  shippingCompany?: InputMaybe<Scalars['String']['input']>;
  trackingCode?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  birthday?: InputMaybe<Scalars['DateTime']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  nicename?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  activationKey: Scalars['String']['output'];
  activeRealtimeOrder?: Maybe<OrderRealTime>;
  ads?: Maybe<Array<Maybe<OrderAds>>>;
  applications?: Maybe<Array<Maybe<JobApplication>>>;
  bankAccount?: Maybe<BankAccountUser>;
  birthday?: Maybe<Scalars['DateTime']['output']>;
  cardActive?: Maybe<Scalars['Boolean']['output']>;
  chatMessages?: Maybe<Array<Maybe<ChatMessageEntity>>>;
  clientReviewsReceived?: Maybe<Array<Maybe<ClientReview>>>;
  createdAt: Scalars['DateTime']['output'];
  creditCardType?: Maybe<Scalars['String']['output']>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  emailVerified?: Maybe<Scalars['Boolean']['output']>;
  flowCustomerId?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  identitys?: Maybe<Array<Maybe<UserIdentity>>>;
  isGuest?: Maybe<Scalars['Boolean']['output']>;
  isProfileComplete: Scalars['Boolean']['output'];
  isProfileFullyComplete: Scalars['Boolean']['output'];
  jobOrders?: Maybe<Array<Maybe<OrderJob>>>;
  jobReviewsGiven?: Maybe<Array<Maybe<ReviewsJob>>>;
  jobReviewsReceived?: Maybe<Array<Maybe<ReviewsJob>>>;
  jobs?: Maybe<Array<Maybe<Job>>>;
  kycStatus?: Maybe<Scalars['Boolean']['output']>;
  last4CardDigits?: Maybe<Scalars['String']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  marketplacePlanOrders?: Maybe<Array<Maybe<PlanUserOrder>>>;
  nicename: Scalars['String']['output'];
  orders?: Maybe<Array<Maybe<Order>>>;
  phone: Scalars['String']['output'];
  planOrders?: Maybe<Array<Maybe<PlanOrder>>>;
  productOrders?: Maybe<Array<Maybe<OrderProduct>>>;
  productReviewsGiven?: Maybe<Array<Maybe<ReviewsProduct>>>;
  productReviewsReceived?: Maybe<Array<Maybe<ReviewsProduct>>>;
  productSales?: Maybe<Array<Maybe<OrderProduct>>>;
  products?: Maybe<Array<Maybe<Product>>>;
  provider?: Maybe<Provider>;
  realtimeOrdersAsClient?: Maybe<Array<Maybe<OrderRealTime>>>;
  realtimeProviderReviews?: Maybe<Array<Maybe<RealtimeProviderReview>>>;
  registered: Scalars['DateTime']['output'];
  reviewsGiven?: Maybe<Array<Maybe<ProviderReview>>>;
  reviewsReceived?: Maybe<Array<Maybe<ClientReview>>>;
  role: Role;
  status: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  url: Scalars['String']['output'];
  username: Scalars['String']['output'];
  wallet?: Maybe<Wallet>;
  withdrawals?: Maybe<Array<Maybe<Withdrawal>>>;
  workerJobOrders?: Maybe<Array<Maybe<OrderJob>>>;
};

export type UserIdentity = {
  __typename?: 'UserIdentity';
  createdAt: Scalars['DateTime']['output'];
  /** @deprecated Usar dniFrontImage.cdnUrl */
  dniFront?: Maybe<Scalars['String']['output']>;
  dniFrontImage?: Maybe<Image>;
  id: Scalars['Int']['output'];
  /** @deprecated Usar selfieImage.cdnUrl */
  selfie?: Maybe<Scalars['String']['output']>;
  selfieImage?: Maybe<Image>;
  status: IdentityStatus;
  updatedAt: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['Int']['output'];
};

/** Planes disponibles para los usuarios */
export enum UserPlan {
  Free = 'FREE',
  TratofacilPubBusiness = 'TRATOFACIL_PUB_BUSINESS',
  TratofacilPubFull = 'TRATOFACIL_PUB_FULL',
  TratofacilPubInitial = 'TRATOFACIL_PUB_INITIAL',
  TratofacilPubPro = 'TRATOFACIL_PUB_PRO'
}

export type Wallet = {
  __typename?: 'Wallet';
  balance: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  transactions: Array<WalletTransaction>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['Int']['output'];
};

export type WalletTransaction = {
  __typename?: 'WalletTransaction';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  orderId?: Maybe<Scalars['Int']['output']>;
  orderJobId?: Maybe<Scalars['Int']['output']>;
  orderProductId?: Maybe<Scalars['Int']['output']>;
  orderRealtimeId?: Maybe<Scalars['Int']['output']>;
  type: Scalars['String']['output'];
  walletId: Scalars['Int']['output'];
  withdrawalId?: Maybe<Scalars['Int']['output']>;
};

export type WebpayResponse = {
  __typename?: 'WebpayResponse';
  token: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type Withdrawal = {
  __typename?: 'Withdrawal';
  accountNumber?: Maybe<Scalars['String']['output']>;
  accountType?: Maybe<Scalars['String']['output']>;
  amount: Scalars['Float']['output'];
  bankName: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  rut: Scalars['String']['output'];
  status: Scalars['String']['output'];
  user: User;
};

export type WithdrawalResult = {
  __typename?: 'WithdrawalResult';
  accountNumber: Scalars['String']['output'];
  accountType: Scalars['String']['output'];
  amount: Scalars['Float']['output'];
  bankName: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  rut: Scalars['String']['output'];
  status: WithdrawalStatus;
  userId: Scalars['Int']['output'];
};

export enum WithdrawalStatus {
  Approved = 'APPROVED',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Processed = 'PROCESSED',
  Rejected = 'REJECTED'
}
