import { Game } from "../domain";
import { Neo4jGameRepository } from "../infrastructure/neo4j/Neo4jGameRepository";
import { CreateGameUseCase } from "../use-cases";

const gameRepository = new Neo4jGameRepository();

export const handleRequest = async (payload: Game): Promise<any | null> => {
    const { gameId, title, backstory, rules, maps } = payload;
    const game = new Game(gameId, title, backstory, rules, maps);
    const createGameUseCase = new CreateGameUseCase(gameRepository);
    await createGameUseCase.execute(game);

    return game;
}