import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const SocketContext = createContext(null);

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const listenersRef = useRef(new Map());

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setConnected(true);
      console.log('[Socket] Connected');
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      // If auth error, try refreshing token from localStorage
      if (err.message?.includes('auth') || err.message?.includes('jwt') || err.message?.includes('token')) {
        const freshToken = localStorage.getItem('token');
        if (freshToken && freshToken !== socket.auth.token) {
          socket.auth.token = freshToken;
          socket.connect();
        }
      }
    });

    // Real-time notification handlers
    socket.on('notification:generic', (data) => {
      toast(data.title, { description: data.message });
      setUnreadCount((c) => c + 1);
    });

    socket.on('notification:new_message', (data) => {
      toast('New Message', { description: data.data?.subject || 'You have a new message' });
      setUnreadCount((c) => c + 1);
    });

    socket.on('notification:new_task', (data) => {
      toast('New Task', { description: data.data?.title || 'A new task was created' });
    });

    socket.on('notification:task_assigned', (data) => {
      toast('Task Assigned', { description: data.data?.title || 'A task was assigned to you' });
      setUnreadCount((c) => c + 1);
    });

    socket.on('notification:invoice_paid', (data) => {
      toast.success('Invoice Paid', { description: `Invoice ${data.data?.invoice_number || ''} has been paid` });
      setUnreadCount((c) => c + 1);
    });

    socket.on('notification:new_client', (data) => {
      toast('New Client', { description: data.data?.name || 'A new client was added' });
    });

    socket.on('notification:project_update', (data) => {
      toast('Project Update', { description: data.data?.title || 'A project was updated' });
    });

    socket.on('notification:ticket_update', (data) => {
      toast('Ticket Update', { description: data.data?.subject || 'A ticket was updated' });
      setUnreadCount((c) => c + 1);
    });

    socket.on('notification:deal_moved', (data) => {
      toast('Deal Moved', { description: `${data.data?.name || 'A deal'} moved to ${data.data?.stage || 'new stage'}` });
    });

    socket.on('notification:chat_message', (data) => {
      toast('Chat Message', { description: data.data?.content || 'New chat widget message' });
      setUnreadCount((c) => c + 1);
    });

    socket.on('notification:count', (data) => {
      setUnreadCount(data.count || 0);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, user?.id]);

  const joinRoom = (room) => {
    socketRef.current?.emit('join:room', room);
  };

  const leaveRoom = (room) => {
    socketRef.current?.emit('leave:room', room);
  };

  const on = (event, callback) => {
    socketRef.current?.on(event, callback);
    // Track for cleanup
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(callback);
  };

  const off = (event, callback) => {
    socketRef.current?.off(event, callback);
    listenersRef.current.get(event)?.delete(callback);
  };

  const emit = (event, data) => {
    socketRef.current?.emit(event, data);
  };

  const value = {
    socket: socketRef.current,
    connected,
    unreadCount,
    setUnreadCount,
    joinRoom,
    leaveRoom,
    on,
    off,
    emit,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
