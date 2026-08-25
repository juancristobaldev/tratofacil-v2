import { CategoriesPanelContent } from '../../components/panels/CategoriesPanelContent';
import { ProviderPreviewPanelContent } from '../../components/panels/ProviderPreviewPanelContent';
import { FocusClientPanelContent } from '../../components/panels/FocusClientPanelContent';
import { FocusProviderPanelContent } from '../../components/panels/FocusProviderPanelContent';
import { ProviderPanelContent } from '../../components/panels/ProviderPanelContent';
import type { SheetKey, SheetRegistry } from './bottomSheet.types';
import type { AppRole } from '../../types/graphql';

export const registry: SheetRegistry = {
  categories: {
    content: CategoriesPanelContent,
    requiresMapFlow: true,
    allowedRoles: ['client', 'guest'],
    collapsedHeight: 84,
    snapPoints: [84, 'MAX'],
    initialIndex: 1,
    enableDynamicSizing: true,
    replaceFrom: ['provider_preview'],
    replaceSameKey: true,
  },
  provider_preview: {
    content: ProviderPreviewPanelContent,
    requiresMapFlow: true,
    allowedRoles: ['client', 'guest'],
    collapsedHeight: 110,
    snapPoints: [110, 'MAX'],
    initialIndex: 1,
    enableDynamicSizing: true,
    replaceFrom: ['categories'],
    replaceSameKey: true,
  },
  focus_client: {
    content: FocusClientPanelContent,
    requiresMapFlow: true,
    allowedRoles: ['client', 'guest'],
    collapsedHeight: 88,
    snapPoints: [88, 'MAX'],
    initialIndex: 1,
    enableDynamicSizing: true,
    replaceSameKey: true,
  },
  focus_provider: {
    content: FocusProviderPanelContent,
    requiresMapFlow: true,
    allowedRoles: ['provider'],
    collapsedHeight: 88,
    snapPoints: [88, 'MAX'],
    initialIndex: 1,
    enableDynamicSizing: true,
    replaceSameKey: true,
  },
  provider_dashboard: {
    content: ProviderPanelContent,
    requiresMapFlow: true,
    allowedRoles: ['provider'],
    collapsedHeight: 84,
    snapPoints: [84, 'MAX'],
    initialIndex: 1,
    enableDynamicSizing: true,
    replaceSameKey: true,
  },
};

export function isSheetAllowedForRole(key: SheetKey, role: AppRole): boolean {
  return registry[key].allowedRoles.includes(role);
}
