// Basic Artifact interface.
export interface ArtifactBase {
    artifactId: string;        // Unique identifier for the artifact.
    artifactType: string;      // Type of artifact (e.g., "Treasure", "Weapon").
    name: string;              // Name of the artifact (e.g., "gold coin").
    description: string;       // A description of the artifact.
}

// A more complete representation of an artifact with extended details.
export interface Artifact extends ArtifactBase {
    durability: number;                   // Optional durability (if the artifact can wear out).
    rarity: string;                       // Rarity tier "common", "uncommon", "rare", "epic", "legendary".
    weight: number;                       // Weight of the artifact (e.g., in kilograms).
    effects: string[];                    // List of special effects or abilities the artifact has.
    origin: string;                       // Backstory or origin details.
    history: string[];                    // A log of significant interactions or changes to the artifact.
    customData?: { [key: string]: any };  // Any additional custom metadata.
}

// Represents a stack of artifacts.
export interface ArtifactStack extends ArtifactBase {
    quantity: number; // Number of items in the stack.
}

// Represents a collection of artifacts.
export interface ArtifactCollection {
    [artifactId: string]: ArtifactStack;
}