export const COOKIE_NAME = "app_session_id";
// Session persists for 1 year (effectively indefinite until explicit logout)
// This implements the requirement: "user session must never expire unless explicitly logged out"
// Sessions are tied to refresh tokens on the server side for security
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 365;
export const ONE_YEAR_MS = SESSION_DURATION_MS;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
