import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import ChessBoard from '../ChessBoard/ChessBoard';
import ChessPieces from '../ChessPieces/ChessPieces';
import './ChessGame.scss';
import { createInitialBoard, Board, ChessGame as ChessGameLogic } from '../../game/chessLogic';

function indicesToAlgebraic(row: number, col: number): string {
  const file = String.fromCharCode('a'.charCodeAt(0) + col);
  const rank = (8 - row).toString();
  return file + rank;
}

const ChessGame = () => {
  const [game] = useState(new ChessGameLogic());
  const [board, setBoard] = useState<Board>(game.board);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:3000');
    socketRef.current.on('connect', () => {
      console.log('Connected to chess server:', socketRef.current?.id);
    });
    socketRef.current.on('move', (data) => {
      console.log('Received move:', data);
      const { from, to } = data;
      const moved = game.movePiece(from, to);
      if(moved){
          setBoard([...game.board]);
      }
    });
    return () => {
      socketRef.current?.disconnect();
    };
  }, [game]);

  const handleCellClick = (row: number, col: number) => {
    if (!selectedCell) {
      if (board[row][col] !== '') {
        setSelectedCell({ row, col });
      }
    } else {
      const from = indicesToAlgebraic(selectedCell.row, selectedCell.col);
      const to = indicesToAlgebraic(row, col);
      const moved = game.movePiece(from, to);
      if (moved) {
        setBoard([...game.board]);
        socketRef.current?.emit('move', { from, to });
      }
      setSelectedCell(null);
    }
  };

  return (
    <div className="chess-game">
      <ChessBoard board={board} onCellClick={handleCellClick} selectedCell={selectedCell} />
      <ChessPieces />
    </div>
  );
};

export default ChessGame;
