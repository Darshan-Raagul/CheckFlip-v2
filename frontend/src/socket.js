import { io } from 'socket.io-client';

// Connects to your backend server running on port 3001
const socket = io('http://localhost:3001');

export default socket;