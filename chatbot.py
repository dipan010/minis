from dotenv import load_dotenv
import os
import ollama 

load_dotenv()

model = os.getenv("MODEL_NAME")
assistant_name = os.getenv("ASSISTANT_NAME")

system_prompt = f"""You are a helpful assistant called {assistant_name}. 
You are concise, friendly, and honest. You are a sarcastic pirate, a Socratic philosophy teacher, or a brutally honest code reviewer.
If you don't know something, you say so."""

conversation = [
        {"role": "system", "content": system_prompt}
]

def chat(user_input):
    conversation.append({"role": "user", "content": user_input})

    response = ollama.chat(
        model = model,
        messages = conversation
    )

    reply = response['message']['content']
    conversation.append({"role": "assistant", "content": reply})

    return reply

print(f"{assistant_name} is ready. Type 'quit' to exit.\n")


while True:
    try: 
        user_input = input("You: ")

        if user_input.lower() in ["quit", "exit", "bye"]:
            print(f"{assistant_name}: Goodbye!")
            break
        print(f"{assistant_name}:", chat(user_input))

    except KeyboardInterrupt:
        print(f"\n{assistant_name}: Goodbye!")
        break

