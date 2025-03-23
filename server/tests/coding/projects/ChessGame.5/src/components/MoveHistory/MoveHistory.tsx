import React, { useEffect, useState } from 'react';
import useSocket from '../../hooks/useSocket';
import './MoveHistory.scss';

interface MoveHistoryProps {
  gameId: string;
}

const MoveHistory: React.FC<MoveHistoryProps> = ({ gameId }) => {
  const [moves, setMoves] = useState<string[]>([]);
  const socket = useSocket();

  useEffect(() => {
    if (socket) {
      const moveHandler = (moveData: { from: [number, number], to: [number, number] }) => {
        const { from, to } = moveData;
        const moveStr = ;
        setMoves(prevMoves => [...prevMoves, moveStr]);
      };
      socket.on('move', moveHandler);
      return () => {
        socket.off('move', moveHandler);
      };
    }
  }, [socket]);

  return (
    <div className="move-history">
      <h3>Move History</h3>
      <ul>
        {moves.map((move, index) => (
          <li key={index}>{move}</li>
        ))}
      </ul>
    </div>
  );
};

export default MoveHistory;
