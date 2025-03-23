import { GameSessionRepository } from '../repositories/GameSessionRepository';
import { AIProvider } from '../domain/ports/AIProvider';
import { NPCAction } from '../domain/entities/NPCAction';

export class GetNPCNextActionUseCase {
    constructor(
        private gameSessionRepository: GameSessionRepository,
        private aiProvider: AIProvider
    ) { }

    async execute(sessionId: string, npcId: string): Promise<NPCAction> {
        const session = await this.gameSessionRepository.getSessionById(sessionId);
        if (!session) {
            throw new Error('Game session not found');
        }

        const npc = session.npcs.find(n => n.id === npcId);
        if (!npc) {
            throw new Error('NPC not found in session');
        }

        const prompt = {
            sessionProfile: session.sessionProfile,
            npcProfile: npc.profile,
            npcHistory: npc.history
        };

        const nextAction = await this.aiProvider.getNextAction(prompt);
        return nextAction;
    }
}
