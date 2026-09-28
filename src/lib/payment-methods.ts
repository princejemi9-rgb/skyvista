export type PaymentMethodId='paystack'|'bank_transfer'|'bitcoin';
export type PaymentStatus='unpaid'|'pending'|'awaiting_verification'|'paid'|'rejected'|'refunded'|'failed';
export const paymentStatusLabel:Record<PaymentStatus,string>={unpaid:'Unpaid',pending:'Pending',awaiting_verification:'Awaiting verification',paid:'Paid',rejected:'Rejected',refunded:'Refunded',failed:'Failed'};
