import type { Order } from "@/lib/data";

/**
 * A flattened expense row, reconstructed from the expense breakdowns embedded in
 * each order. The standalone expenses collection is gone, so Dashboard and
 * Reports derive their expense views from orders instead.
 */
export type DerivedExpense = {
  id: string;
  order_id: string;
  order_code: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
};

export function flattenExpenses(orders: Order[]): DerivedExpense[] {
  return orders.flatMap((order) =>
    (order.expenses ?? []).map((expense, index) => ({
      id: expense.id ?? `${order.id}-${index}`,
      order_id: order.id,
      order_code: order.order_code,
      // An expense belongs to its order's date — that is what drives monthly reporting.
      expense_date: order.order_date,
      category: expense.category,
      description: expense.description,
      amount: Number(expense.amount ?? 0),
    })),
  );
}

export const sumExpenses = (orders: Order[]): number =>
  orders.reduce((sum, order) => sum + Number(order.expense_total ?? 0), 0);
