import React, { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { Sheet } from '../primitives/Sheet';
import { registry } from './bottomSheet.registry';
import { useBottomSheet } from './useBottomSheet';
import { bottomSheetDebug } from './bottomSheet.debug';
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
  const previousRequestId = useRef<number | null>(null);
  const wasMapFlowActive = useRef(false);

  const descriptor = request ? registry[request.key] : null;
  const initialIndex = descriptor?.initialIndex ?? 1;
  const [currentIndex, setCurrentIndex] = React.useState<number>(initialIndex);

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

    if (operation !== 'PRESENT') return;

    onPresent(request);
    requestAnimationFrame(() => {
      bottomSheetDebug('PRESENT', {
        requestId: request.requestId,
        key: request.key,
        mapFlowActive: isMapFlowActive,
      });
      modalRef.current?.present();
    });
  }, [isMapFlowActive, modalRef, onPresent, operation, request]);

  if (!request || !descriptor) {
    previousRequestId.current = null;
    return null;
  }

  const isCollapsed = currentIndex === 0;
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

  return (
    <Sheet
      ref={modalRef}
      sheetKey={request.key}
      snapPoints={descriptor.snapPoints}
      initialIndex={descriptor.initialIndex}
      enableDynamicSizing={descriptor.enableDynamicSizing}
      maxDynamicContentSize={descriptor.maxDynamicContentSize}
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
