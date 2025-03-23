import dotenv from 'dotenv';

dotenv.config({ override: true });

const rawPort = process.env.PORT;
const portNumber = rawPort ? parseInt(rawPort, 10) : 3000;

export const config = {
    neo4j: {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        user: process.env.NEO4J_USER || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'temp1234'
    },
    port: (isNaN(portNumber) || portNumber <= 0) ? 3000 : portNumber,
    // Add additional configuration options here as needed
    openai: {
        apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
        apiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
        model: process.env.OPENAI_MODEL || 'o3-mini'
    }
};