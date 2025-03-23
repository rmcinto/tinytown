import { GameSession } from '../domain/entities/GameSession';

export interface GameSessionRepository {
    saveSession(session: GameSession): Promise<void>;
    getSessionById(id: string): Promise<GameSession | null>;
}
