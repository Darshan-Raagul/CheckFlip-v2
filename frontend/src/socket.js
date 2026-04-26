import { io } from 'socket.io-client';

// Connects to your backend server running on port 3001
const socket = io('https://checkflip-v2.onrender.com');

export default socket;
