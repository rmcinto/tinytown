import { InventoryItem } from "./Character";
import { MapObject } from "./Map";

export interface Action {
    npcId: string;
    action: "move" | "talk" | "take" | "give" | "make";
    parameters: ActionParameters;
    reasoning: string;
    mapUpdates?: Record<string, MapUpdate>; // Optional: Updates to the map following an action.
    inventoryUpdates?: { [npcId: string]: Record<string, InventoryItem> }; // Optional: Updates to one or more NPC inventories.
    error?: string | Error;
}

// ActionParameters is a union of all possible parameter types.
export type ActionParameters =
    MoveParameters | TalkParameters | TakeParameters | GiveParameters | MakeParameters;

export interface MoveParameters {
    origin: [number, number];
    destination: [number, number];
}

export interface TalkParameters {
    say: string;
    toNPCId: string;
}

export interface TakeParameters {
    fromNPCId: string | null;
    artifacts: ArtifactInstance[];
}

export interface GiveParameters {
    toNPCId: string | null;
    artifacts: ArtifactInstance[];
}

export interface MakeParameters {
    use: ArtifactInstance[],
    make: ArtifactInstance
}

// ArtifactInstance represents an artifact when used as a parameter in actions.
export interface ArtifactInstance {
    artifactId: string;
    name: string;
    quantity: number;
    position?: [number, number]; // Optional position if the artifact is on the map.
}

// MapUpdate represents changes to the map resulting from an action.
export interface MapUpdate extends MapObject {
    remove?: boolean; // If true, the object should be removed from the map.
}