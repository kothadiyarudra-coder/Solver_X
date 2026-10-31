import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? 'https://solver-x.onrender.com' : 'http://localhost:5001');

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  timeout: 5000,
});

socket.on('connect', () => {
  console.log('[DevTrace Socket.IO] Connected to backend at', SOCKET_URL);
});

socket.on('connect_error', (err) => {
  // Silent warning so frontend does not crash if backend is temporarily offline
  console.warn('[DevTrace Socket.IO] Live streaming offline:', err.message);
});

export default socket;
