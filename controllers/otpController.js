import User from "../models/User.js";
import { getPhoneLookupValues, sendOtp, verifyOtp } from "../services/otpService.js";

const existingUserRequiredPurposes = new Set(["login", "password-reset"]);

const validateOtpRequest = async ({ phone, purpose }) => {
  if (!phone) return "Phone number is required";
  if (!purpose) return "OTP purpose is required";

  if (existingUserRequiredPurposes.has(purpose)) {
    const user = await User.findOne({ phone: { $in: getPhoneLookupValues(phone) } });
    if (!user) return "No account found with this phone number";
  }

  if (purpose === "register") {
    const user = await User.findOne({ phone: { $in: getPhoneLookupValues(phone) } });
    if (user) return "Phone number already registered";
  }

  return "";
};

export const sendOtpCode = async (req, res) => {
  try {
    const { phone, purpose = "register" } = req.body || {};
    const validationError = await validateOtpRequest({ phone, purpose });

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
    const { phone, otp, code, purpose = "register" } = req.body || {};
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
      message: "OTP verified successfully",
      otpToken: verification.otpToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify OTP",
    });
  }
};
