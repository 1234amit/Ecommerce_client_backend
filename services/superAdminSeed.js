import bcrypt from "bcryptjs";
import User from "../models/User.js";

const SUPERADMIN_PHONE = "01822769722";
const SUPERADMIN_PASSWORD = "admin1234";

export const ensureSuperAdmin = async () => {
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
      console.log("Superadmin account verified and updated.");
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

  console.log("Superadmin account created.");
  return superAdmin;
};
