import React from 'react';
import renderer from 'react-test-renderer';
import { DrivingNavigationHUD, getManeuverDetails } from './DrivingNavigationHUD';
import type { TurnAnalysis } from '../../navigation-engine/types';

describe('DrivingNavigationHUD Component', () => {
  describe('getManeuverDetails helper', () => {
    it('returns default continue straight when no turn detected', () => {
      const details = getManeuverDetails(null);
      expect(details.iconName).toBe('ArrowUp');
      expect(details.instructionText).toBe('Continúe por la ruta');
      expect(details.distanceText).toBe('');
    });

    it('returns turn right details with formatted distance', () => {
      const turn: TurnAnalysis = {
        turnDetected: true,
        turnType: 'TURN',
        deltaAngle: 85,
        distanceToTurn: 150,
        timeToTurnSec: 10,
        blendedHeading: 90,
      };
      const details = getManeuverDetails(turn);
      expect(details.iconName).toBe('CornerUpRight');
      expect(details.instructionText).toBe('Gire a la derecha');
      expect(details.distanceText).toBe('En 150 m');
    });

    it('returns turn left details when deltaAngle is negative', () => {
      const turn: TurnAnalysis = {
        turnDetected: true,
        turnType: 'TURN',
        deltaAngle: -75,
        distanceToTurn: 80,
        timeToTurnSec: 5,
        blendedHeading: 270,
      };
      const details = getManeuverDetails(turn);
      expect(details.iconName).toBe('CornerUpLeft');
      expect(details.instructionText).toBe('Gire a la izquierda');
      expect(details.distanceText).toBe('En 80 m');
    });

    it('formats distances >= 1000m as km', () => {
      const turn: TurnAnalysis = {
        turnDetected: true,
        turnType: 'STRAIGHT',
        deltaAngle: 0,
        distanceToTurn: 1400,
        timeToTurnSec: 80,
        blendedHeading: 0,
      };
      const details = getManeuverDetails(turn);
      expect(details.iconName).toBe('ArrowUp');
      expect(details.instructionText).toBe('Continúe recto');
      expect(details.distanceText).toBe('Por 1.4 km');
    });

    it('handles U_TURN maneuver', () => {
      const turn: TurnAnalysis = {
        turnDetected: true,
        turnType: 'U_TURN',
        deltaAngle: 180,
        distanceToTurn: 200,
        timeToTurnSec: 15,
        blendedHeading: 180,
      };
      const details = getManeuverDetails(turn);
      expect(details.iconName).toBe('RotateCcw');
      expect(details.instructionText).toBe('Retorno en U');
      expect(details.distanceText).toBe('En 200 m');
    });
  });

  describe('Component Rendering', () => {
    it('renders the 4 critical driving telemetry elements: turn icon, turn distance, ETA minutes, and arrival km', () => {
      const turn: TurnAnalysis = {
        turnDetected: true,
        turnType: 'TURN',
        deltaAngle: 90,
        distanceToTurn: 120,
        timeToTurnSec: 8,
        blendedHeading: 90,
      };

      let tree: any;
      renderer.act(() => {
        tree = renderer.create(
          <DrivingNavigationHUD
            turn={turn}
            etaLabel="6 min"
            distanceLabel="1.8 km"
            destinationAddress="Calle Prat 500"
            clientName="Juan Pérez"
          />,
        );
      });

      const root = tree.root;
      // 1. Icono de giro
      expect(root.findByProps({ testID: 'hud-maneuver-icon-box' })).toBeTruthy();
      expect(root.findByProps({ testID: 'hud-maneuver-icon' }).props.name).toBe('CornerUpRight');

      // 2. Distancia del giro
      const turnDistanceNode = root.findByProps({ testID: 'hud-turn-distance' });
      expect(turnDistanceNode.props.children).toBe('En 120 m');

      // 3. Minutos de llegada
      const etaNode = root.findByProps({ testID: 'hud-eta-minutes' });
      expect(etaNode.props.children).toBe('6 min');

      // 4. Km a la ubicación de llegada
      const arrivalDistNode = root.findByProps({ testID: 'hud-arrival-distance' });
      expect(arrivalDistNode.props.children).toBe('1.8 km');

      // Verifica que no se rendericen textos superfluos que distraigan al conducir (dirección, nombre de cliente)
      const textNodes = root.findAllByType('Text' as any);
      const texts = textNodes.map((n: any) => n.props.children).flat();
      expect(texts.some((t: string) => String(t).includes('Juan Pérez'))).toBe(false);
      expect(texts.some((t: string) => String(t).includes('Calle Prat'))).toBe(false);
      expect(texts.some((t: string) => String(t).includes('Gire a la derecha'))).toBe(false);
    });

    it('renders fallback turn distance "En ruta" when no specific turn is detected', () => {
      let tree: any;
      renderer.act(() => {
        tree = renderer.create(
          <DrivingNavigationHUD
            turn={null}
            etaLabel="4 min"
            distanceLabel="3.2 km"
          />,
        );
      });

      const root = tree.root;
      expect(root.findByProps({ testID: 'hud-turn-distance' }).props.children).toBe('En ruta');
      expect(root.findByProps({ testID: 'hud-eta-minutes' }).props.children).toBe('4 min');
      expect(root.findByProps({ testID: 'hud-arrival-distance' }).props.children).toBe('3.2 km');
    });

    it('renders "Gire ahora" and retains directional icon when turn distance is <= 20m', () => {
      const imminentTurn: TurnAnalysis = {
        turnDetected: true,
        turnType: 'TURN',
        deltaAngle: 90,
        distanceToTurn: 15,
        timeToTurnSec: 2,
        blendedHeading: 90,
      };

      let tree: any;
      renderer.act(() => {
        tree = renderer.create(
          <DrivingNavigationHUD
            turn={imminentTurn}
            etaLabel="1 min"
            distanceLabel="15 m"
          />,
        );
      });

      const root = tree.root;
      expect(root.findByProps({ testID: 'hud-maneuver-icon' }).props.name).toBe('CornerUpRight');
      expect(root.findByProps({ testID: 'hud-turn-distance' }).props.children).toBe('Gire ahora');
    });

    it('preserves "Gire ahora" and turn icon even at distanceToTurn 0m without dropping to "En ruta"', () => {
      const vertexTurn: TurnAnalysis = {
        turnDetected: true,
        turnType: 'TURN',
        deltaAngle: -85,
        distanceToTurn: 0,
        timeToTurnSec: 0,
        blendedHeading: 270,
      };

      let tree: any;
      renderer.act(() => {
        tree = renderer.create(
          <DrivingNavigationHUD
            turn={vertexTurn}
            etaLabel="1 min"
            distanceLabel="0 m"
          />,
        );
      });

      const root = tree.root;
      expect(root.findByProps({ testID: 'hud-maneuver-icon' }).props.name).toBe('CornerUpLeft');
      expect(root.findByProps({ testID: 'hud-turn-distance' }).props.children).toBe('Gire ahora');
    });
  });
});
