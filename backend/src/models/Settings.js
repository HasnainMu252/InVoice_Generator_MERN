import mongoose from "mongoose";

/** Single-document collection holding company/bank/invoice defaults. */
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },
    company_name: { type: String, default: "CORPORATE GIFTING SOLUTION" },
    ntn: { type: String, default: "I230509-1" },
    phone: { type: String, default: "+92 321 3121865" },
    email: { type: String, default: "contact@corporategiftingsolution.com" },
    website: { type: String, default: "www.corporategiftingsolution.com" },
    address: { type: String, default: "" },
    logo_url: { type: String, default: "" },
    bank_title: { type: String, default: "CORPORATE GIFTING SOLUTION" },
    bank_account: { type: String, default: "0578345602918" },
    bank_iban: { type: String, default: "PK24UNIL0109000345602918" },
    bank_name: { type: String, default: "UNITED BANK LIMITED" },
    invoice_prefix: { type: String, default: "CGS-INV-" },
    default_tax_rate: { type: Number, default: 18 },
    default_notes: { type: String, default: "Thank you for choosing Corporate Gifting Solution." },
  },
  { timestamps: true },
);

settingsSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Settings", settingsSchema);
