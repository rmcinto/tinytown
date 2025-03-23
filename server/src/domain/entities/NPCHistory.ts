import { NPCAction } from './NPCAction';

export class NPCHistory {
    constructor(
        public summary: string,
        public recentActions: NPCAction[] = []
    ) { }

    addAction(action: NPCAction) {
        this.recentActions.push(action);
        // Optionally update summary based on new actions.
    }
}
