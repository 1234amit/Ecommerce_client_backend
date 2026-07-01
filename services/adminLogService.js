import AdminLog from "../models/AdminLog.js";
import socketService from "./socketService.js";

const MAX_LOG_MESSAGE_LENGTH = 500;

const getIp = (req) =>
  String(req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || "").trim();

const isSuspiciousPath = (path = "") =>
  /\.\.|wp-admin|phpmyadmin|\.env|<script|union\s+select|\/etc\/passwd/i.test(path);

const getLogLevel = ({ statusCode, path }) => {
  if (isSuspiciousPath(path) || [401, 403, 429].includes(statusCode)) {
    return "vulnerability";
  }
  if (statusCode >= 500) return "error";
  if (statusCode >= 400) return "warning";
  return "info";
};

export const createAdminLog = async (payload = {}) => {
  try {
    const log = await AdminLog.create({
      ...payload,
      message: String(payload.message || "System log").slice(0, MAX_LOG_MESSAGE_LENGTH),
    });

    if (["warning", "error", "vulnerability"].includes(log.level)) {
      socketService.io?.to("admin_room").emit("admin_log_created", {
        log,
      });
    }

    return log;
  } catch {
    return null;
  }
};

export const adminRequestLogger = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const statusCode = res.statusCode;
    if (statusCode < 400 && !isSuspiciousPath(req.originalUrl)) return;

    const level = getLogLevel({ statusCode, path: req.originalUrl });

    createAdminLog({
      level,
      category: level === "vulnerability" ? "security" : "http",
      message: `${req.method} ${req.originalUrl} returned ${statusCode}`,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      ipAddress: getIp(req),
      user: req.user?._id || req.user?.id || null,
      userRole: req.user?.role || "",
      userAgent: req.headers["user-agent"] || "",
      meta: {
        durationMs: Date.now() - startedAt,
      },
    });
  });

  next();
};

export const getAdminLogs = async ({ tab = "all", range = "week", limit = 100 }) => {
  const now = new Date();
  const since = new Date(now);

  if (range === "year") since.setFullYear(now.getFullYear() - 1);
  else if (range === "month") since.setMonth(now.getMonth() - 1);
  else since.setDate(now.getDate() - 7);

  const filter = {
    createdAt: { $gte: since },
  };

  if (tab === "vulnerabilities") {
    filter.level = "vulnerability";
  }

  const logs = await AdminLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 100, 500))
    .lean();

  const counts = await AdminLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$level", count: { $sum: 1 } } },
  ]);

  return {
    logs,
    summary: counts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
  };
};
