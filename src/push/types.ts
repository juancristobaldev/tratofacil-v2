export type PushType =
  | 'TRATO_DIRECTO_CREATED'
  | 'COTIZACION_RECIBIDA'
  | 'CONTRAOFERTA_RECIBIDA'
  | 'CONTRAOFERTA_ACEPTADA'
  | 'CONTRAOFERTA_RECHAZADA'
  | 'PAGO_CONFIRMADO'
  | 'PROVIDER_EN_CAMINO'
  | 'PROVEEDOR_POR_LLEGAR'
  | 'PROVEEDOR_LLEGO'
  | 'SERVICIO_INICIADO'
  | 'SERVICIO_COMPLETADO'
  | 'TRATO_CANCELADO'
  | 'TRATO_RECHAZADO'
  | 'NUEVO_MENSAJE'
  | 'NUEVA_VALORACION'
  | 'SOLICITUD_CONTACTO';

export interface PushPayload {
  type: PushType;
  orderId: number;
  title: string;
  body: string;
  deepLink?: string;
  channelId?: string;
  clientName?: string;
  providerName?: string;
  serviceName?: string;
  senderName?: string;
  amount?: number;
  rating?: number;
  distanceMeters?: number;
  action?: string;
}

export interface PushAction {
  action: string;
  data: Record<string, any>;
}
