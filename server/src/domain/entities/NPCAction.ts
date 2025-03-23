export class NPCAction {
    constructor(
        public id: string,
        public description: string,
        public timestamp: Date = new Date()
    ) { }
}