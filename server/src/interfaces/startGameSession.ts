import { Neo4jGameRepository } from "../infrastructure/neo4j/Neo4jGameRepository";
import { Neo4jGameSessionRepository } from "../infrastructure/neo4j/Neo4jGameSessionRepository";
import { StartGameSessionUseCase } from "../use-cases";

const gameRepository = new Neo4jGameRepository();
const sessionRepository = new Neo4jGameSessionRepository();

export const handleRequest = async (payload: any): Promise<any | null> => {
    const { gameId, players, npcs } = payload;
    const startGameSessionUseCase = new StartGameSessionUseCase(gameRepository, sessionRepository);
    const session = await startGameSessionUseCase.execute(gameId, players, npcs);

    return session;
}