import { Neo4jGameSessionRepository } from '../infrastructure/neo4j/Neo4jGameSessionRepository';
import { OpenAIProvider } from '../infrastructure/openai/OpenAIProvider';
import { GetNPCNextActionUseCase } from '../use-cases/GetNPCNextActionUseCase';

export const handleRequest = async (payload: any): Promise<any | null> => {
    const { sessionId, npcId } = payload;
    const sessionRepository = new Neo4jGameSessionRepository();
    const aiProvider = new OpenAIProvider();
    const getNPCNextActionUseCase = new GetNPCNextActionUseCase(sessionRepository, aiProvider);
    const action = await getNPCNextActionUseCase.execute(sessionId, npcId);

    return action;
}