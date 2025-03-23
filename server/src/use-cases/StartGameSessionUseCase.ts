import { GameSession } from '../domain/entities/GameSession';
import { Player } from '../domain/entities/Player';
import { NPC } from '../domain/entities/NPC';
import { v4 as uuidv4 } from 'uuid';
import { GameRepository } from '../repositories/GameRepository';
import { GameSessionRepository } from '../repositories/GameSessionRepository';
import { GameSessionProfile } from '../domain';

export class StartGameSessionUseCase {
    constructor(
        private gameRepository: GameRepository,
        private gameSessionRepository: GameSessionRepository
    ) { }

    async execute(gameId: string, npcs: NPC[]): Promise<GameSession> {
        const game = await this.gameRepository.getGameById(gameId);
        if (!game) {
            throw new Error('Game not found');
        }

        

        const sessionProfile = {
            gameBackstory: game.backstory,
            instructions: 'Follow the game rules and storyline carefully.',
            rules: game.rules,
            maps: game.maps,
            players: players
        } as unknown as GameSessionProfile;

        const sessionId = uuidv4();
        const session = new GameSession(sessionId, game, sessionProfile, npcs, true);
        await this.gameSessionRepository.saveSession(session);
        return session;
    }
}
