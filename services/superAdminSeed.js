import bcrypt from "bcryptjs";
import User from "../models/User.js";

const SUPERADMIN_PHONE = process.env.SUPERADMIN_PHONE;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;

export const ensureSuperAdmin = async () => {
  if (!SUPERADMIN_PHONE || !SUPERADMIN_PASSWORD) {
    return null;
  }

  const existingAdmin = await User.findOne({ phone: SUPERADMIN_PHONE }).select("+password");

  if (existingAdmin) {
    let changed = false;

    if (existingAdmin.role !== "superadmin") {
      existingAdmin.role = "superadmin";
      changed = true;
    }

    if (existingAdmin.status !== "approved") {
      existingAdmin.status = "approved";
      changed = true;
    }

    const passwordMatches = await bcrypt.compare(SUPERADMIN_PASSWORD, existingAdmin.password || "");
    if (!passwordMatches) {
      existingAdmin.password = SUPERADMIN_PASSWORD;
      changed = true;
    }

    if (changed) {
      await existingAdmin.save();
    }

    return existingAdmin;
  }

  const superAdmin = await User.create({
    name: "Super Admin",
    phone: SUPERADMIN_PHONE,
    password: SUPERADMIN_PASSWORD,
    role: "superadmin",
    status: "approved",
  });

  return superAdmin;
};
