export type PushType =
  | 'TRATO_DIRECTO_CREATED'
  | 'COTIZACION_RECIBIDA'
  | 'CONTRAOFERTA_RECIBIDA'
  | 'CONTRAOFERTA_ACEPTADA'
  | 'CONTRAOFERTA_RECHAZADA'
  | 'PAGO_CONFIRMADO'
  | 'PROVIDER_EN_CAMINO'
  | 'PROVEEDOR_LLEGO'
  | 'SERVICIO_COMPLETADO'
  | 'TRATO_CANCELADO'
  | 'NUEVO_MENSAJE';

export interface PushPayload {
  type: PushType;
  orderId: number;
  title: string;
  body: string;
  deepLink?: string;
  clientName?: string;
  providerName?: string;
  serviceName?: string;
  amount?: number;
}

export interface PushAction {
  action: string;
  data: Record<string, any>;
}
