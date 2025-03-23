import express from 'express';
import { json } from 'body-parser';

const app = express();
const port = process.env.PORT || 3000;

app.use(json());

// Endpoint to create or join a game session
app.post('/game', (req, res) => {
  // For now, return a dummy game id
  res.json({ gameId: 'dummy-game-id' });
});

// Endpoint to get game state
app.get('/game/:id', (req, res) => {
  // In a real app, query the game state from the database
  res.json({ gameId: req.params.id, state: 'waiting for moves' });
});

app.listen(port, () => {
  console.log();
});
