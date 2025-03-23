// src/domain/entities/Game.ts

export interface Coordinates {
    x: number;
    y: number;
    z?: number; // optional z coordinate for 3D positioning
}

export type MapObjectType = 'building' | 'artifact' | 'npc' | 'interactable' | string;

export interface MapObject {
    mapObjectId: string; // Unique identifier for the map object
    name: string;
    type: MapObjectType;
    entityId: string; // The id of the actual building, artifact, or NPC entity
    coordinates: Coordinates;
}

export interface MapSize {
    width: number;
    height: number;
}

export interface GameMap {
    mapSize: MapSize;
    objects: MapObject[];
}

export class Game {
    constructor(
        public gameId: string,
        public title: string,
        public backstory: string,
        public rules: string[],  // Array of game rules
        public maps: GameMap[]   // Array of maps
    ) { }
}
