const config = {
  xHandle: "faaretz",
  youtubeUrl: "https://www.youtube.com/@faaretz",
  liveUrl: "",
  kickChannel: "rsnnews"
};

// === SUPABASE CONFIG ===
const SUPABASE_URL = "https://bshealgoawnasmabiyjk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaGVhbGdvYXduYXNtYWJpeWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTY2NDcsImV4cCI6MjA5Mjk3MjY0N30.RMU1KcJNrIMJjc3z2GYa7p7gVTLyY90BOH-pVnaOTJQ";

const liveRoot = document.querySelector("[data-live]");
const offlineState = document.querySelector("[data-offline]");
const liveLabel = document.querySelector("[data-live-label]");

const showOffline = () => {
  liveRoot?.classList.remove("is-live");
  if (offlineState) offlineState.hidden = false;
  if (liveLabel) liveLabel.textContent = "Transmissao offline_";
};

const showKickPlayer = () => {
  if (offlineState) offlineState.hidden = true;
  liveRoot?.classList.add("is-live");
  if (liveLabel) liveLabel.textContent = "AO VIVO — Kick_";
};

const bootLive = () => {
  showKickPlayer();
};

window.addEventListener("DOMContentLoaded", () => bootLive());

// ==================== CHAT ====================
const CHAT_ADMIN_PASSWORD = "rsnsocial";
const CHAT_USERNAME_KEY = "rsnChatUsername";
const CHAT_ADMIN_KEY = "rsnChatAdmin";

const chatMessages = document.querySelector("[data-chat-messages]");
const chatInput = document.querySelector("[data-chat-input]");
const chatSend = document.querySelector("[data-chat-send]");
const chatUsername = document.querySelector("[data-chat-username]");
const chatJoinBtn = document.querySelector("[data-chat-join]");
const chatAdminToggle = document.querySelector("[data-chat-admin-toggle]");
const chatEmojiBtn = document.querySelector("[data-chat-emoji-btn]");
const chatEmojiPicker = document.querySelector("[data-chat-emoji-picker]");
const chatCount = document.querySelector("[data-chat-count]");

let supabase = null;
let isAdmin = localStorage.getItem(CHAT_ADMIN_KEY) === "1";
let username = localStorage.getItem(CHAT_USERNAME_KEY) || "";
let editingUsername = false;

const setJoinedState = () => {
  if (!chatUsername || !chatJoinBtn) return;
  if (username && !editingUsername) {
    chatUsername.value = username;
    chatUsername.readOnly = true;
    chatUsername.style.opacity = "0.7";
    chatJoinBtn.textContent = username;
    chatJoinBtn.classList.add("is-joined");
  } else if (editingUsername) {
    chatUsername.readOnly = false;
    chatUsername.style.opacity = "1";
    chatJoinBtn.textContent = "Salvar";
    chatJoinBtn.classList.remove("is-joined");
    chatUsername.focus();
    chatUsername.setSelectionRange(chatUsername.value.length, chatUsername.value.length);
  } else {
    chatUsername.value = "";
    chatUsername.readOnly = false;
    chatUsername.style.opacity = "1";
    chatJoinBtn.textContent = "Entrar";
    chatJoinBtn.classList.remove("is-joined");
  }
};

setJoinedState();

const saveUsername = () => {
  const raw = chatUsername?.value.trim() || "";
  if (!raw) return;
  username = raw.slice(0, 20);
  localStorage.setItem(CHAT_USERNAME_KEY, username);
  editingUsername = false;
  setJoinedState();
};

chatJoinBtn?.addEventListener("click", () => {
  if (username && !editingUsername) {
    // Inicia edição
    editingUsername = true;
    setJoinedState();
    return;
  }
  saveUsername();
});

chatUsername?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    saveUsername();
  }
  if (e.key === "Escape" && editingUsername) {
    editingUsername = false;
    setJoinedState();
  }
});

if (chatAdminToggle) {
  chatAdminToggle.classList.toggle("is-active", isAdmin);
  chatAdminToggle.addEventListener("click", () => {
    if (isAdmin) {
      isAdmin = false;
      localStorage.removeItem(CHAT_ADMIN_KEY);
      chatAdminToggle.classList.remove("is-active");
      return;
    }
    if (!username) return alert("Crie um apelido primeiro.");
    const pass = prompt("Senha de moderador:");
    if (pass === CHAT_ADMIN_PASSWORD) {
      isAdmin = true;
      localStorage.setItem(CHAT_ADMIN_KEY, "1");
      chatAdminToggle.classList.add("is-active");
    } else {
      alert("Senha incorreta.");
    }
  });
}

