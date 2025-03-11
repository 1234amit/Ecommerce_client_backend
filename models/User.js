import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Define the user schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      //   required: true,
      trim: true,
    },
    email: {
      type: String,
      //   required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      //   required: true,
      unique: true,
    },
    nid: {
      type: String,
      //   required: true,
      unique: true,
    },
    division: {
      type: String,
      //   required: true,
    },
    district: {
      type: String,
      //   required: true,
    },
    thana: {
      type: String,
      //   required: true,
    },
    address: {
      type: String,
      //   required: true,
    },
    tradelicense: {
      type: String,
      //   required: true,
      unique: true,
    },
    password: {
      type: String,
      //   required: true,
    },
    role: {
      type: String,
      enum: ["admin", "consumer", "producer", "supersaler", "wholesaler"],
      default: "consumer", // Default role is "user"
    },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "approved", // Default for non-supersalers
    },
  },
  { timestamps: true }
);

// Hash password before saving, but only if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Only hash if the password is modified
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
