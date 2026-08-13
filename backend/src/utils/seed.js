import "dotenv/config";
import mongoose from "mongoose";

import { connectDB } from "../config/db.js";
import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Settings from "../models/Settings.js";
import User from "../models/User.js";

const monthLabel = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" });

const ORDERS = [
  ["CGS-ORD-0001","2025-12-08","Corporate gift boxes for annual dinner (150 pcs)","Ahmed Raza","+92 300 1234567",450000,"Corporate Gifting",
    [["Production","Gift box production",180000],["Printing","Branded printing",40000],["Delivery","Courier & delivery",22000]]],
  ["CGS-ORD-0002","2025-12-22","Branded diaries & pens bundle","Sana Malik","+92 301 7654321",185000,"Corporate Gifting",
    [["Production","Diaries & pens procurement",95000],["Packaging","Packaging material",12000]]],
  ["CGS-ORD-0003","2026-01-14","Annual sales kickoff event management","Bilal Khan","+92 322 4455667",920000,"Corporate Event Planning",
    [["Event","Venue & stage setup",420000],["Staff","Event staff",85000],["Transport","Logistics",35000]]],
  ["CGS-ORD-0004","2026-02-05","Website redesign & SEO package","Hina Tariq","+92 333 9988776",350000,"Digital Solution",
    [["Staff","Design & development team",150000],["Marketing","SEO tools & ads",35000]]],
  ["CGS-ORD-0005","2026-03-11","Ramadan gift hampers (300 pcs)","Usman Sheikh","+92 345 1122334",1250000,"Corporate Gifting",
    [["Production","Hamper production",560000],["Packaging","Premium packaging",120000],["Delivery","Nationwide delivery",75000]]],
  ["CGS-ORD-0006","2026-04-19","Product launch event setup","Zara Ali","+92 311 5566778",680000,"Corporate Event Planning",
    [["Event","Launch setup & AV",300000],["Marketing","Promotional material",60000]]],
  ["CGS-ORD-0007","2026-05-09","Social media management retainer","Faisal Iqbal","+92 302 2233445",240000,"Digital Solution",
    [["Staff","Content & ads management",90000]]],
  ["CGS-ORD-0008","2026-06-02","Executive welcome kits (80 pcs)","Nida Aslam","+92 321 8877665",320000,"Corporate Gifting",
    [["Production","Welcome kit items",140000],["Printing","Custom branding",25000]]],
];

const INVOICES = [
  ["CGS-INV-0001","2025-12-09","Approved","Corporate Gifting","Ahmed Raza","Meezan Technologies","+92 300 1234567","ahmed@meezantech.com","Plot 45, Blue Area, Islamabad",15000,0,true,18,[["Premium Corporate Gift Box",150,3000]]],
  ["CGS-INV-0002","2026-01-16","Approved","Corporate Event Planning","Bilal Khan","Horizon Foods","+92 322 4455667","bilal@horizonfoods.pk","Gulberg III, Lahore",0,25000,true,18,[["Annual Sales Kickoff Event Management",1,920000]]],
  ["CGS-INV-0003","2026-02-07","Pending","Digital Solution","Hina Tariq","Tariq & Sons","+92 333 9988776","hina@tariqsons.com","Clifton Block 5, Karachi",0,0,false,0,[["Website Redesign & SEO Package",1,350000]]],
  ["CGS-INV-0004","2026-03-13","Approved","Corporate Gifting","Usman Sheikh","Alpha Bank Ltd","+92 345 1122334","usman@alphabank.pk","I.I. Chundrigar Road, Karachi",45000,0,true,18,[["Ramadan Gift Hamper (Deluxe)",300,4000],["Custom Greeting Cards",500,100]]],
  ["CGS-INV-0005","2026-05-12","Declined","Digital Solution","Faisal Iqbal","Nexus Retail","+92 302 2233445","faisal@nexusretail.com","DHA Phase 6, Lahore",0,0,false,0,[["Social Media Management (3 months)",3,80000]]],
  ["CGS-INV-0006","2026-06-04","Pending","Corporate Gifting","Nida Aslam","Skyline Group","+92 321 8877665","nida@skyline.pk","F-10 Markaz, Islamabad",8000,0,true,18,[["Executive Welcome Kit",80,4000]]],
];

async function seed() {
  await connectDB();

  const username = process.env.ADMIN_USERNAME || "CGS123";
  const password = process.env.ADMIN_PASSWORD || "Cgs@Global1ok";

  await Settings.deleteMany({});
  await Settings.create({ key: "default" });
  console.log("[seed] settings ready");

  const existing = await User.findOne({ username });
  if (existing) {
    console.log(`[seed] admin "${username}" already exists — left untouched`);
  } else {
    await User.create({ username, password, role: "admin" });
    console.log(`[seed] admin created: ${username}`);
  }

  await Order.deleteMany({});
  await Order.insertMany(
    ORDERS.map(([order_code, order_date, details, contact_person, contact_number, total_amount, service, expenses]) => ({
      order_code,
      order_date,
      details,
      contact_person,
      contact_number,
      total_amount,
      tax: 0,
      month: monthLabel(order_date),
      service,
      notes: "",
      expenses: expenses.map(([category, description, amount]) => ({ category, description, amount })),
    })),
  );
  console.log(`[seed] ${ORDERS.length} orders inserted`);

  await Invoice.deleteMany({});
  await Invoice.insertMany(
    INVOICES.map(([invoice_number, invoice_date, status, service, to_contact_person, to_company, to_phone, to_email, to_address, delivery_charges, other_charges, with_tax, tax_rate, items]) => {
      const invoice_items = items.map(([description, qty, unit_price], i) => ({
        sort_order: i + 1,
        description,
        qty,
        unit_price,
        total: qty * unit_price,
      }));
      const subtotal = invoice_items.reduce((s, it) => s + it.total, 0);
      const beforeTax = subtotal + delivery_charges + other_charges;
      const tax_amount = with_tax ? (beforeTax * tax_rate) / 100 : 0;
      return {
        invoice_number,
        invoice_date,
        status,
        service,
        to_contact_person,
        to_company,
        to_phone,
        to_email,
        to_address,
        subtotal,
        delivery_charges,
        other_charges,
        with_tax,
        tax_rate,
        tax_amount,
        grand_total: beforeTax + tax_amount,
        notes: "Thank you for choosing Corporate Gifting Solution.",
        invoice_items,
      };
    }),
  );
  console.log(`[seed] ${INVOICES.length} invoices inserted`);

  await mongoose.connection.close();
  console.log("[seed] done");
}

seed().catch(async (error) => {
  console.error("[seed] failed:", error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
