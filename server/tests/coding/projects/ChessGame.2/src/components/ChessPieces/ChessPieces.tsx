import React from 'react';
import './ChessPieces.scss';

// Props for individual chess piece
type ChessPieceProps = {
  type: string;
  color: 'white' | 'black';
};

// A component to display a single chess piece
const ChessPiece: React.FC<ChessPieceProps> = ({ type, color }) => {
  return <div className={}>{type}</div>;
};

export default ChessPiece;
