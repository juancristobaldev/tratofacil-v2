import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CTABannerButton } from './CTABannerButton';
import { FAB } from './FAB';
import { PhoneInput, PriceInput, SelectPickerTrigger } from './SpecialInputs';
import { ToggleSwitch, RadioGroup } from './ToggleAndRadio';
import { SegmentedTabs, IntervalToggle } from './SegmentedTabs';
import { StepIndicator } from './StepIndicator';
import { FilterChipsRow } from './FilterChips';
import { StatusBanner } from './StatusBanner';
import { Skeleton, CardSkeleton } from './Skeleton';

jest.mock('lucide-react-native', () => {
  const mockReact = require('react');
  const { Text } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, iconName) => (props: any) =>
        mockReact.createElement(
          Text,
          {
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants',
            ...props,
          },
          String(iconName),
        ),
    },
  );
});

describe('UI Kit Primitives', () => {
  describe('CTABannerButton', () => {
    it('renders title and subtitle and triggers onPress', async () => {
      const onPress = jest.fn();
      const view = await render(
        <CTABannerButton
          testID="cta-banner"
          title="Publicar Servicio"
          subtitle="Llega a más clientes"
          onPress={onPress}
        />
      );

      expect(view.getByText('Publicar Servicio')).toBeTruthy();
      expect(view.getByText('Llega a más clientes')).toBeTruthy();

      await fireEvent.press(view.getByTestId('cta-banner'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('FAB', () => {
    it('renders round and extended FAB and handles onPress', async () => {
      const onPress = jest.fn();
      const view = await render(
        <FAB testID="fab-btn" icon="Plus" label="Publicar" onPress={onPress} variant="dark" />
      );

      expect(view.getByText('Publicar')).toBeTruthy();
      await fireEvent.press(view.getByTestId('fab-btn'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('SpecialInputs', () => {
    it('renders PhoneInput and formats correctly', async () => {
      const onChange = jest.fn();
      const view = await render(
        <PhoneInput
          testID="phone-input"
          label="Teléfono móvil"
          value="912345678"
          onChangeText={onChange}
        />
      );

      expect(view.getByText('Teléfono móvil')).toBeTruthy();
      expect(view.getByText('CL +56')).toBeTruthy();

      await fireEvent.changeText(view.getByTestId('phone-input'), '987654321');
      expect(onChange).toHaveBeenCalledWith('+56987654321');
    });

    it('renders PriceInput and SelectPickerTrigger', async () => {
      const onSelectPress = jest.fn();
      const view = await render(
        <>
          <PriceInput testID="price-input" value={22000} />
          <SelectPickerTrigger
            testID="select-picker"
            label="Comuna"
            value="Providencia"
            onPress={onSelectPress}
          />
        </>
      );

      expect(view.getByText('MONTO A COBRAR')).toBeTruthy();
      expect(view.getByText('Providencia')).toBeTruthy();

      await fireEvent.press(view.getByTestId('select-picker'));
      expect(onSelectPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('ToggleAndRadio', () => {
    it('handles toggle switch state changes', async () => {
      const onValueChange = jest.fn();
      const view = await render(
        <ToggleSwitch
          testID="toggle-switch"
          label="Disponible para ordenes"
          value={false}
          onValueChange={onValueChange}
        />
      );

      expect(view.getByText('Disponible para ordenes')).toBeTruthy();
      await fireEvent.press(view.getByTestId('toggle-switch'));
      expect(onValueChange).toHaveBeenCalledWith(true);
    });

    it('renders RadioGroup and handles option selection', async () => {
      const onSelect = jest.fn();
      const options = [
        { value: 'cash', label: 'Efectivo' },
        { value: 'transfer', label: 'Transferencia' },
      ];
      const view = await render(
        <RadioGroup options={options} selectedValue="cash" onSelect={onSelect} />
      );

      expect(view.getByText('Efectivo')).toBeTruthy();
      expect(view.getByText('Transferencia')).toBeTruthy();

      await fireEvent.press(view.getByText('Transferencia'));
      expect(onSelect).toHaveBeenCalledWith('transfer');
    });
  });

  describe('SegmentedTabs & IntervalToggle', () => {
    it('renders tabs and changes active tab', async () => {
      const onTabChange = jest.fn();
      const tabs = [
        { key: 'current', label: 'En curso', count: 2 },
        { key: 'history', label: 'Historial' },
      ];
      const view = await render(
        <SegmentedTabs tabs={tabs} activeTab="current" onTabChange={onTabChange} />
      );

      expect(view.getByText('En curso')).toBeTruthy();
      expect(view.getByText('2')).toBeTruthy();
      expect(view.getByText('Historial')).toBeTruthy();

      await fireEvent.press(view.getByText('Historial'));
      expect(onTabChange).toHaveBeenCalledWith('history');
    });

    it('renders IntervalToggle and toggles state', async () => {
      const onToggle = jest.fn();
      const view = await render(
        <IntervalToggle isAnnual={false} onToggle={onToggle} />
      );

      expect(view.getByText('Mensual')).toBeTruthy();
      await fireEvent.press(view.getByText(/Anual/));
      expect(onToggle).toHaveBeenCalledWith(true);
    });
  });

  describe('StepIndicator', () => {
    it('renders steps with current active index', async () => {
      const steps = [
        { key: 'loc', label: 'Ubicación' },
        { key: 'details', label: 'Detalles' },
        { key: 'pay', label: 'Pago' },
      ];
      const view = await render(
        <StepIndicator steps={steps} currentStepIndex={1} />
      );

      expect(view.getByText('Ubicación')).toBeTruthy();
      expect(view.getByText('Detalles')).toBeTruthy();
      expect(view.getByText('Pago')).toBeTruthy();
    });
  });

  describe('FilterChips', () => {
    it('renders chips and handles selection', async () => {
      const onSelect = jest.fn();
      const items = [
        { key: 'all', label: 'Todos' },
        { key: 'repairs', label: 'Reparaciones' },
      ];
      const view = await render(
        <FilterChipsRow items={items} selectedKey="all" onSelect={onSelect} />
      );

      expect(view.getByText('Todos')).toBeTruthy();
      expect(view.getByText('Reparaciones')).toBeTruthy();

      await fireEvent.press(view.getByText('Reparaciones'));
      expect(onSelect).toHaveBeenCalledWith('repairs');
    });
  });

  describe('StatusBanner', () => {
    it('renders success, error, warning, info and brand banners', async () => {
      const onAction = jest.fn();
      const view = await render(
        <StatusBanner
          title="Operación exitosa"
          description="Tu perfil fue actualizado"
          variant="success"
          actionLabel="Ver"
          onAction={onAction}
        />
      );

      expect(view.getByText('Operación exitosa')).toBeTruthy();
      expect(view.getByText('Tu perfil fue actualizado')).toBeTruthy();
      expect(view.getByText('Ver')).toBeTruthy();

      await fireEvent.press(view.getByText('Ver'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Skeleton', () => {
    it('renders skeleton and card skeleton without crashing', async () => {
      const view = await render(
        <>
          <Skeleton testID="skel" width={100} height={20} />
          <CardSkeleton />
        </>
      );

      expect(view.getByTestId('skel')).toBeTruthy();
    });
  });
});
