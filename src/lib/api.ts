import axios from "axios";

const TOKEN_KEY = "cgs_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({
  // Empty base in dev: Vite proxies /api straight to the Express server.
  baseURL: `${import.meta.env.VITE_API_URL ?? ""}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // An expired or revoked session should drop the user at the login screen
    // rather than leaving them staring at a page of failed requests.
    if (error?.response?.status === 401 && !window.location.pathname.startsWith("/login")) {
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

/** Pulls the human-readable message out of an axios error. */
export function apiMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message ?? fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}
