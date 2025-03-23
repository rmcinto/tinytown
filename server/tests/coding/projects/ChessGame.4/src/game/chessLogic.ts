function algebraicToIndices(pos: string): { row: number, col: number } {
    const col = pos.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(pos[1]);
    return { row, col };
}

export type Board = string[][];

export function createInitialBoard(): Board {
    return [
        ['bR','bN','bB','bQ','bK','bB','bN','bR'],
        ['bP','bP','bP','bP','bP','bP','bP','bP'],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['wP','wP','wP','wP','wP','wP','wP','wP'],
        ['wR','wN','wB','wQ','wK','wB','wN','wR']
    ];
}

export class ChessGame {
    board: Board;
    constructor() {
        this.board = createInitialBoard();
    }

    movePiece(from: string, to: string): boolean {
        const { row: fromRow, col: fromCol } = algebraicToIndices(from);
        const { row: toRow, col: toCol } = algebraicToIndices(to);

        const piece = this.board[fromRow][fromCol];
        if (!piece) {
            return false;
        }

        // Perform the move (basic, without advanced rule checks)
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = '';
        return true;
    }

    printBoard(): void {
        console.log(this.board.map(row => row.join(' ')).join('
'));
    }
}

