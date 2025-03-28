import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

const useSocket = (): Socket | null => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
};

export default useSocket;
