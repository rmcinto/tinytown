import { AIPrompt } from '../entities/AIPrompt';
import { NPCAction } from '../entities/NPCAction';

export interface AIProvider {
    getNextAction(prompt: AIPrompt): Promise<NPCAction>;
}