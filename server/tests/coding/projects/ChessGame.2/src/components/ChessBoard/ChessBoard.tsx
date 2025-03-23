import React from 'react';
import ChessPiece from '../ChessPieces/ChessPieces';
import './ChessBoard.scss';

const ChessBoard: React.FC = () => {
  return (
    <div className="chess-board">
      {/* Render chess board squares and pieces here */}
      <div className="chess-square">
         {/* Example square; later this will be generated dynamically */}
         <ChessPiece type="Rook" color="white" />
      </div>
    </div>
  );
};

export default ChessBoard;
