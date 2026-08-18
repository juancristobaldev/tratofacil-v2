/**
 * Confirmation-flow state for a single normal-payment return.
 * Deliberately separate from RealtimeOrderStatus — payment confirmation and
 * realtime order domain state are two different state machines.
 */
export type PaymentConfirmationState =
  | 'IDLE'
  | 'RECEIVED'
  | 'CONFIRMING'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED';
