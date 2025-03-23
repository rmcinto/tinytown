import { Game } from '../domain/entities/Game';
import { GameRepository } from '../repositories';

export class CreateGameUseCase {
    constructor(private gameRepository: GameRepository) { }

    async execute(game: Game): Promise<void> {
        await this.gameRepository.saveGame(game);
    }
}
