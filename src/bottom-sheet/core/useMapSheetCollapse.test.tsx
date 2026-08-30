import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useMapSheetCollapse, type UseMapSheetCollapseOptions } from './useMapSheetCollapse';

describe('useMapSheetCollapse Hook', () => {
  let hookValue: ReturnType<typeof useMapSheetCollapse>;

  function TestComponent(props: UseMapSheetCollapseOptions) {
    hookValue = useMapSheetCollapse(props);
    return null;
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('collapses open sheet (index 1) to index 0 on map pan drag and restores to index 1 after settle debounce', () => {
    const mockSetIndex = jest.fn();

    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          activeSheet="categories"
          sheetIndex={1}
          isCollapsed={false}
          setIndex={mockSetIndex}
          debounceMs={400}
        />
      );
    });

    // 1. User starts dragging the map
    act(() => {
      hookValue.handleMapPanDrag();
    });

    // Sheet should immediately collapse to index 0
    expect(mockSetIndex).toHaveBeenCalledTimes(1);
    expect(mockSetIndex).toHaveBeenCalledWith(0);
    expect(hookValue.isMapManipulating).toBe(true);

    // 2. User stops dragging, region change completes
    act(() => {
      hookValue.handleMapRegionChangeComplete();
    });

    // Before debounce timer expires, sheet is still at index 0 (not restored yet)
    expect(mockSetIndex).toHaveBeenCalledTimes(1);

    // 3. Fast-forward timer by 399ms (just before expiration)
    act(() => {
      jest.advanceTimersByTime(399);
    });
    expect(mockSetIndex).toHaveBeenCalledTimes(1);

    // 4. Fast-forward remaining 1ms -> timer fires
    act(() => {
      jest.advanceTimersByTime(1);
    });

    // Sheet should smoothly restore to index 1
    expect(mockSetIndex).toHaveBeenCalledTimes(2);
    expect(mockSetIndex).toHaveBeenLastCalledWith(1);
    expect(hookValue.isMapManipulating).toBe(false);
  });

  it('preserves user collapsed state: does NOT auto-expand if sheet was already collapsed before map drag', () => {
    const mockSetIndex = jest.fn();

    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          activeSheet="categories"
          sheetIndex={0}
          isCollapsed={true}
          setIndex={mockSetIndex}
          debounceMs={400}
        />
      );
    });

    // User starts dragging the map while sheet is already at index 0 (collapsed)
    act(() => {
      hookValue.handleMapPanDrag();
    });

    // setIndex should NOT be called (already at 0)
    expect(mockSetIndex).not.toHaveBeenCalled();

    // Map finishes moving
    act(() => {
      hookValue.handleMapRegionChangeComplete();
      jest.advanceTimersByTime(500);
    });

    // setIndex should STILL NOT be called (respects user intention to keep sheet collapsed)
    expect(mockSetIndex).not.toHaveBeenCalled();
    expect(hookValue.isMapManipulating).toBe(false);
  });

  it('handles rapid consecutive swipes cleanly without bounce/flicker', () => {
    const mockSetIndex = jest.fn();

    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          activeSheet="focus_client"
          sheetIndex={1}
          isCollapsed={false}
          setIndex={mockSetIndex}
          debounceMs={400}
        />
      );
    });

    // Swipe 1
    act(() => {
      hookValue.handleMapPanDrag();
    });
    expect(mockSetIndex).toHaveBeenCalledTimes(1);
    expect(mockSetIndex).toHaveBeenCalledWith(0);

    // Swipe 1 ends
    act(() => {
      hookValue.handleMapRegionChangeComplete();
      jest.advanceTimersByTime(200); // 200ms elapsed
    });

    // Swipe 2 begins before timer finished
    act(() => {
      hookValue.handleMapPanDrag();
    });

    // Fast forward another 200ms (total 400ms from swipe 1, but swipe 2 reset the timer)
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // Should NOT have restored yet
    expect(mockSetIndex).toHaveBeenCalledTimes(1);

    // Swipe 2 ends
    act(() => {
      hookValue.handleMapRegionChangeComplete();
      jest.advanceTimersByTime(400);
    });

    // Now it restores once cleanly
    expect(mockSetIndex).toHaveBeenCalledTimes(2);
    expect(mockSetIndex).toHaveBeenLastCalledWith(1);
  });

  it('cancels restore if cancelPendingRestore or resetMapCollapseState is called', () => {
    const mockSetIndex = jest.fn();

    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          activeSheet="provider_dashboard"
          sheetIndex={1}
          isCollapsed={false}
          setIndex={mockSetIndex}
          debounceMs={400}
        />
      );
    });

    act(() => {
      hookValue.handleMapPanDrag();
      hookValue.handleMapRegionChangeComplete();
    });

    expect(mockSetIndex).toHaveBeenCalledTimes(1);

    // User taps a button or screen blurs -> cancelPendingRestore called
    act(() => {
      hookValue.cancelPendingRestore();
      jest.advanceTimersByTime(500);
    });

    // Should NOT have restored
    expect(mockSetIndex).toHaveBeenCalledTimes(1);
  });

  it('resets state when activeSheet becomes null (sheet dismissed)', () => {
    const mockSetIndex = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <TestComponent
          activeSheet="categories"
          sheetIndex={1}
          isCollapsed={false}
          setIndex={mockSetIndex}
          debounceMs={400}
        />
      );
    });

    act(() => {
      hookValue.handleMapPanDrag();
    });

    expect(mockSetIndex).toHaveBeenCalledWith(0);

    // Sheet dismissed -> activeSheet becomes null
    act(() => {
      renderer.update(
        <TestComponent
          activeSheet={null}
          sheetIndex={-1}
          isCollapsed={false}
          setIndex={mockSetIndex}
          debounceMs={400}
        />
      );
    });

    act(() => {
      hookValue.handleMapRegionChangeComplete();
      jest.advanceTimersByTime(500);
    });

    // Should not call setIndex because activeSheet is null
    expect(mockSetIndex).toHaveBeenCalledTimes(1);
  });
});
