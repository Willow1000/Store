import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  const secure = isSecureRequest(req);
  // For cross-site flows (OAuth, third-party payments) browsers require
  // `SameSite=None` **and** `Secure=true`. On local dev (insecure) setting
  // SameSite=None without Secure will cause browsers to reject the cookie,
  // which results in the user appearing signed-out after redirects.
  // Use `lax` for non-secure requests so cookies remain available on reloads
  // and after navigations that are same-site, and use `none` when the
  // connection is secure so cross-site flows continue to work in production.
  const sameSite: CookieOptions['sameSite'] = secure ? 'none' : 'lax';

  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure,
  };
}
