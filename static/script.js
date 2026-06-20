const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatBox = document.getElementById("chatBox");
const typingText = document.getElementById("typingText");
const clearBtn = document.getElementById("clearBtn");
const statusBadge = document.getElementById("statusBadge");
const modelText = document.getElementById("modelText");
const topicButtons = document.querySelectorAll(".topic-btn");

function addMessage(message, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", sender);

  const avatarDiv = document.createElement("div");
  avatarDiv.classList.add("avatar");
  avatarDiv.classList.add(sender === "user" ? "user-avatar" : "bot-avatar");
  avatarDiv.textContent = sender === "user" ? "Y" : "T";

  const bubbleWrap = document.createElement("div");
  bubbleWrap.classList.add("bubble-wrap");

  const senderName = document.createElement("div");
  senderName.classList.add("sender-name");
  senderName.textContent = sender === "user" ? "You" : "Tutor";

  const bubbleDiv = document.createElement("div");
  bubbleDiv.classList.add("bubble");
  bubbleDiv.textContent = message;

  bubbleWrap.appendChild(senderName);
  bubbleWrap.appendChild(bubbleDiv);

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(bubbleWrap);

  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function loadStatus() {
  try {
    const response = await fetch("/status");
    const data = await response.json();

    if (data.online) {
      statusBadge.textContent = "Online";
      statusBadge.className = "badge online";
      modelText.textContent = `Model: ${data.model || "Unknown"}`;
    } else {
      statusBadge.textContent = "Offline";
      statusBadge.className = "badge offline";
      modelText.textContent = "Model: Not loaded";
    }
  } catch (error) {
    statusBadge.textContent = "Offline";
    statusBadge.className = "badge offline";
    modelText.textContent = "Model: Not loaded";
  }
}

async function sendMessage(message) {
  if (!message.trim()) return;

  addMessage(message, "user");
  typingText.textContent = "Tutor is thinking...";
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: message })
    });

    const data = await response.json();
    addMessage(data.reply || "No response received.", "bot");
  } catch (error) {
    addMessage("Error: Could not connect to Flask backend.", "bot");
  } finally {
    typingText.textContent = "";
  }
}

chatForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  userInput.value = "";
  userInput.style.height = "56px";
  await sendMessage(message);
});

clearBtn.addEventListener("click", async function () {
  try {
    await fetch("/clear", {
      method: "POST"
    });

    chatBox.innerHTML = `
      <div class="message bot">
        <div class="avatar bot-avatar">T</div>
        <div class="bubble-wrap">
          <div class="sender-name">Tutor</div>
          <div class="bubble">Conversation cleared. Start a new topic anytime.</div>
        </div>
      </div>
    `;
  } catch (error) {
    addMessage("Error: Could not clear chat.", "bot");
  }
});

topicButtons.forEach(button => {
  button.addEventListener("click", async function () {
    const topic = this.getAttribute("data-topic");
    await sendMessage(topic);
  });
});

userInput.addEventListener("input", function () {
  this.style.height = "56px";
  this.style.height = this.scrollHeight + "px";
});

userInput.addEventListener("keydown", async function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;

    userInput.value = "";
    userInput.style.height = "56px";
    await sendMessage(message);
  }
});

loadStatus();
setInterval(loadStatus, 5000);