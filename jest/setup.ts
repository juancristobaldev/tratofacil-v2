import '@testing-library/react-native';

// Mock lucide-react-native
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const proxy = new Proxy(
    {},
    {
      get: (_target, iconName) => {
        if (iconName === '__esModule') return true;
        if (iconName === 'default') return proxy;
        const IconComponent = (props: any) =>
          React.createElement(
            Text,
            {
              accessibilityElementsHidden: true,
              importantForAccessibility: 'no-hide-descendants',
              ...props,
            },
            String(iconName),
          );
        IconComponent.displayName = String(iconName);
        return IconComponent;
      },
    },
  );
  return proxy;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const mockGestureChain = () => {
    const chain: any = {
      onStart: () => chain,
      onUpdate: () => chain,
      onEnd: () => chain,
      onFinalize: () => chain,
      enabled: () => chain,
      shouldCancelWhenOutside: () => chain,
      hitSlop: () => chain,
      maxPointers: () => chain,
      minPointers: () => chain,
    };
    return chain;
  };
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Pan: mockGestureChain,
      Tap: mockGestureChain,
      Pinch: mockGestureChain,
      Rotation: mockGestureChain,
      Fling: mockGestureChain,
      LongPress: mockGestureChain,
      Exclusive: (...gestures: any[]) => gestures[0],
      Simultaneous: (...gestures: any[]) => gestures[0],
      Race: (...gestures: any[]) => gestures[0],
    },
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    ScrollView: View,
    FlatList: View,
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      Text,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withSpring: (v: any) => v,
    withTiming: (v: any) => v,
    runOnJS: (fn: any) => fn,
    interpolate: () => 0,
    Extrapolation: { CLAMP: 'clamp' },
  };
});

// Mock @gorhom/bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, TouchableOpacity, ScrollView } = require('react-native');

  const BottomSheetModal = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      present: jest.fn(),
      dismiss: jest.fn(),
      snapToIndex: jest.fn(),
      collapse: jest.fn(),
      expand: jest.fn(),
      close: jest.fn(),
    }));
    return React.createElement(View, { testID: 'gorhom-bottom-sheet-modal', ...props }, props.children);
  });
  BottomSheetModal.displayName = 'BottomSheetModal';

  return {
    __esModule: true,
    default: View,
    BottomSheetModal,
    BottomSheetView: View,
    BottomSheetModalProvider: ({ children }: any) => children,
    BottomSheetScrollView: ScrollView,
    BottomSheetFlatList: View,
    BottomSheetTextInput: View,
    BottomSheetBackdrop: View,
    TouchableOpacity,
    useBottomSheet: () => ({
      expand: jest.fn(),
      collapse: jest.fn(),
      close: jest.fn(),
      snapToIndex: jest.fn(),
    }),
  };
});

// Mock supercluster
jest.mock('supercluster', () => {
  return jest.fn().mockImplementation(() => ({
    load: jest.fn(),
    getClusters: jest.fn(() => []),
  }));
});

// Mock react-native-geolocation-service
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaConsumer: ({ children }: any) => children(inset),
    SafeAreaView: View,
    useSafeAreaInsets: () => inset,
  };
});

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn().mockResolvedValue(false),
  setGenericPassword: jest.fn().mockResolvedValue(true),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));
