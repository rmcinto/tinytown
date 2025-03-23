import neo4j from 'neo4j-driver';
import { Game } from '../../domain/entities/Game';
import { GameSession } from '../../domain/entities/GameSession';
import { GameSessionRepository } from '../../repositories/GameSessionRepository';
import { config } from '../../config/config';

// Use externalized configuration for connecting to Neo4J.
const driver = neo4j.driver(
    config.neo4j.uri,
    neo4j.auth.basic(config.neo4j.user, config.neo4j.password)
);

export class Neo4jGameSessionRepository implements GameSessionRepository {
    async saveSession(gameSession: GameSession): Promise<void> {
        const session = driver.session();
        try {
            await session.run(
                `MERGE (s:GameSession {id: $id}) SET s.gameId = $gameId, s.sessionProfile = $sessionProfile, s.npcs = $npcs, s.isActive = $isActive`,
                {
                    id: gameSession.gameSessionId,
                    gameId: gameSession.game.gameId,
                    sessionProfile: JSON.stringify(gameSession.sessionProfile),
                    npcs: JSON.stringify(gameSession.npcs),
                    isActive: gameSession.isActive
                }
            );
        }
        finally {
            await session.close();
        }
    }

    async getSessionById(gameSessionId: string): Promise<GameSession | null> {
        const session = driver.session();
        try {
            const result = await session.run(
                `MATCH (s:GameSession {id: $id}) RETURN s`,
                { gameSessionId }
            );
            if (result.records.length === 0) return null;
            const record = result.records[0].get('s').properties;

            const sessionProfile = JSON.parse(record.sessionProfile);
            const npcs = JSON.parse(record.npcs);

            // For simplicity, create a basic Game instance.
            const game = new Game(record.gameId, '', '', [], []);
            return new GameSession(record.id, game, sessionProfile, npcs, record.isActive);
        }
        finally {
            await session.close();
        }
    }
}
