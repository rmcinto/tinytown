import React from 'react';
import { createRoot } from 'react-dom/client';
import ChessGame from './components/ChessGame/ChessGame';
import './index.scss';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <ChessGame />
        </React.StrictMode>
    );
}

