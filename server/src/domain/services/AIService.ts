import { AIPrompt } from '../entities/AIPrompt';
import { NPCAction } from '../entities/NPCAction';

export class AIService {
    // In a real implementation, you would inject an HTTP client or API wrapper.
    async getNextAction(prompt: AIPrompt): Promise<NPCAction> {
        // Build your prompt string from sessionProfile, npcProfile, and npcHistory,
        // call the ChatGPT API, and parse the response.
        // For demonstration, return a dummy action.
        return new NPCAction('action-' + Date.now(), 'NPC takes a default action');
    }
}
