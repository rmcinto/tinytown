import openai
import os
from dotenv import load_dotenv

# Load the custom env file
load_dotenv("backend/variables.env")
print(os.getenv("OPENAI_API_KEY"))

# Set your OpenAI API key here
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def chat_with_gpt(prompt, model="gpt-4o"):
    """
    Sends a prompt to OpenAI's API and retrieves the response.
    
    :param prompt: User input text.
    :param model: OpenAI model to use (default: gpt-4o).
    :return: Model's response as a string.
    """
    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )

        return response.choices[0].message.content.strip()

    except openai.OpenAIError as e:
        return f"API Error: {e}"

if __name__ == "__main__":
    print("Chat with GPT-4o! Type 'exit' to quit.")
    
    while True:
        user_input = input("You: ")
        if user_input.lower() == "exit":
            print("Goodbye!")
            break
        
        response = chat_with_gpt(user_input)
        print(f"GPT-4o: {response}")
