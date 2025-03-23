import { Server } from 'socket.io';
import { server } from './index';

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('move', (moveData) => {
    // Broadcast move data to all other connected clients.
    socket.broadcast.emit('move', moveData);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

export default io;
