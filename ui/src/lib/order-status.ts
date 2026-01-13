import type { apiClient } from '@/utils/orpc';

type Order = Awaited<ReturnType<typeof apiClient.getAllOrders>>['orders'][0];
export type OrderStatus = Order['status'];

export const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  draft_created: 'Awaiting Payment',
  payment_pending: 'Payment Processing',
  paid: 'Payment Received',
  paid_pending_fulfillment: 'Processing Order',
  payment_failed: 'Payment Failed',
  expired: 'Session Expired',
  processing: 'Processing',
  on_hold: 'On Hold',
  shipped: 'Shipped',
  delivered: 'Delivered',
  returned: 'Returned',
  cancelled: 'Cancelled',
  partially_cancelled: 'Partially Cancelled',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  draft_created: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  payment_pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  paid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  paid_pending_fulfillment: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  payment_failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  on_hold: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  shipped: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  returned: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  partially_cancelled: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

export function getStatusLabel(status: OrderStatus): string {
  return statusLabels[status];
}

export function getStatusColor(status: OrderStatus): string {
  return statusColors[status];
}
