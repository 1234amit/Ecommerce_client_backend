import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import User from "../models/User.js";

const SUPERADMIN_PHONE = process.env.SUPERADMIN_PHONE;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;

export const ensureSuperAdmin = async () => {
  if (!SUPERADMIN_PHONE || !SUPERADMIN_PASSWORD) {
    return null;
  }

  const existingAdmin = await Admin.findOne({ phone: SUPERADMIN_PHONE }).select("+password");

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

  const legacyAdmin = await User.findOne({ phone: SUPERADMIN_PHONE }).select("+password");

  const superAdmin = await Admin.create({
    name: legacyAdmin?.name || "Super Admin",
    phone: SUPERADMIN_PHONE,
    email: legacyAdmin?.email || undefined,
    nid: legacyAdmin?.nid || undefined,
    division: legacyAdmin?.division || undefined,
    district: legacyAdmin?.district || undefined,
    thana: legacyAdmin?.thana || undefined,
    address: legacyAdmin?.address || undefined,
    tradelicense: legacyAdmin?.tradelicense || undefined,
    image: legacyAdmin?.image || null,
    password: SUPERADMIN_PASSWORD,
    role: "superadmin",
    status: "approved",
  });

  return superAdmin;
};
