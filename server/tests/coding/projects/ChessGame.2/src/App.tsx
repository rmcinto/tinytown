import React from 'react';
import ChessBoard from './components/ChessBoard/ChessBoard';

const App: React.FC = () => {
  return (
    <div className='app'>
      <h1>Online Chess Game</h1>
      <ChessBoard />
    </div>
  );
};

export default App;
