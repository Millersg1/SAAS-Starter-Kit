import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

// Store connected users: userId -> socketId
const connectedUsers = new Map();

/**
 * Initialize WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
export const setupWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.user.id} (Socket: ${socket.id}) - websocket.js:42`);
    
    // Store user connection
    connectedUsers.set(socket.user.id, socket.id);
    
    // Join user's personal room for targeted notifications
    socket.join(`user:${socket.user.id}`);

    // Join brand rooms for team notifications
    if (socket.user.brandId) {
      socket.join(`brand:${socket.user.brandId}`);
    }

    // Handle joining specific rooms
    socket.on('join:room', (room) => {
      socket.join(room);
      console.log(`📥 Socket ${socket.id} joined room: ${room} - websocket.js:58`);
    });

    // Handle leaving rooms
    socket.on('leave:room', (room) => {
      socket.leave(room);
      console.log(`📤 Socket ${socket.id} left room: ${room} - websocket.js:64`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔌 User disconnected: ${socket.user.id} (Reason: ${reason}) - websocket.js:69`);
      connectedUsers.delete(socket.user.id);
    });

    // Handle ping for connection status
    socket.on('ping:server', (callback) => {
      if (callback) callback({ status: 'ok', timestamp: Date.now() });
    });
  });

  console.log('✅ WebSocket server initialized - websocket.js:79');
  
  return io;
};

/**
 * Get Socket.io instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
};

/**
 * Send notification to a specific user
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {any} data - Data to send
 */
export const sendToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

/**
 * Send notification to all users in a brand
 * @param {string} brandId - Brand ID
 * @param {string} event - Event name
 * @param {any} data - Data to send
 */
export const sendToBrand = (brandId, event, data) => {
  if (!io) return;
  io.to(`brand:${brandId}`).emit(event, data);
};

/**
 * Send notification to all connected users
 * @param {string} event - Event name
 * @param {any} data - Data to send
 */
export const broadcast = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

/**
 * Check if user is online
 * @param {string} userId - User ID
 */
export const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

/**
 * Get count of connected users
 */
export const getConnectedUserCount = () => {
  return connectedUsers.size;
};

/**
 * Emit notification helper for various events
 */
export const emitNotification = {
  // New message notification
  newMessage: (userId, message) => {
    sendToUser(userId, 'notification:new_message', {
      type: 'new_message',
      data: message,
      timestamp: new Date().toISOString()
    });
  },

  // New task notification
  newTask: (brandId, task) => {
    sendToBrand(brandId, 'notification:new_task', {
      type: 'new_task',
      data: task,
      timestamp: new Date().toISOString()
    });
  },

  // Task assigned notification
  taskAssigned: (userId, task) => {
    sendToUser(userId, 'notification:task_assigned', {
      type: 'task_assigned',
      data: task,
      timestamp: new Date().toISOString()
    });
  },

  // Invoice paid notification
  invoicePaid: (brandId, invoice) => {
    sendToBrand(brandId, 'notification:invoice_paid', {
      type: 'invoice_paid',
      data: invoice,
      timestamp: new Date().toISOString()
    });
  },

  // New client notification
  newClient: (brandId, client) => {
    sendToBrand(brandId, 'notification:new_client', {
      type: 'new_client',
      data: client,
      timestamp: new Date().toISOString()
    });
  },

  // Project update notification
  projectUpdate: (brandId, update) => {
    sendToBrand(brandId, 'notification:project_update', {
      type: 'project_update',
      data: update,
      timestamp: new Date().toISOString()
    });
  },

  // Ticket update notification
  ticketUpdate: (userId, ticket) => {
    sendToUser(userId, 'notification:ticket_update', {
      type: 'ticket_update',
      data: ticket,
      timestamp: new Date().toISOString()
    });
  },

  // Generic notification
  generic: (userId, title, message, type = 'info') => {
    sendToUser(userId, 'notification:generic', {
      type,
      title,
      message,
      timestamp: new Date().toISOString()
    });
  }
};

export default {
  setupWebSocket,
  getIO,
  sendToUser,
  sendToBrand,
  broadcast,
  isUserOnline,
  getConnectedUserCount,
  emitNotification
};
