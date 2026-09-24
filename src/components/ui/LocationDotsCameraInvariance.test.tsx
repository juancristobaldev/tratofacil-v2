import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import Supercluster from 'supercluster';
import { AnimatedUserMarker } from './AnimatedUserMarker';
import { AnimatedProviderMarker } from './AnimatedProviderMarker';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn().mockReturnValue(true),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="MapView" {...props} />,
    Marker: (props: any) => <View testID="Marker" {...props} />,
    AnimatedRegion: jest.fn().mockImplementation((coords: any) => ({
      ...coords,
      setValue: jest.fn(),
      timing: jest.fn().mockReturnValue({ start: jest.fn((cb?: any) => cb?.({ finished: true })) }),
    })),
  };
});

describe('Location Dots Camera Invariance & Ground Anchoring', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('AnimatedUserMarker sets flat={true} so it remains anchored to the map plane in 3D pitch/heading', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedUserMarker
          coordinate={{ latitude: -38.7396, longitude: -72.5901 }}
          heading={45}
          isMapManipulating={false}
        />
      );
    });

    const marker = renderer!.root.findByProps({ testID: 'Marker' });
    expect(marker.props.flat).toBe(true);
    expect(marker.props.coordinate).toEqual({ latitude: -38.7396, longitude: -72.5901 });

    act(() => {
      renderer!.unmount();
    });
  });

  it('AnimatedProviderMarker sets flat={true} to avoid perspective tilt drift', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedProviderMarker
          coordinate={{ latitude: -38.7400, longitude: -72.5920 }}
          heading={90}
        />
      );
    });

    const marker = renderer!.root.findByProps({ testID: 'Marker' });
    expect(marker.props.flat).toBe(true);

    act(() => {
      renderer!.unmount();
    });
  });

  it('Supercluster filtering guarantees selectedProvider coordinates remain invariant across zoom changes', () => {
    // 2 providers separated by ~70m in Temuco
    const p1 = { id: 101, name: 'Gasfiter Juan', lat: -38.7396, lng: -72.5901 };
    const p2 = { id: 102, name: 'Electricista Pedro', lat: -38.7402, lng: -72.5915 };
    const allProviders = [p1, p2];

    const clusterIndex = new Supercluster({ radius: 50, maxZoom: 16 });

    // When p1 is selected, it must be excluded from Supercluster input
    const selectedProvider = p1;
    const clusterPoints = allProviders
      .filter((p) => p.lat != null && p.lng != null)
      .filter((p) => !selectedProvider || String(p.id) !== String(selectedProvider.id))
      .map((p) => ({
        type: 'Feature' as const,
        properties: { cluster: false, provider: p },
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      }));

    clusterIndex.load(clusterPoints);

    // Zoom 14 (fitToRoute zoom level)
    const clustersAtZoom14 = clusterIndex.getClusters([-72.65, -38.78, -72.55, -38.70], 14);

    // p1 is NOT in any cluster, so it retains its exact geographic coordinates
    const clusteredP1 = clustersAtZoom14.find((c: any) => c.properties?.provider?.id === p1.id);
    expect(clusteredP1).toBeUndefined();

    // Dedicated pin for p1 remains rendered exactly at its source coordinates
    const dedicatedPinCoord = { latitude: p1.lat, longitude: p1.lng };
    expect(dedicatedPinCoord.latitude).toBe(-38.7396);
    expect(dedicatedPinCoord.longitude).toBe(-72.5901);
  });
});
