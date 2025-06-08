import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.userId);

    // Join a room with the user's ID for private messages
    socket.join(socket.userId);

    // Handle notification read status
    socket.on('mark_notification_read', async (notificationId) => {
      try {
        // You can implement the logic to mark notification as read here
        // This will be handled by your existing markNotificationAsRead function
        console.log('Notification marked as read:', notificationId);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.userId);
    });
  });

  return io;
}; 