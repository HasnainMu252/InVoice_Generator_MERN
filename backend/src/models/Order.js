import mongoose from "mongoose";

import { EXPENSE_CATEGORIES } from "../utils/calc.js";

export { EXPENSE_CATEGORIES };

/**
 * Expenses are embedded in the order. The standalone Expenses page was removed —
 * every expense is now captured inside the Order Form — so there is no longer any
 * reason for them to be a separate collection, and embedding makes the write
 * atomic (the old two-step delete+insert could lose rows on a partial failure).
 */
const orderExpenseSchema = new mongoose.Schema(
  {
    category: { type: String, enum: EXPENSE_CATEGORIES, default: "Other" },
    description: { type: String, default: "" },
    amount: { type: Number, default: 0 },
  },
  { _id: true },
);

const orderSchema = new mongoose.Schema(
  {
    order_code: { type: String, required: true, unique: true, trim: true },
    order_date: { type: String, required: true },
    details: { type: String, default: "" },
    contact_person: { type: String, default: "" },
    contact_number: { type: String, default: "" },
    total_amount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    month: { type: String, default: "" },
    service: { type: String, default: "Corporate Gifting" },
    notes: { type: String, default: "" },
    expenses: { type: [orderExpenseSchema], default: [] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

orderSchema.index({ order_date: -1 });

/** Total Expense Amount — always derived, never stored twice. */
orderSchema.virtual("expense_total").get(function expenseTotal() {
  return (this.expenses ?? []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
});

/** Total Profit Amount = Total Order Amount − Total Expense Amount. */
orderSchema.virtual("profit").get(function profit() {
  return Number(this.total_amount || 0) - this.expense_total;
});

orderSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    if (Array.isArray(ret.expenses)) {
      ret.expenses = ret.expenses.map((e) => ({ ...e, id: e._id, _id: undefined }));
    }
    return ret;
  },
});

export default mongoose.model("Order", orderSchema);
