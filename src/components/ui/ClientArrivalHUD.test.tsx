import React from 'react';
import renderer from 'react-test-renderer';
import { ClientArrivalHUD } from './ClientArrivalHUD';

describe('ClientArrivalHUD Component', () => {
  it('renders correctly with provider name, rating, ETA and distance', () => {
    let tree: any;
    renderer.act(() => {
      tree = renderer.create(
        <ClientArrivalHUD
          providerName="Carlos Gómez"
          providerRating={4.9}
          etaMinutes="7 min"
          distanceRemaining="1.8 km"
          vehicleInfo="En moto"
          routeProgressFraction={0.65}
        />,
      );
    });

    const root = tree.root;
    expect(root.findByProps({ testID: 'client-arrival-hud' })).toBeTruthy();
    expect(root.findByProps({ testID: 'hud-client-avatar-box' })).toBeTruthy();
    expect(root.findByProps({ testID: 'live-pulse-dot' })).toBeTruthy();

    const texts = root.findAllByType('Text').map((t: any) => t.props.children);
    const flatTexts = texts.flat().filter(Boolean).join(' ');

    expect(flatTexts).toContain('Carlos Gómez');
    expect(flatTexts).toContain('4.9');
    expect(flatTexts).toContain('~7 min');
    expect(flatTexts).toContain('1.8 km');
    expect(flatTexts).toContain('En moto');
  });

  it('formats numeric etaMinutes correctly with ~ prefix and min suffix', () => {
    let tree: any;
    renderer.act(() => {
      tree = renderer.create(
        <ClientArrivalHUD
          providerName="Ana Silva"
          etaMinutes={5}
          distanceRemaining="950 m"
        />,
      );
    });

    const root = tree.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children);
    const flatTexts = texts.flat().filter(Boolean).join(' ');

    expect(flatTexts).toContain('~5 min');
    expect(flatTexts).toContain('950 m');
  });

  it('does NOT render quick action buttons (no phone or chat interactive buttons)', () => {
    let tree: any;
    renderer.act(() => {
      tree = renderer.create(
        <ClientArrivalHUD
          providerName="Pedro Soto"
          etaMinutes="12 min"
          distanceRemaining="3.5 km"
        />,
      );
    });

    const root = tree.root;
    // Verify that NO TouchableOpacity exists in the HUD card
    const touchables = root.findAllByType('TouchableOpacity');
    expect(touchables.length).toBe(0);
  });

  it('renders progress bar with clamped width percent', () => {
    let tree: any;
    renderer.act(() => {
      tree = renderer.create(
        <ClientArrivalHUD
          providerName="Marta Ruiz"
          routeProgressFraction={0.42}
        />,
      );
    });

    const root = tree.root;
    const progressBar = root.findByProps({ testID: 'hud-progress-bar' });
    const style = Array.isArray(progressBar.props.style)
      ? Object.assign({}, ...progressBar.props.style)
      : progressBar.props.style;

    expect(style.width).toBe('42%');
  });
});
