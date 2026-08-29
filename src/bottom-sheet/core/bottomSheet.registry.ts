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
    collapsedHeight: 88,
    snapPoints: [88],
    initialIndex: 1,
    enableDynamicSizing: true,
    contentMode: 'view',
    replaceFrom: ['provider_preview'],
    replaceSameKey: true,
  },
  provider_preview: {
    content: ProviderPreviewPanelContent,
    requiresMapFlow: true,
    allowedRoles: ['client', 'guest'],
    collapsedHeight: 180,
    snapPoints: undefined,
    initialIndex: 0,
    enableDynamicSizing: true,
    contentMode: 'view',
    replaceFrom: ['categories'],
    replaceSameKey: true,
  },
  focus_client: {
    content: FocusClientPanelContent,
    requiresMapFlow: true,
    allowedRoles: ['client', 'guest'],
    collapsedHeight: 156,
    snapPoints: [156],
    initialIndex: 1,
    enableDynamicSizing: true,
    contentMode: 'scroll',
    replaceSameKey: true,
  },
  focus_provider: {
    content: FocusProviderPanelContent,
    requiresMapFlow: true,
    allowedRoles: ['provider'],
    collapsedHeight: 156,
    snapPoints: [156],
    initialIndex: 1,
    enableDynamicSizing: true,
    contentMode: 'scroll',
    replaceSameKey: true,
  },
  provider_dashboard: {
    content: ProviderPanelContent,
    requiresMapFlow: true,
    allowedRoles: ['provider'],
    collapsedHeight: 104,
    snapPoints: [104],
    initialIndex: 1,
    enableDynamicSizing: true,
    contentMode: 'view',
    replaceSameKey: true,
  },
};

export function isSheetAllowedForRole(key: SheetKey, role: AppRole): boolean {
  return registry[key].allowedRoles.includes(role);
}
