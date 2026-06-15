export const COOKIE_NAME = "app_session_id";
// Keep session effectively indefinite unless explicit logout.
// 100 years is used as a practical upper bound for cookie and token lifetimes.
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 365 * 100;
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
