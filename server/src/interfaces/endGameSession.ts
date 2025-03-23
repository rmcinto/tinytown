import { Neo4jGameSessionRepository } from "../infrastructure/neo4j/Neo4jGameSessionRepository";
import { EndGameSessionUseCase } from "../use-cases";

const sessionRepository = new Neo4jGameSessionRepository();

export const handleRequest = async (payload: any): Promise<any | null> => {
    const sessionId = payload;
    const endGameSessionUseCase = new EndGameSessionUseCase(sessionRepository);
    await endGameSessionUseCase.execute(sessionId);

    return true;
}