import neo4j from 'neo4j-driver';
import { Game } from '../../domain/entities/Game';
import { GameRepository } from '../../repositories/GameRepository';
import { config } from '../../config/config';

// Use externalized configuration for connecting to Neo4J.
const driver = neo4j.driver(
    config.neo4j.uri,
    neo4j.auth.basic(config.neo4j.user, config.neo4j.password)
  );

export class Neo4jGameRepository implements GameRepository {
    async saveGame(game: Game): Promise<void> {
        const session = driver.session();
        try {
            await session.run(
                `CREATE (g:Game {id: $id, title: $title, backstory: $backstory, rules: $rules, maps: $maps})`,
                {
                    id: game.gameId,
                    title: game.title,
                    backstory: game.backstory,
                    rules: game.rules,
                    maps: game.maps
                }
            );
        } 
        finally {
            await session.close();
        }
    }

    async getGameById(id: string): Promise<Game | null> {
        const session = driver.session();
        try {
            const result = await session.run(
                `MATCH (g:Game {id: $id}) RETURN g`,
                { id }
            );
            if (result.records.length === 0) return null;
            const record = result.records[0].get('g').properties;
            return new Game(record.id, record.title, record.backstory, record.rules, record.maps);
        } 
        finally {
            await session.close();
        }
    }
}