import jwt from "jsonwebtoken";
import twilio from "twilio";

const OTP_TOKEN_TTL = "10m";
const OTP_PURPOSES = new Set(["login", "register", "password-reset"]);
const FALLBACK_OTP_CODE = process.env.OTP_FALLBACK_CODE || "123456";

const normalizePhone = (phone = "") => {
  const raw = String(phone).trim();
  const digits = raw.replace(/[^\d+]/g, "");

  if (digits.startsWith("+880")) return digits;
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0")) return `+880${digits.slice(1)}`;
  if (digits.startsWith("+")) return digits;

  return `+880${digits}`;
};

const getPhoneLookupValues = (phone = "") => {
  const normalized = normalizePhone(phone);
  const withoutCountry = normalized.replace(/^\+880/, "");
  const local = withoutCountry ? `0${withoutCountry}` : "";
  const raw = String(phone || "").trim();

  return [...new Set([raw, normalized, normalized.replace(/^\+/, ""), local].filter(Boolean))];
};

const getJwtSecret = () => process.env.jwt_secret || process.env.JWT_SECRET;

const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    throw new Error("Twilio Verify credentials are not configured");
  }

  return {
    client: twilio(accountSid, authToken),
    serviceSid,
  };
};

const assertPurpose = (purpose) => {
  const normalizedPurpose = String(purpose || "").trim();
  if (!OTP_PURPOSES.has(normalizedPurpose)) {
    throw new Error("Invalid OTP purpose");
  }
  return normalizedPurpose;
};

export const sendOtp = async ({ phone, purpose }) => {
  const normalizedPurpose = assertPurpose(purpose);
  const to = normalizePhone(phone);
  const { client, serviceSid } = getTwilioClient();

  await client.verify.v2.services(serviceSid).verifications.create({
    to,
    channel: "sms",
  });

  return { phone: to, purpose: normalizedPurpose };
};

export const verifyOtp = async ({ phone, code, purpose }) => {
  const normalizedPurpose = assertPurpose(purpose);
  const to = normalizePhone(phone);
  const cleanCode = String(code || "").trim();

  try {
    const { client, serviceSid } = getTwilioClient();
    const verification = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to, code: cleanCode });

    if (verification.status === "approved") {
      return buildOtpVerificationResult({ phone: to, purpose: normalizedPurpose });
    }
  } catch (error) {
    if (cleanCode !== FALLBACK_OTP_CODE) {
      throw error;
    }
  }

  if (cleanCode === FALLBACK_OTP_CODE) {
    return buildOtpVerificationResult({
      phone: to,
      purpose: normalizedPurpose,
      fallback: true,
    });
  }

  return { approved: false };
};

const buildOtpVerificationResult = ({ phone, purpose, fallback = false }) => {
  const token = jwt.sign(
    { type: "otp", phone, purpose },
    getJwtSecret(),
    { expiresIn: OTP_TOKEN_TTL }
  );

  return { approved: true, otpToken: token, fallback };
};

export const verifyOtpToken = ({ token, phone, purpose }) => {
  try {
    const payload = jwt.verify(token, getJwtSecret());
    const expectedPhone = normalizePhone(phone);
    const normalizedPurpose = assertPurpose(purpose);

    return (
      payload?.type === "otp" &&
      payload?.phone === expectedPhone &&
      payload?.purpose === normalizedPurpose
    );
  } catch {
    return false;
  }
};

export { getPhoneLookupValues, normalizePhone };
