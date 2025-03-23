import { Chess } from 'chess.js';

export default class ChessLogic {
  private chess = new Chess();

  public getMoves() {
    return this.chess.moves();
  }

  public makeMove(from: string, to: string) {
    const moveResult = this.chess.move({ from, to });
    return moveResult !== null;
  }
}
