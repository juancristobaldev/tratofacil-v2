import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { MainLayout } from './MainLayout';

let mockRole: 'client' | 'provider' = 'client';
let mockRealtime: any = {
  activeOrder: null,
  localActiveOrder: null,
  providerActiveOrder: null,
};

const mockHomePage = jest.fn(() => {
  const { Text: RNText } = require('react-native');
  return <RNText testID="home-page">home</RNText>;
});

const mockClientFocusScreen = jest.fn(() => {
  const { Text: RNText } = require('react-native');
  return <RNText testID="client-focus-screen">client</RNText>;
});

const mockProviderFocusScreen = jest.fn(() => {
  const { Text: RNText } = require('react-native');
  return <RNText testID="provider-focus-screen">provider</RNText>;
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../layout/bottomNavMetrics', () => ({
  useBottomNavHeight: () => 64,
}));

jest.mock('../../context/RoleContext', () => ({
  useRole: () => ({ role: mockRole }),
}));

jest.mock('../../realtime/RealtimeContext', () => ({
  useRealtime: () => mockRealtime,
}));

jest.mock('../../bottom-sheet/core/useBottomSheet', () => ({
  useBottomSheet: () => ({
    active: null,
    pendingMapFlowKey: null,
  }),
}));

jest.mock('../ui', () => ({
  RequireLocation: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./BottomNav', () => ({
  BottomNav: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (t: any) => void }) => {
    const { TouchableOpacity, Text: RNText } = require('react-native');
    return (
      <TouchableOpacity testID="bottom-nav" onPress={() => onTabChange('marketplace')}>
        <RNText>{activeTab}</RNText>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../tabs/HomePage', () => ({
  HomePage: () => mockHomePage(),
}));

jest.mock('../../screens/client/FocusModeClientScreen', () => ({
  FocusModeClientScreen: () => mockClientFocusScreen(),
}));

jest.mock('../../screens/provider/FocusModeProviderScreen', () => ({
  FocusModeProviderScreen: () => mockProviderFocusScreen(),
}));

jest.mock('../tabs/MarketplaceTab', () => ({
  MarketplaceTab: () => {
    const { Text: RNText } = require('react-native');
    return <RNText testID="marketplace-tab">marketplace</RNText>;
  },
}));

jest.mock('../tabs/JobsTab', () => ({
  JobsTab: () => {
    const { Text: RNText } = require('react-native');
    return <RNText testID="jobs-tab">jobs</RNText>;
  },
}));

jest.mock('../tabs/EarningsTab', () => ({
  EarningsTab: () => {
    const { Text: RNText } = require('react-native');
    return <RNText testID="earnings-tab">earnings</RNText>;
  },
}));

jest.mock('../../screens/shared/MyServicesScreen', () => ({
  MyServicesScreen: () => {
    const { Text: RNText } = require('react-native');
    return <RNText testID="my-services-screen">services</RNText>;
  },
}));

jest.mock('../../screens/shared/TratoDirectoScreen', () => ({
  TratoDirectoScreen: () => {
    const { Text: RNText } = require('react-native');
    return <RNText testID="trato-directo-screen">direct</RNText>;
  },
}));

describe('MainLayout single native surface', () => {
  beforeEach(() => {
    mockRole = 'client';
    mockRealtime = {
      activeOrder: null,
      localActiveOrder: null,
      providerActiveOrder: null,
    };
    mockHomePage.mockClear();
    mockClientFocusScreen.mockClear();
    mockProviderFocusScreen.mockClear();
  });

  it('mounts HomePage as the single native surface when provider has an active order', () => {
    mockRole = 'provider';
    mockRealtime.providerActiveOrder = { id: 22, status: 'ACCEPTED' };

    act(() => {
      renderer.create(<MainLayout />);
    });

    expect(mockHomePage).toHaveBeenCalledTimes(1);
  });

  it('mounts HomePage as the single native surface when client has an active order', () => {
    mockRole = 'client';
    mockRealtime.activeOrder = { id: 11, status: 'ACCEPTED', provider: { id: 1 } };

    act(() => {
      renderer.create(<MainLayout />);
    });

    expect(mockHomePage).toHaveBeenCalledTimes(1);
  });

  it('mounts HomePage as the single native surface when no active order exists', () => {
    mockRole = 'client';
    mockRealtime.activeOrder = null;

    act(() => {
      renderer.create(<MainLayout />);
    });

    expect(mockHomePage).toHaveBeenCalledTimes(1);
  });

  it('switches back to home tab on Android hardwareBackPress if on secondary tab', () => {
    const { BackHandler } = require('react-native');
    let backPressHandler: () => boolean = () => false;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((event: string, handler: any) => {
      if (event === 'hardwareBackPress') {
        backPressHandler = handler;
      }
      return { remove: jest.fn() };
    }) as any);

    let component: any;
    act(() => {
      component = renderer.create(<MainLayout />);
    });

    // Currently on home tab, hardwareBackPress returns false
    expect(backPressHandler()).toBe(false);

    // Switch to marketplace tab
    const bottomNav = component.root.findByProps({ testID: 'bottom-nav' });
    act(() => {
      bottomNav.props.onPress();
    });

    // Now on marketplace tab, hardwareBackPress returns true and switches back to home
    let handled = false;
    act(() => {
      handled = backPressHandler();
    });
    expect(handled).toBe(true);
  });
});

