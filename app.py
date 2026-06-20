from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

conversation_history = []
LM_STUDIO_API = "http://localhost:1234/v1"

SYSTEM_PROMPT = """
You are an AI Student Tutor.
Always format answers clearly with line breaks.

Rules:
- Use short paragraphs.
- Add blank lines between sections.
- Use bullets for lists.
- Use code blocks for code.
- Do not write everything in one paragraph.
- For technical topics, explain step by step.
"""
messages = [
    {"role": "system", "content": SYSTEM_PROMPT}
] + conversation_history

def check_lm_studio():
    try:
        response = requests.get(f"{LM_STUDIO_API}/models", timeout=5)
        return response.status_code == 200
    except Exception:
        return False


def get_loaded_model():
    try:
        response = requests.get(f"{LM_STUDIO_API}/models", timeout=5)
        if response.status_code == 200:
            models = response.json().get("data", [])
            if models:
                return models[0].get("id", "unknown")
        return None
    except Exception:
        return None


def chat_with_lm_studio(user_message):
    conversation_history.append({
        "role": "user",
        "content": user_message
    })

    try:
        response = requests.post(
            f"{LM_STUDIO_API}/chat/completions",
            json={
                "messages": conversation_history,
                "temperature": 0.7,
                "max_tokens": 512,
                "stream": False
            },
            timeout=120
        )

        if response.status_code == 200:
            result = response.json()
            assistant_message = result["choices"][0]["message"]["content"].strip()
        else:
            assistant_message = f"Error: {response.status_code}. Check if LM Studio is running."

    except requests.exceptions.ConnectionError:
        assistant_message = "Can't connect to LM Studio. Make sure it is running on localhost:1234."
    except requests.exceptions.Timeout:
        assistant_message = "Request timed out. LM Studio is taking too long to respond."
    except Exception as e:
        assistant_message = f"Error: {str(e)}"

    conversation_history.append({
        "role": "assistant",
        "content": assistant_message
    })

    return assistant_message

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/status")
def status():
    online = check_lm_studio()
    model = get_loaded_model() if online else None
    return jsonify({
        "online": online,
        "model": model
    })


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"reply": "Please enter a message."}), 400

    reply = chat_with_lm_studio(user_message)
    return jsonify({"reply": reply})


@app.route("/clear", methods=["POST"])
def clear_chat():
    conversation_history.clear()
    return jsonify({"message": "Conversation cleared successfully."})


if __name__ == "__main__":
    app.run(debug=True)