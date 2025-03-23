export interface BuildingBase {
    buildingId: string;     // Unique identifier for the building.
    buildingType: string;   // Type of building (e.g., "Workshop", "Marketplace").
    name: string;           // Name of the building. This can be used to refer to the building in the game.
    description: string;    // Description of the building. This can be used to provide a brief overview of the building's purpose, history, and/or notable features.
}

export interface Building extends BuildingBase {
    
}

export interface BuildingCollection {
    [buildingId: string]: BuildingBase;
}

