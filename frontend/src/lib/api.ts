//backend URL: set VITE_API_URL for deployed builds; the localhost fallback is for `npm run dev` only
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "")
).replace(/\/+$/, "");

//pages that only make sense when logged in
const PROTECTED_PATHS = ["/dashboard", "/profile", "/study-plan", "/friends"];
//login/register also return 401 for bad credentials, which is not an expired session
const AUTH_PATHS = ["/api/auth/login", "/api/auth/register"];

//the backend rejected our token: drop it, tell the app, and send protected pages to login
function handleRejectedToken(sentToken: string | null | undefined) {
  //only clear if it is still the token we sent (avoids wiping a newer login)
  if (!sentToken || localStorage.getItem("focusage-token") !== sentToken) return;
  localStorage.removeItem("focusage-token");
  window.dispatchEvent(new Event("focusage-auth-change"));
  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
  if (PROTECTED_PATHS.includes(currentPath)) {
    window.location.assign("/login?expired=1");
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { authToken?: string | null } = {}
): Promise<T> {
  const { authToken, ...requestOptions } = options;
  //start with any headers supplied by the caller
  const headers = new Headers(requestOptions.headers);

  if (
    requestOptions.body &&
    !(requestOptions.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  //attaching jwt if user has logged in
  const token = authToken === undefined ? localStorage.getItem("focusage-token") : authToken;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  //send req to BE
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    { ...requestOptions, headers }
  );

  if (response.status === 204) { //success
    return undefined as T;
  }

  const data: unknown = await response.json().catch(() => null); //reading res

  //rurn http errors into js errors
  if (!response.ok) {
    if (response.status === 401 && !AUTH_PATHS.includes(path)) {
      handleRejectedToken(token);
    }

    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : `Request failed (${response.status})`;

    throw new Error(message);
  }

  return data as T;
}
