import { Game } from './Game';
import { GameSessionProfile } from './AIPrompt';
import { NPC } from './NPC';

export class GameSession {
    constructor(
        public gameSessionId: string,
        public game: Game,
        public sessionProfile: GameSessionProfile,
        public npcs: NPC[],
        public isActive: boolean = true
    ) { }
}
