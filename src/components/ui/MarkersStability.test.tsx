import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import { AnimatedUserMarker } from "./AnimatedUserMarker";
import { ProviderPin } from "./ProviderPin";
import { ClusterPin } from "./ClusterPin";
import { HousePin } from "./HousePin";

// Mock @react-navigation/native
jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// Mock react-native-maps Marker
jest.mock("react-native-maps", () => {
  const React = require("react");
  const Marker = React.forwardRef((props: any, ref: any) => {
    return React.createElement("MockMarker", { ...props, ref }, props.children);
  });
  return {
    Marker,
    __esModule: true,
  };
});

describe("Map Markers Stability & Anchor Invariants", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("AnimatedUserMarker", () => {
    it("anchors at exact center (0.5, 0.5) with centerOffset (0, 0)", () => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        renderer = ReactTestRenderer.create(
          <AnimatedUserMarker
            coordinate={{ latitude: -38.74, longitude: -72.59 }}
          />
        );
      });

      const markerInstance = renderer.root.findByType("MockMarker" as any);
      expect(markerInstance.props.anchor).toEqual({ x: 0.5, y: 0.5 });
      expect(markerInstance.props.centerOffset).toEqual({ x: 0, y: 0 });
    });

    it("freezes tracksViewChanges to false immediately when isMapManipulating is true", () => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        renderer = ReactTestRenderer.create(
          <AnimatedUserMarker
            coordinate={{ latitude: -38.74, longitude: -72.59 }}
            isMapManipulating={true}
          />
        );
      });

      const markerInstance = renderer.root.findByType("MockMarker" as any);
      expect(markerInstance.props.tracksViewChanges).toBe(false);
    });

    it("freezes tracksViewChanges after initial warmup timer finishes", () => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        renderer = ReactTestRenderer.create(
          <AnimatedUserMarker
            coordinate={{ latitude: -38.74, longitude: -72.59 }}
            isMapManipulating={false}
          />
        );
      });

      let markerInstance = renderer.root.findByType("MockMarker" as any);
      expect(markerInstance.props.tracksViewChanges).toBe(true);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      markerInstance = renderer.root.findByType("MockMarker" as any);
      expect(markerInstance.props.tracksViewChanges).toBe(false);
    });
  });

  describe("ProviderPin", () => {
    const mockProvider = {
      id: "prov-1",
      name: "Electricista Experto",
      avatar: "https://example.com/avatar.jpg",
      rating: 4.9,
      reviewsCount: 18,
      pricePerHour: 25000,
      verified: true,
      isRealtimeActive: true,
      serviceName: "Electricidad",
    };

    it("anchors at bottom needle tip (0.5, 1.0) with centerOffset (0, 0)", () => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        renderer = ReactTestRenderer.create(
          <ProviderPin
            provider={mockProvider}
            coordinate={{ latitude: -38.74, longitude: -72.59 }}
            isSelected={false}
            onPress={jest.fn()}
          />
        );
      });

      const markerInstance = renderer.root.findByType("MockMarker" as any);
      expect(markerInstance.props.anchor).toEqual({ x: 0.5, y: 1.0 });
      expect(markerInstance.props.centerOffset).toEqual({ x: 0, y: 0 });
    });

    it("suspends tracksViewChanges during gesture manipulation", () => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        renderer = ReactTestRenderer.create(
          <ProviderPin
            provider={mockProvider}
            coordinate={{ latitude: -38.74, longitude: -72.59 }}
            isSelected={false}
            isMapManipulating={true}
            onPress={jest.fn()}
          />
        );
      });

      const markerInstance = renderer.root.findByType("MockMarker" as any);
      expect(markerInstance.props.tracksViewChanges).toBe(false);
    });
  });

  describe("ClusterPin", () => {
    it("anchors at exact center (0.5, 0.5) and supports isMapManipulating", () => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        renderer = ReactTestRenderer.create(
          <ClusterPin
            coordinate={{ latitude: -38.74, longitude: -72.59 }}
            pointCount={5}
            isMapManipulating={true}
            onPress={jest.fn()}
          />
        );
      });

      const markerInstance = renderer.root.findByType("MockMarker" as any);
      expect(markerInstance.props.anchor).toEqual({ x: 0.5, y: 0.5 });
      expect(markerInstance.props.tracksViewChanges).toBe(false);
    });
  });

  describe("HousePin", () => {
    it("anchors at exact center (0.5, 0.5) and keeps tracksViewChanges frozen", () => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        renderer = ReactTestRenderer.create(
          <HousePin
            coordinate={{ latitude: -38.74, longitude: -72.59 }}
          />
        );
      });

      const markerInstance = renderer.root.findByType("MockMarker" as any);
      expect(markerInstance.props.anchor).toEqual({ x: 0.5, y: 0.5 });
      expect(markerInstance.props.tracksViewChanges).toBe(false);
    });
  });
});
