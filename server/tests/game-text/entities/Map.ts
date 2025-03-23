export interface MapData {
    mapId: string;
    map_size: [number, number];
    objects: Record<string, MapObject>;
}

export type MapObjectType = "npc" | "building" | "artifact";

export interface MapObject {
    mapItemId: string;
    type: MapObjectType;
    name: string;
    symbol: string;
    position: [number, number];
}

// MapObject is a union type of all objects that can appear on the map.
export type MapEntries = NPCMapObject | BuildingMapObject | ArtifactMapObject;

export interface NPCMapObject extends MapObject {
    type: "npc";
    npcId: string;
}

export interface BuildingMapObject extends MapObject {
    type: "building";
}

export interface ArtifactMapObject extends MapObject {
    type: "artifact";
    artifactId: string;
}