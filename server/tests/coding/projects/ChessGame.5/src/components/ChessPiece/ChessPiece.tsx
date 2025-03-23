import React from 'react';
import './ChessPiece.scss';

interface ChessPieceProps {
  type: string;
  color: 'white' | 'black';
}

const ChessPiece: React.FC<ChessPieceProps> = ({ type, color }) => {
  let iconClass = '';
  switch (type) {
    case 'pawn':
      iconClass = 'fa-chess-pawn';
      break;
    case 'rook':
      iconClass = 'fa-chess-rook';
      break;
    case 'knight':
      iconClass = 'fa-chess-knight';
      break;
    case 'bishop':
      iconClass = 'fa-chess-bishop';
      break;
    case 'queen':
      iconClass = 'fa-chess-queen';
      break;
    case 'king':
      iconClass = 'fa-chess-king';
      break;
    default:
      iconClass = 'fa-question';
  }

  return (
    <i className={} style={{ color }}></i>
  );
};

export default ChessPiece;
