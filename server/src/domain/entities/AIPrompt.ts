import { Player } from './Player';
import { NPCProfile } from './NPC';
import { NPCHistory } from './NPCHistory';

export interface GameSessionProfile {
    gameBackstory: string;
    instructions: string;
    rules: string;
    maps: string[];
    players: Player[];
}

export interface AIPrompt {
    sessionProfile: GameSessionProfile;
    npcProfile: NPCProfile;
    npcHistory: NPCHistory;
}
