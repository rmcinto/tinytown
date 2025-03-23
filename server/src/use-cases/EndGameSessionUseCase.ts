import { GameSessionRepository } from "../repositories";

export class EndGameSessionUseCase {
    constructor(private gameSessionRepository: GameSessionRepository) { }

    async execute(sessionId: string): Promise<void> {
        const session = await this.gameSessionRepository.getSessionById(sessionId);
        if (!session) {
            throw new Error('Game session not found');
        }
        session.isActive = false;
        await this.gameSessionRepository.saveSession(session);
    }
}
