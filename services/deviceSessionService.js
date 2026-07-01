import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import DeviceSession from "../models/DeviceSession.js";

export const SUPERADMIN_MAX_DEVICES = 3;

const clean = (value = "") => String(value || "").trim();

const hashValue = (value) =>
  crypto.createHash("sha256").update(String(value || "")).digest("hex");

const normalizeIp = (req) =>
  clean(req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || "");

const normalizeClientInfo = (value) =>
  value && typeof value === "object" ? value : {};

const getBrowserName = (parsedAgent, clientInfo) => {
  const fullVersion = Array.isArray(clientInfo.fullVersionList)
    ? clientInfo.fullVersionList.find((item) =>
        /chrome|edge|safari|firefox/i.test(item?.brand || ""),
      )
    : null;

  return [parsedAgent.browser.name, fullVersion?.version || parsedAgent.browser.version]
    .filter(Boolean)
    .join(" ");
};

const getOsName = (parsedAgent, clientInfo) => {
  const platform = clean(clientInfo.platform) || parsedAgent.os.name;
  const version = clean(clientInfo.platformVersion) || parsedAgent.os.version;
  return [platform, version].filter(Boolean).join(" ");
};

const getDeviceName = (parsedAgent, clientInfo, userAgent) => {
  const model = clean(clientInfo.model) || clean(parsedAgent.device.model);
  const vendor = clean(parsedAgent.device.vendor);
  const architecture = clean(clientInfo.architecture).toLowerCase();

  if (model && model.toLowerCase() !== "macintosh") {
    return [vendor, model].filter(Boolean).join(" ");
  }

  if (/macintosh|mac os/i.test(userAgent) || model.toLowerCase() === "macintosh") {
    return architecture.includes("arm") ? "Apple Mac (Apple Silicon)" : "Apple Mac";
  }

  if (/iphone/i.test(userAgent)) return "Apple iPhone";
  if (/ipad/i.test(userAgent)) return "Apple iPad";
  if (/android/i.test(userAgent)) return "Android device";
  if (/windows/i.test(userAgent)) return "Windows PC";
  if (/linux/i.test(userAgent)) return "Linux PC";

  return parsedAgent.device.type || "Desktop";
};

export const buildDeviceSessionMetadata = ({ req, userId }) => {
  const userAgent = clean(req.headers["user-agent"]);
  const parsedAgent = new UAParser(userAgent).getResult();
  const clientInfo = normalizeClientInfo(req.body?.deviceInfo);
  const clientDeviceId = clean(clientInfo.clientDeviceId).slice(0, 120);
  const ipAddress = normalizeIp(req);
  const browser = getBrowserName(parsedAgent, clientInfo) || "Unknown browser";
  const os = getOsName(parsedAgent, clientInfo) || "Unknown OS";
  const platform = clean(clientInfo.platform) || clean(parsedAgent.os.name);
  const architecture = clean(clientInfo.architecture);
  const screen = clean(clientInfo.screen).slice(0, 80);
  const deviceName = getDeviceName(parsedAgent, clientInfo, userAgent);
  const legacyDeviceKey = hashValue([userAgent, browser, os, ipAddress].join("|"));
  const deviceKey = clientDeviceId
    ? hashValue([userId, clientDeviceId].join("|"))
    : hashValue([userId, legacyDeviceKey].join("|"));

  return {
    deviceKey,
    legacyDeviceKey,
    clientDeviceId,
    deviceName,
    browser,
    os,
    platform,
    architecture,
    screen,
    ipAddress,
    userAgent,
    lastActiveAt: new Date(),
  };
};

const getSessionGroupKey = (session) =>
  clean(session.legacyDeviceKey) ||
  clean(session.deviceKey) ||
  (clean(session.clientDeviceId) ? `client:${session.clientDeviceId}` : "") ||
  hashValue(
    [
      session.userAgent,
      session.browser,
      session.os,
      session.ipAddress,
    ].join("|"),
  );

const isSameDevice = (session, metadata) => {
  if (metadata.deviceKey && session.deviceKey === metadata.deviceKey) return true;
  if (metadata.clientDeviceId && session.clientDeviceId === metadata.clientDeviceId) return true;
  if (metadata.legacyDeviceKey && session.legacyDeviceKey === metadata.legacyDeviceKey) return true;

  return (
    clean(session.userAgent) === metadata.userAgent &&
    clean(session.browser) === metadata.browser &&
    clean(session.os) === metadata.os &&
    clean(session.ipAddress) === metadata.ipAddress
  );
};

export const getUniqueActiveDeviceSessions = async (userId) => {
  const sessions = await DeviceSession.find({
    user: userId,
    revokedAt: null,
  }).sort({ lastActiveAt: -1 });

  const keepByGroup = new Map();
  const duplicateIds = [];

  sessions.forEach((session) => {
    const groupKey = getSessionGroupKey(session);
    if (!keepByGroup.has(groupKey)) {
      keepByGroup.set(groupKey, session);
      return;
    }
    duplicateIds.push(session._id);
  });

  if (duplicateIds.length) {
    await DeviceSession.updateMany(
      { _id: { $in: duplicateIds } },
      { $set: { revokedAt: new Date() } },
    );
  }

  return Array.from(keepByGroup.values()).sort(
    (a, b) => new Date(b.lastActiveAt || 0) - new Date(a.lastActiveAt || 0),
  );
};

export const upsertSuperadminDeviceSession = async ({ req, userId }) => {
  const metadata = buildDeviceSessionMetadata({ req, userId });
  const activeSessions = await getUniqueActiveDeviceSessions(userId);
  const existingSession = activeSessions.find((session) =>
    isSameDevice(session, metadata),
  );

  if (!existingSession && activeSessions.length >= SUPERADMIN_MAX_DEVICES) {
    return { limitExceeded: true, maxDevices: SUPERADMIN_MAX_DEVICES };
  }

  const session = existingSession || new DeviceSession({
    user: userId,
    sessionId: crypto.randomUUID(),
  });

  Object.assign(session, metadata, { revokedAt: null });
  await session.save();

  const duplicateSessions = activeSessions.filter(
    (item) => String(item._id) !== String(session._id) && isSameDevice(item, metadata),
  );

  if (duplicateSessions.length) {
    await DeviceSession.updateMany(
      { _id: { $in: duplicateSessions.map((item) => item._id) } },
      { $set: { revokedAt: new Date() } },
    );
  }

  return { session, maxDevices: SUPERADMIN_MAX_DEVICES };
};
