import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') 
  : 'http://localhost:5000';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect if there is a logged in user
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(SOCKET_URL);

    newSocket.on('connect', () => {
      console.log('[Socket] Connected');
      // Join a private room for this specific user
      newSocket.emit('join_room', `user_${user.id}`);
      
      // Join a role-based room (e.g. role_teacher)
      if (user.role) {
        newSocket.emit('join_room', `role_${user.role}`);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
