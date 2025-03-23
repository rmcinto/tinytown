import React from 'react';
import './ChessBoard.scss';
import ChessPieces from '../ChessPieces/ChessPieces';

const ChessBoard: React.FC = () => {
    const renderSquares = () => {
        const squares = [];
        for (let i = 0; i < 64; i++) {
            // Alternate square colors for simple demo; in a real board, use row/col logic
            squares.push(<div key={i} className='square'>{i % 2 === 0 ? '' : ''}</div>);
        }
        return squares;
    };

    return (
        <div className='chess-board'>
            {renderSquares()}
            <ChessPieces />
        </div>
    );
};

export default ChessBoard;
