import express from 'express';
import cors from 'cors';
import ChessLogic from '../components/ChessLogic/ChessLogic';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Chess server is running');
});

app.get('/moves', (req, res) => {
  const logic = new ChessLogic();
  const moves = logic.getMoves();
  res.json({ moves });
});

app.post('/move', (req, res) => {
  const { from, to } = req.body;
  const logic = new ChessLogic();
  const success = logic.makeMove(from, to);
  res.json({ success });
});

const PORT = 3001;
export const server = app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});

export default app;
