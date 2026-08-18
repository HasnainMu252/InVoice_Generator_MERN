import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    // Stored as a bcrypt hash — never the plain value.
    password: { type: String, required: true, select: false },
    full_name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    /**
     * admin — everything, including user management.
     * staff — everything except user management.
     */
    role: { type: String, enum: ["admin", "staff"], default: "staff" },
    active: { type: Boolean, default: true },
    last_login_at: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
