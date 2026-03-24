from dotenv import load_dotenv
from datetime import datetime
import os
import ollama 

load_dotenv()

model = os.getenv("MODEL_NAME")
assistant_name = os.getenv("ASSISTANT_NAME")
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

system_prompt = f"""You are a helpful assistant called {assistant_name}. 
You are concise, friendly, and honest.
If you don't know something, you say so."""

conversation = [
        {"role": "system", "content": system_prompt}
]

def save_conversation():
    with open("conversation.txt", "a") as f:
        f.write(f"{timestamp} - {assistant_name} Conversation\n")
        for message in conversation:
            if message['role'] == 'system':
                continue
            role = message['role']
            content = message['content']
            f.write(f"{role.capitalize()}: {content}\n")

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

        if user_input.lower() in ["save", "save conversation"]:
            save_conversation()
            print(f"{assistant_name}: Conversation saved to conversation.txt")
            continue

        if user_input.lower() in ["quit", "exit", "bye"]:
            save_conversation()
            print(f"{assistant_name}: Goodbye!")
            break
        print(f"{assistant_name}:", chat(user_input))

    except KeyboardInterrupt:
        print(f"\n{assistant_name}: Goodbye!")
        break


