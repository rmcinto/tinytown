import axios from 'axios';
import axiosRetry from 'axios-retry';
import { config } from '../../config/config';
import { AIProvider } from '../../domain/ports/AIProvider';
import { AIPrompt } from '../../domain/entities/AIPrompt';
import { NPCAction } from '../../domain/entities/NPCAction';

// Configure axios with retry logic (3 retries with exponential backoff)
axiosRetry(axios, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error: any) =>
        axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error),
});

export class OpenAIProvider implements AIProvider {
    async getNextAction(prompt: AIPrompt): Promise<NPCAction> {
        try {
            const response = await axios({
                method: 'post',
                url: config.openai.apiUrl,
                timeout: 10000, // 10-second timeout
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.openai.apiKey}`,
                },
                data: {
                    model: config.openai.model,
                    // Directly using JSON for the prompt
                    messages: [
                        {
                            role: 'user',
                            content: JSON.stringify(prompt),
                        },
                    ],
                    temperature: 0.7,
                },
            });

            const actionDescription = response.data.choices[0].message.content.trim();
            return new NPCAction(`action-${Date.now()}`, actionDescription);
        } catch (error: any) {
            throw new Error('ChatGPT API error: ' + error.message);
        }
    }
}