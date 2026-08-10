export const CUSTOMER_STATUSES = ['LEAD', 'ACTIVE', 'AT_RISK'] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
