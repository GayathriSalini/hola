const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Backend URL: VITE_SERVER_URL if set, otherwise localhost in development
// and the deployed Render backend in production.
export const SERVER = (
  import.meta.env.VITE_SERVER_URL ||
  (isLocal ? 'http://localhost:8000' : 'https://hola-backend-1j89.onrender.com')
).replace(/\/+$/, '')
export const API = `${SERVER}/api/v1/users`
