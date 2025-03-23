import { ArtifactStack } from "./Artifact";
import { BuildingBase } from "./Building";
import { CharacterBase } from "./Character";
import { InteractableBase } from "./Interactable";

// Represents a coordinate on the map.
export interface Position {
    x: number;
    y: number;
    z?: number; // Optional z coordinate for 3D positioning.
}

// Represents the dimensions of a map.
export interface Dimensions {
    width: number;
    height: number;
    depth?: number; // Optional depth for 3D maps.
}

// Base interface for all map items with additional metadata.
export interface MapItem {
    mapItemId: string;            // Unique identifier for the item.
    symbol: string;               // Display symbol on the map.
    position: Position;           // Position on the map.
    name: string;                 // Name of the item.
    description: string;          // Description of the item.
    attributes: { [key: string]: any }; // Additional metadata (e.g., status, health, custom properties)
}

// Represents an NPC on the map.
export type NPCMapItem = MapItem & CharacterBase;
// Represents a building on the map.
export type BuildingMapItem = MapItem & BuildingBase;
// Represents an artifact on the map.
export type ArtifactMapItem = MapItem & ArtifactStack;
// Represents an interactable object on the map.
export type InteractableMapItem = MapItem & InteractableBase;

// Metadata associated with a map.
export interface MapMetadata {
    mapId: string;             // Unique map identifier.
    dimensions: Dimensions;    // Explicit dimensions of the map.
    description: string;       // Narrative or contextual description.
    theme: string;             // Thematic label (e.g., "Village", "Workshop").
    spawnPoints: Position[];   // Recommended starting positions for NPCs.
    customData?: { [key: string]: any }; // Optional: additional metadata about the map.
}

// A complete game map that includes organized arrays of items.
export interface GameMap extends MapMetadata {
    npcs: NPCMapItem[];
    buildings: BuildingMapItem[];
    artifacts: ArtifactMapItem[];
    interactables: InteractableMapItem[];
}

// A dictionary of maps, keyed by their unique map IDs.
export interface MapsDictionary {
    [mapId: string]: GameMap;
}