const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

const formatTime = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const renderMessage = (msg) => {
  if (!chatMessages) return;
  const el = document.createElement("div");
  const selfClass = msg.username === username ? "chat-message--self" : "";
  const adminClass = msg.is_admin ? "chat-message--admin" : "";
  el.className = `chat-message ${selfClass} ${adminClass}`;
  el.dataset.id = msg.id;
  const badge = msg.is_admin ? `<span class="chat-message__badge">Admin</span>` : "";
  const delBtn = isAdmin ? `<button class="chat-message__delete" data-del="${msg.id}">✕</button>` : "";
  el.innerHTML = `
    <div class="chat-message__meta">
      <span class="chat-message__user">${escapeHtml(msg.username)}</span>
      ${badge}
      <span class="chat-message__time">${formatTime(msg.created_at)}</span>
      ${delBtn}
    </div>
    <p class="chat-message__text">${escapeHtml(msg.text)}</p>
  `;
  if (isAdmin) {
    el.querySelector("[data-del]")?.addEventListener("click", async () => {
      if (!supabase) return;
      await supabase.from("messages").delete().eq("id", msg.id);
    });
  }
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const setChatStatus = (text, isError = false) => {
  if (!chatMessages) return;
  const existing = chatMessages.querySelector(".chat-status");
  if (existing) existing.remove();
  const div = document.createElement("div");
  div.className = `chat-status ${isError ? "chat-status--error" : ""}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const initChat = async () => {
  if (!window.supabase || !chatMessages) return;
  if (SUPABASE_URL.includes("SEU-PROJETO")) {
    setChatStatus("Chat offline: configure o Supabase no script.js", true);
    return;
  }

  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: msgs, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;

    chatMessages.innerHTML = "";
    msgs?.forEach(renderMessage);
    setChatStatus("Conectado. Diga oi! 👋");
    window.setTimeout(() => {
      const st = chatMessages.querySelector(".chat-status");
      if (st) st.remove();
    }, 3000);

    supabase.channel("public:messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        renderMessage(payload.new);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        const old = chatMessages.querySelector(`[data-id="${payload.old.id}"]`);
        if (old) old.remove();
      })
      .subscribe();

    updateOnlineCount();
    window.setInterval(updateOnlineCount, 30000);

  } catch (err) {
    console.error("Chat init error:", err);
    setChatStatus("Erro ao conectar no chat. Recarregue a página.", true);
  }
};

const sendMessage = async () => {
  if (!supabase || !chatInput) return;
  const text = chatInput.value.trim();
  if (!text) return;
  const user = (chatUsername?.value || username || "Anon").trim().slice(0, 20) || "Anon";
  username = user;
  localStorage.setItem(CHAT_USERNAME_KEY, username);

  chatInput.value = "";
  const { error } = await supabase.from("messages").insert({
    username: user,
    text: text,
    is_admin: !!isAdmin
  });
  if (error) {
    console.error("Send error:", error);
    setChatStatus("Erro ao enviar. Tente novamente.", true);
  }
};

chatSend?.addEventListener("click", sendMessage);
chatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

chatEmojiBtn?.addEventListener("click", () => {
  if (chatEmojiPicker) chatEmojiPicker.hidden = !chatEmojiPicker.hidden;
});

chatEmojiPicker?.querySelectorAll("span").forEach((span) => {
  span.addEventListener("click", () => {
    if (chatInput) {
      chatInput.value += span.textContent;
      chatInput.focus();
    }
  });
});

document.addEventListener("click", (e) => {
  if (chatEmojiPicker && !chatEmojiPicker.contains(e.target) && e.target !== chatEmojiBtn) {
    chatEmojiPicker.hidden = true;
  }
});

const updateOnlineCount = async () => {
  if (!supabase || !chatCount) return;
  try {
    const { count } = await supabase.from("messages").select("*", { count: "exact", head: true });
    chatCount.textContent = `${count ?? 0} msgs`;
  } catch { /* ignore */ }
};

window.addEventListener("load", initChat);
