import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('[DevTrace Socket.IO] Connected to live backend at', SOCKET_URL);
});

socket.on('disconnect', () => {
  console.log('[DevTrace Socket.IO] Disconnected from backend');
});

