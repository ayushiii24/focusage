// Use the deployed API URL when configured;
// otherwise, use our local Express server.
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Start with any headers supplied by the caller.
  const headers = new Headers(options.headers);

  // Tell Express we're sending JSON when there's a body.
  // FormData sets its own content type, including the boundary.
  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  // Attach the JWT if the user has logged in.
  const token = localStorage.getItem("focusage-token");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Send the request to our backend.
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    { ...options, headers }
  );

  // A 204 response means success with no response body.
  if (response.status === 204) {
    return undefined as T;
  }

  // Read the response safely, including unexpected non-JSON errors.
  const data: unknown = await response.json().catch(() => null);

  // Turn HTTP errors into useful JavaScript errors.
  if (!response.ok) {
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