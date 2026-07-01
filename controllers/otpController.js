import User from "../models/User.js";
import Admin from "../models/Admin.js";
import { getPhoneLookupValues, sendOtp, verifyOtp } from "../services/otpService.js";

const existingUserRequiredPurposes = new Set(["login", "password-reset"]);
const normalizeRole = (role = "") => {
  const value = String(role || "").trim().toLowerCase();
  return value === "superseller" ? "supersaler" : value;
};

const validateOtpRequest = async ({ phone, purpose, role }) => {
  if (!phone) return "Phone number is required";
  if (!purpose) return "OTP purpose is required";

  if (existingUserRequiredPurposes.has(purpose)) {
    const lookup = { phone: { $in: getPhoneLookupValues(phone) } };
    const admin = await Admin.findOne(lookup);
    const user = admin || await User.findOne(lookup);
    if (!user) return "No account found with this phone number";
    if (purpose === "password-reset" && role) {
      const requestedRole = normalizeRole(role);
      const userRole = normalizeRole(user.role);
      if (requestedRole && requestedRole !== userRole) {
        return "Phone number and role do not match";
      }
    }
  }

  if (purpose === "register") {
    const lookup = { phone: { $in: getPhoneLookupValues(phone) } };
    const user = await User.findOne(lookup);
    const admin = await Admin.findOne(lookup);
    if (user || admin) return "Phone number already registered";
  }

  return "";
};

export const sendOtpCode = async (req, res) => {
  try {
    const { phone, purpose = "register", role } = req.body || {};
    const validationError = await validateOtpRequest({ phone, purpose, role });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    await sendOtp({ phone, purpose });
    return res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send OTP",
    });
  }
};

export const verifyOtpCode = async (req, res) => {
  try {
    const { phone, otp, code, purpose = "register", role } = req.body || {};
    const validationError = await validateOtpRequest({ phone, purpose, role });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const verification = await verifyOtp({
      phone,
      code: code || otp,
      purpose,
    });

    if (!verification.approved) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    return res.json({
      success: true,
      message: verification.fallback
        ? "OTP verified with temporary fallback code 123456"
        : "OTP verified successfully",
      otpToken: verification.otpToken,
      fallback: Boolean(verification.fallback),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify OTP",
    });
  }
};
