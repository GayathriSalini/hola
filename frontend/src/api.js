import { API } from "./config";

async function request(path, options) {
  const res = await fetch(`${API}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

const post = (path, body) =>
  request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const login = (username, password) => post("/login", { username, password });
export const register = (name, username, password) => post("/register", { name, username, password });
export const addToHistory = (token, meeting_code) => post("/add_to_activity", { token, meeting_code });
export const getHistory = (token) => request(`/get_all_activity?token=${encodeURIComponent(token)}`);
export const getToken = () => localStorage.getItem("token");
export const setToken = (t) => (t ? localStorage.setItem("token", t) : localStorage.removeItem("token"));
