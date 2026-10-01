import React, { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sheet } from '../primitives/Sheet';
import { registry } from './bottomSheet.registry';
import { useBottomSheet } from './useBottomSheet';
import { bottomSheetDebug } from './bottomSheet.debug';
import { resolveSheetInitialIndex, resolveSheetSnapPoints } from './bottomSheetSnapPoints';
import { getBottomSheetGeometry } from './bottomSheetGeometry';
import type {
  BottomSheetRequest,
  BottomSheetTransitionOperation,
  SheetKey,
  SheetModalRef,
} from './bottomSheet.types';

type AnyBottomSheetRequest = BottomSheetRequest<SheetKey>;

interface BottomSheetHostProps {
  request: AnyBottomSheetRequest | null;
  operation: BottomSheetTransitionOperation;
  modalRef: MutableRefObject<SheetModalRef | null>;
  isMapFlowActive: boolean;
  onPresent: (request: AnyBottomSheetRequest) => void;
  onChange: (request: AnyBottomSheetRequest, index: number) => void;
  onDismiss: (request: AnyBottomSheetRequest) => void;
  onContentHeightChange?: (height: number) => void;
}

export const BottomSheetHost: React.FC<BottomSheetHostProps> = ({
  request,
  operation,
  modalRef,
  isMapFlowActive,
  onPresent,
  onChange,
  onDismiss,
  onContentHeightChange,
}) => {
  const { dismiss, setIndex } = useBottomSheet();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const previousRequestId = useRef<number | null>(null);
  const wasMapFlowActive = useRef(false);

  const descriptor = request ? registry[request.key] : null;
  const initialIndex = descriptor?.initialIndex ?? 1;
  const [lastHandledRequestId, setLastHandledRequestId] = React.useState<number | null>(request?.requestId ?? null);
  const [currentIndex, setCurrentIndex] = React.useState<number>(initialIndex);

  if (request && request.requestId !== lastHandledRequestId) {
    setLastHandledRequestId(request.requestId);
    setCurrentIndex(descriptor?.initialIndex ?? 1);
  }

  const effectiveIndex = (request && request.requestId !== lastHandledRequestId)
    ? (descriptor?.initialIndex ?? 1)
    : currentIndex;

  const geometry = useMemo(
    () =>
      getBottomSheetGeometry({
        windowHeight,
        safeTopInset: insets.top,
        safeBottomInset: insets.bottom,
      }),
    [insets.bottom, insets.top, windowHeight],
  );

  const isCategoriesSearch =
    request?.key === 'categories' &&
    Boolean(
      (request.payload as any)?.searchQuery &&
      String((request.payload as any).searchQuery).trim().length > 0
    );

  const prevIsCategoriesSearch = useRef(false);
  useEffect(() => {
    if (isCategoriesSearch !== prevIsCategoriesSearch.current) {
      if (request?.key === 'categories' && isCategoriesSearch) {
        modalRef.current?.snapToIndex(1);
      }
    }
    prevIsCategoriesSearch.current = isCategoriesSearch;
  }, [isCategoriesSearch, modalRef, request?.key]);

  useEffect(() => {
    bottomSheetDebug('HOST', {
      requestId: request?.requestId,
      key: request?.key ?? null,
      mapFlowActive: isMapFlowActive,
      reason: 'effect',
    });

    const becameActive = isMapFlowActive && !wasMapFlowActive.current;
    wasMapFlowActive.current = isMapFlowActive;

    if (!request || !isMapFlowActive) return;
    if (request.requestId === previousRequestId.current && !becameActive) return;

    previousRequestId.current = request.requestId;
    setCurrentIndex(registry[request.key]?.initialIndex ?? 1);

    if (operation === 'REPLACE' && descriptor) {
      const activeSnapPoints = resolveSheetSnapPoints({
        snapPoints: descriptor.snapPoints,
        enableDynamicSizing: descriptor.enableDynamicSizing,
        maxDynamicContentSize: descriptor.maxDynamicContentSize ?? geometry.maxDynamicContentSize,
      });
      const targetIndex = resolveSheetInitialIndex({
        requestedIndex: descriptor.initialIndex,
        resolvedSnapPoints: activeSnapPoints,
        enableDynamicSizing: descriptor.enableDynamicSizing,
      });
      bottomSheetDebug('HOST', {
        requestId: request.requestId,
        key: request.key,
        mapFlowActive: isMapFlowActive,
        reason: 'replace',
      });
      requestAnimationFrame(() => {
        modalRef.current?.present();
        requestAnimationFrame(() => {
          modalRef.current?.snapToIndex(targetIndex);
          setCurrentIndex(targetIndex);
          onChange(request, targetIndex);
        });
      });
      return;
    }

    if (operation !== 'PRESENT') return;

    onPresent(request);
    requestAnimationFrame(() => {
      bottomSheetDebug('PRESENT', {
        requestId: request.requestId,
        key: request.key,
        mapFlowActive: isMapFlowActive,
      });
      modalRef.current?.present();
      const targetDescriptor = registry[request.key];
      const activeSnapPoints = resolveSheetSnapPoints({
        snapPoints: targetDescriptor?.snapPoints,
        enableDynamicSizing: targetDescriptor?.enableDynamicSizing,
        maxDynamicContentSize: targetDescriptor?.maxDynamicContentSize ?? geometry.maxDynamicContentSize,
      });
      const targetIndex = resolveSheetInitialIndex({
        requestedIndex: targetDescriptor?.initialIndex,
        resolvedSnapPoints: activeSnapPoints,
        enableDynamicSizing: targetDescriptor?.enableDynamicSizing,
      });
      if (targetIndex > 0) {
        requestAnimationFrame(() => {
          modalRef.current?.snapToIndex(targetIndex);
        });
      }
    });
  }, [descriptor, geometry.maxDynamicContentSize, isMapFlowActive, modalRef, onChange, onPresent, operation, request]);

  if (!request || !descriptor) {
    previousRequestId.current = null;
    return null;
  }

  const isCollapsible =
    descriptor.collapsible !== false &&
    Boolean(descriptor.snapPoints && descriptor.snapPoints.length > 0 && descriptor.snapPoints.some((p) => p !== 'MAX'));
  const isCollapsed = isCollapsible ? effectiveIndex === 0 : false;
  const presentationState = isCollapsed ? 'collapsed' : 'content';

  const handleIndexChange = (index: number) => {
    setCurrentIndex(index);
    onChange(request, index);
  };

  const renderContent = () => {
    bottomSheetDebug('CONTENT', {
      requestId: request.requestId,
      key: request.key,
      reason: 'render',
      isCollapsed,
      presentationState,
    });
    bottomSheetDebug('HOST_CONTENT', {
      requestId: request.requestId,
      key: request.key,
      operation,
    });

    switch (request.key) {
      case 'categories': {
        const typedRequest = request as BottomSheetRequest<'categories'>;
        return (
          <registry.categories.content
            sheetKey={typedRequest.key}
            requestId={typedRequest.requestId}
            payload={typedRequest.payload}
            dismiss={dismiss}
            setIndex={setIndex}
            isCollapsed={isCollapsed}
            presentationState={presentationState}
          />
        );
      }
      case 'provider_preview': {
        const typedRequest = request as BottomSheetRequest<'provider_preview'>;
        return (
          <registry.provider_preview.content
            sheetKey={typedRequest.key}
            requestId={typedRequest.requestId}
            payload={typedRequest.payload}
            dismiss={dismiss}
            setIndex={setIndex}
            isCollapsed={isCollapsed}
            presentationState={presentationState}
          />
        );
      }
      case 'focus_client': {
        const typedRequest = request as BottomSheetRequest<'focus_client'>;
        return (
          <registry.focus_client.content
            sheetKey={typedRequest.key}
            requestId={typedRequest.requestId}
            payload={typedRequest.payload}
            dismiss={dismiss}
            setIndex={setIndex}
            isCollapsed={isCollapsed}
            presentationState={presentationState}
          />
        );
      }
      case 'focus_provider': {
        const typedRequest = request as BottomSheetRequest<'focus_provider'>;
        return (
          <registry.focus_provider.content
            sheetKey={typedRequest.key}
            requestId={typedRequest.requestId}
            payload={typedRequest.payload}
            dismiss={dismiss}
            setIndex={setIndex}
            isCollapsed={isCollapsed}
            presentationState={presentationState}
          />
        );
      }
      case 'provider_dashboard': {
        const typedRequest = request as BottomSheetRequest<'provider_dashboard'>;
        return (
          <registry.provider_dashboard.content
            sheetKey={typedRequest.key}
            requestId={typedRequest.requestId}
            payload={typedRequest.payload}
            dismiss={dismiss}
            setIndex={setIndex}
            isCollapsed={isCollapsed}
            presentationState={presentationState}
          />
        );
      }
    }
  };

  const resolvedContentMode = isCategoriesSearch ? 'list' : (descriptor.contentMode ?? 'view');
  const resolvedEnableDynamicSizing = isCategoriesSearch ? false : descriptor.enableDynamicSizing;
  const resolvedSnapPoints = isCategoriesSearch
    ? [descriptor.collapsedHeight ?? 88, geometry.categoriesSearchMaxHeight]
    : descriptor.snapPoints;
  const resolvedInitialIndex = isCategoriesSearch ? 1 : descriptor.initialIndex;

  const resolvedMaxDynamicContentSize = isCategoriesSearch
    ? geometry.categoriesSearchMaxHeight
    : descriptor.maxDynamicContentSize;

  return (
    <Sheet
      key={request.key}
      ref={modalRef}
      sheetKey={request.key}
      contentMode={resolvedContentMode}
      snapPoints={resolvedSnapPoints}
      initialIndex={resolvedInitialIndex}
      enableDynamicSizing={resolvedEnableDynamicSizing}
      maxDynamicContentSize={resolvedMaxDynamicContentSize}
      keyboardBehavior={descriptor.keyboardBehavior}
      keyboardBlurBehavior={descriptor.keyboardBlurBehavior}
      onChange={handleIndexChange}
      onDismiss={() => onDismiss(request)}
      onContentHeightChange={onContentHeightChange}
    >
      {renderContent()}
    </Sheet>
  );
};
