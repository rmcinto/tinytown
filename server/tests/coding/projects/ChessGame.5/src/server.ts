import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve a basic route
app.get('/', (req, res) => {
  res.send('Chess server is running');
});

// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for joining a game room
  socket.on('joinGame', (gameId) => {
    socket.join(gameId);
    console.log();
  });

  // Listen for move events
  socket.on('move', (data) => {
    // Broadcast the move to other players in the same game room
    io.to(data.gameId).emit('move', data.move);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(PORT, () => {
  console.log();
});
