import React from 'react';
import './ChessBoard.scss';

export interface ChessBoardProps {
  board: string[][];
  onCellClick: (row: number, col: number) => void;
  selectedCell?: { row: number, col: number } | null;
}

const ChessBoard: React.FC<ChessBoardProps> = ({ board, onCellClick, selectedCell }) => {
  return (
    <div className="chess-board">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="chess-row">
          {row.map((piece, colIndex) => {
            const baseClass = ((rowIndex + colIndex) % 2 === 0) ? 'white' : 'black';
            const selectedClass = (selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex) ? ' selected' : '';
            return (
              <div
                key={colIndex}
                className={}
                onClick={() => onCellClick(rowIndex, colIndex)}
              >
                {piece}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default ChessBoard;
