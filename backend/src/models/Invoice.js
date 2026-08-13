import mongoose from "mongoose";

/**
 * Line items are embedded: they are never queried independently and always
 * live and die with their invoice. This replaces the old invoice_items table
 * plus its delete-then-reinsert dance.
 */
const invoiceItemSchema = new mongoose.Schema(
  {
    sort_order: { type: Number, default: 0 },
    description: { type: String, default: "" },
    qty: { type: Number, default: 1 },
    unit_price: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: true },
);

const invoiceSchema = new mongoose.Schema(
  {
    invoice_number: { type: String, required: true, unique: true, trim: true },
    invoice_date: { type: String, required: true },
    due_date: { type: String, default: null },
    status: { type: String, enum: ["Pending", "Approved", "Declined"], default: "Pending" },
    service: { type: String, default: "Corporate Gifting" },

    from_company: { type: String, default: "CORPORATE GIFTING SOLUTION" },
    from_ntn: { type: String, default: "I230509-1" },
    from_website: { type: String, default: "www.corporategiftingsolution.com" },
    from_phone: { type: String, default: "+92 321 3121865" },
    from_email: { type: String, default: "contact@corporategiftingsolution.com" },

    to_contact_person: { type: String, default: "" },
    to_company: { type: String, default: "" },
    to_phone: { type: String, default: "" },
    to_email: { type: String, default: "" },
    to_address: { type: String, default: "" },
    to_ntn: { type: String, default: "" },

    subtotal: { type: Number, default: 0 },
    delivery_charges: { type: Number, default: 0 },
    other_charges: { type: Number, default: 0 },
    with_tax: { type: Boolean, default: false },
    tax_rate: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    grand_total: { type: Number, default: 0 },

    notes: { type: String, default: "" },
    invoice_items: { type: [invoiceItemSchema], default: [] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

invoiceSchema.index({ invoice_date: -1 });

const transform = (_doc, ret) => {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;
  if (Array.isArray(ret.invoice_items)) {
    ret.invoice_items = ret.invoice_items
      .map((item) => ({ ...item, id: item._id, _id: undefined }))
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  return ret;
};

invoiceSchema.set("toJSON", { virtuals: true, transform });

export default mongoose.model("Invoice", invoiceSchema);
