import React, { useState } from 'react';
import ChessBoard from './components/ChessBoard/ChessBoard';
import MoveHistory from './components/MoveHistory/MoveHistory';
import useSocket from './hooks/useSocket';

const App: React.FC = () => {
  const [gameId, setGameId] = useState('');
  const [joined, setJoined] = useState(false);
  const socket = useSocket();

  const handleJoin = () => {
    if (socket && gameId.trim() !== '') {
      socket.emit('joinGame', gameId);
      setJoined(true);
    }
  };

  const handleCreateGame = () => {
    const newGameId = Math.random().toString(36).substring(2, 10);
    setGameId(newGameId);
    if (socket) {
      socket.emit('joinGame', newGameId);
      setJoined(true);
    }
  };

  return (
    <div className='app'>
      {joined ? (
        <div className="game-container">
          <ChessBoard gameId={gameId} />
          <MoveHistory gameId={gameId} />
        </div>
      ) : (
        <div className='lobby'>
          <h2>Welcome to Chess Game</h2>
          <div>
            <input
              type='text'
              placeholder='Enter Game ID to join'
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
            />
            <button onClick={handleJoin}>Join Game</button>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button onClick={handleCreateGame}>Create New Game</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
