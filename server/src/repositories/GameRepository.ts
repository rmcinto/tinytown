import { Game } from '../domain/entities/Game';

export interface GameRepository {
    saveGame(game: Game): Promise<void>;
    getGameById(id: string): Promise<Game | null>;
}
