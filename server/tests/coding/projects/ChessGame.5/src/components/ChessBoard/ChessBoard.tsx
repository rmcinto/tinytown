import React, { useState, useEffect } from 'react';
import ChessPiece from '../ChessPiece/ChessPiece';
import useSocket from '../../hooks/useSocket';
import './ChessBoard.scss';

type Piece = { type: string; color: 'white' | 'black' };

type BoardCell = Piece | 0;

const initialBoard: BoardCell[][] = [
  [
    { type: 'rook', color: 'black' }, { type: 'knight', color: 'black' }, { type: 'bishop', color: 'black' }, { type: 'queen', color: 'black' }, { type: 'king', color: 'black' }, { type: 'bishop', color: 'black' }, { type: 'knight', color: 'black' }, { type: 'rook', color: 'black' }
  ],
  [
    { type: 'pawn', color: 'black' }, { type: 'pawn', color: 'black' }, { type: 'pawn', color: 'black' }, { type: 'pawn', color: 'black' }, { type: 'pawn', color: 'black' }, { type: 'pawn', color: 'black' }, { type: 'pawn', color: 'black' }, { type: 'pawn', color: 'black' }
  ],
  new Array(8).fill(0),
  new Array(8).fill(0),
  new Array(8).fill(0),
  new Array(8).fill(0),
  [
    { type: 'pawn', color: 'white' }, { type: 'pawn', color: 'white' }, { type: 'pawn', color: 'white' }, { type: 'pawn', color: 'white' }, { type: 'pawn', color: 'white' }, { type: 'pawn', color: 'white' }, { type: 'pawn', color: 'white' }, { type: 'pawn', color: 'white' }
  ],
  [
    { type: 'rook', color: 'white' }, { type: 'knight', color: 'white' }, { type: 'bishop', color: 'white' }, { type: 'queen', color: 'white' }, { type: 'king', color: 'white' }, { type: 'bishop', color: 'white' }, { type: 'knight', color: 'white' }, { type: 'rook', color: 'white' }
  ]
];

interface ChessBoardProps {
  gameId: string;
}

const ChessBoard: React.FC<ChessBoardProps> = ({ gameId }) => {
  const [board, setBoard] = useState<BoardCell[][]>(initialBoard);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const socket = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('move', (move: { from: [number, number], to: [number, number] }) => {
        setBoard(prevBoard => {
          const newBoard = prevBoard.map(row => [...row]);
          const piece = newBoard[move.from[0]][move.from[1]];
          newBoard[move.from[0]][move.from[1]] = 0;
          newBoard[move.to[0]][move.to[1]] = piece;
          return newBoard;
        });
      });
    }
  }, [socket]);

  const handleCellClick = (rowIndex: number, cellIndex: number) => {
    const cell = board[rowIndex][cellIndex];
    if (!selected && cell !== 0) {
      setSelected({ row: rowIndex, col: cellIndex });
    } else if (selected) {
      const piece = board[selected.row][selected.col];
      if (piece !== 0) {
        setBoard(prevBoard => {
          const newBoard = prevBoard.map(row => [...row]);
          newBoard[selected.row][selected.col] = 0;
          newBoard[rowIndex][cellIndex] = piece;
          return newBoard;
        });
        if (socket) {
          socket.emit('move', { gameId, move: { from: [selected.row, selected.col], to: [rowIndex, cellIndex] } });
        }
      }
      setSelected(null);
    }
  };

  return (
    <div className="chess-board">
      {board.map((row, i) => (
        <div key={i} className="board-row">
          {row.map((cell, j) => {
            const cellColorClass = (i + j) % 2 === 0 ? 'light' : 'dark';
            const selectedClass = selected && selected.row === i && selected.col === j ? ' selected' : '';
            return (
              <div
                key={j}
                className={}
                onClick={() => handleCellClick(i, j)}
              >
                {cell !== 0 && <ChessPiece type={cell.type} color={cell.color} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default ChessBoard;
