import type { ComponentType, ElementRef } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { AppRole } from '../../types/graphql';

export type SheetModalRef = ElementRef<typeof BottomSheetModal>;

export type SheetKey =
  | 'categories'
  | 'provider_preview'
  | 'focus_client'
  | 'focus_provider'
  | 'provider_dashboard';

export interface CategoryHit {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  subcategories?: unknown[];
}

export interface ProviderPreviewItem {
  id?: string | number;
  spId?: string | number;
  name?: string;
  providerName?: string;
  avatar?: string | null;
  rating?: number;
  reviewsCount?: number;
  serviceName?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
}

export interface CategoriesPayload {
  categories?: Array<{ id: number; name: string; slug: string }>;
  selectedCategory?: CategoryHit | null;
}

export interface ProviderPreviewPayload {
  providers?: ProviderPreviewItem[];
  provider?: ProviderPreviewItem;
  selectedIndex?: number;
}

export interface FocusClientPayload {
  orderId: number;
}

export interface FocusProviderPayload {
  orderId: number;
}

export type ProviderDashboardPayload = undefined;

export interface SheetPayloadMap {
  categories: CategoriesPayload;
  provider_preview: ProviderPreviewPayload;
  focus_client: FocusClientPayload;
  focus_provider: FocusProviderPayload;
  provider_dashboard: ProviderDashboardPayload;
}

export interface ProviderDashboardToggleOnlinePayload {
  value: boolean;
}

export interface FocusClientCounterOfferPayload {
  quotedPrice: number;
  quotedHours: number;
  quotedTransport: number;
}

export interface FocusProviderQuotePayload {
  quotedPrice: number;
  quotedHours: number;
  quotedTransport: number;
}

export type BottomSheetActionMap = {
  categories: {
    SELECT_CATEGORY: CategoryHit;
    CLEAR_CATEGORY: undefined;
  };
  provider_preview: {
    INDEX_CHANGE: ProviderPreviewItem;
    VIEW_PROFILE: ProviderPreviewItem;
    DESELECT: undefined;
  };
  provider_dashboard: {
    TOGGLE_ONLINE: ProviderDashboardToggleOnlinePayload;
    OPEN_WALLET: undefined;
    OPEN_PLANS: undefined;
  };
  focus_client: {
    OPEN_CHAT: undefined;
    SEND_COUNTEROFFER: FocusClientCounterOfferPayload;
    PAY_NOW: undefined;
    REJECT_QUOTE: undefined;
    CANCEL_ORDER: undefined;
    CONFIRM_START: undefined;
  };
  focus_provider: {
    SEND_QUOTE: FocusProviderQuotePayload;
    ACCEPT_COUNTEROFFER: undefined;
    REJECT_COUNTEROFFER: undefined;
    REJECT_REQUEST: undefined;
    CANCEL_ORDER: undefined;
    START_WORK: undefined;
    COMPLETE_WORK: undefined;
    OPEN_CHAT: undefined;
    RETURN_PANEL: undefined;
  };
};

export type BottomSheetActionName<K extends SheetKey> = keyof BottomSheetActionMap[K] & string;

export type BottomSheetActionPayload<
  K extends SheetKey,
  A extends BottomSheetActionName<K>,
> = BottomSheetActionMap[K][A];

export type BottomSheetActionHandler<K extends SheetKey, A extends BottomSheetActionName<K>> = (
  payload: BottomSheetActionPayload<K, A>,
  meta: BottomSheetActionMeta<K, A>,
) => void;

export type BottomSheetActionMeta<K extends SheetKey, A extends BottomSheetActionName<K>> = {
  actionId: number;
  key: K;
  action: A;
  owner: RuntimeHandlerOwner | null;
  requestId: number | null;
};

export type RuntimeActionHandlersMap = {
  [K in SheetKey]?: Partial<{
    [A in BottomSheetActionName<K>]: BottomSheetActionHandler<K, A>;
  }>;
};

export type RuntimeHandlersMap = {
  [K in SheetKey]?: Partial<SheetPayloadMap[K]>;
};

export type RuntimeHandlerOwner = {
  ownerId: string;
  generation: number;
};

export type BottomSheetState = 'CLOSED' | 'REQUESTED' | 'PRESENTING' | 'OPEN' | 'SUSPENDING' | 'SUSPENDED' | 'DISMISSING';

export type BottomSheetTransitionOperation = 'PRESENT' | 'REPLACE' | 'DISMISS_THEN_PRESENT';

export type BottomSheetRequest<K extends SheetKey = SheetKey> = {
  requestId: number;
  key: K;
  payload: SheetPayloadMap[K];
};

export type SheetPresentationState = 'collapsed' | 'content' | 'expanded';

export interface SheetComponentProps<K extends SheetKey> {
  sheetKey: K;
  requestId?: number;
  payload: SheetPayloadMap[K];
  dismiss: () => void;
  setIndex: (index: number) => void;
  isCollapsed?: boolean;
  presentationState?: SheetPresentationState;
}

export interface SheetDescriptor<K extends SheetKey> {
  content: ComponentType<SheetComponentProps<K>>;
  requiresMapFlow: boolean;
  allowedRoles: AppRole[];
  snapPoints?: readonly (string | number)[];
  initialIndex?: number;
  collapsedHeight?: number;
  enableDynamicSizing?: boolean;
  maxDynamicContentSize?: number;
  keyboardBehavior?: 'interactive' | 'extend' | 'fillParent';
  keyboardBlurBehavior?: 'none' | 'restore';
  replaceFrom?: readonly SheetKey[];
  replaceSameKey?: boolean;
}

export type SheetRegistry = {
  [K in SheetKey]: SheetDescriptor<K>;
};
