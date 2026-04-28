const config = {
  xHandle: "faaretz",
  youtubeUrl: "https://www.youtube.com/@faaretz",
  liveUrl: ""
};

// === SUPABASE CONFIG ===
// 1. Crie um projeto gratuito em https://supabase.com
// 2. Vá em Project Settings > API e copie URL + anon public key
// 3. Cole abaixo e rode o conteúdo de setup-supabase.sql no SQL Editor
const SUPABASE_URL = "https://bshealgoawnasmabiyjk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaGVhbGdvYXduYXNtYWJpeWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTY2NDcsImV4cCI6MjA5Mjk3MjY0N30.RMU1KcJNrIMJjc3z2GYa7p7gVTLyY90BOH-pVnaOTJQ";

const params = new URLSearchParams(window.location.search);
const liveFromUrl = params.get("broadcast");
const liveRoot = document.querySelector("[data-live]");
const liveFrame = document.querySelector(".live-frame");
const livePostMount = document.querySelector("[data-live-post]");
const offlineState = document.querySelector("[data-offline]");
const openXButtons = document.querySelectorAll("[data-open-x]");
const openLink = document.querySelector("[data-open-link]");
const liveLabel = document.querySelector("[data-live-label]");
const storageKey = "rsnLiveUrl";

const normalizeBroadcastUrl = (value) => {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "https:" ? url.href : "";
  } catch { return ""; }
};

const savedLiveUrl = localStorage.getItem(storageKey) || "";
const broadcastUrl = normalizeBroadcastUrl(savedLiveUrl || liveRoot?.dataset.liveSrc || config.liveUrl);
const fallbackXUrl = `https://x.com/${config.xHandle}`;
const isRawBroadcastUrl = (url) => url.includes("/i/broadcasts/");

const getPostId = (url) => {
  const match = url.match(/\/status(?:es)?\/(\d+)/);
  return match ? match[1] : "";
};

const resetPostMount = () => {
  if (!livePostMount) return;
  livePostMount.hidden = true;
  livePostMount.replaceChildren();
};

const showOffline = () => {
  liveRoot?.classList.remove("is-live");
  if (liveFrame) { liveFrame.hidden = true; liveFrame.removeAttribute("src"); }
  resetPostMount();
  if (offlineState) offlineState.hidden = false;
  if (liveLabel) liveLabel.textContent = "Broadcast offline_";
};

const showPostEmbed = (url) => {
  const postId = getPostId(url);
  if (!liveRoot || !livePostMount || !postId || !window.twttr?.widgets?.createTweet) return false;
  if (liveFrame) { liveFrame.hidden = true; liveFrame.removeAttribute("src"); }
  livePostMount.hidden = false;
  livePostMount.replaceChildren();
  liveRoot.classList.add("is-live");
  if (offlineState) offlineState.hidden = false;
  if (liveLabel) liveLabel.textContent = "Broadcast embedded_";
  window.twttr.widgets.createTweet(postId, livePostMount, {
    align: "center", conversation: "none", dnt: true, theme: "dark"
  }).catch(() => showOffline());
  return true;
};

const showLive = (url) => {
  if (!liveRoot || !liveFrame || !url) { showOffline(); return; }
  resetPostMount();
  liveFrame.src = url;
  liveFrame.hidden = false;
  offlineState.hidden = false;
  liveRoot.classList.add("is-live");
  if (liveLabel) liveLabel.textContent = "Broadcast connected_";
};

if (openLink) openLink.href = broadcastUrl || fallbackXUrl;
openXButtons.forEach((btn) => {
  btn.addEventListener("click", () => window.open(broadcastUrl || fallbackXUrl, "_blank", "noopener,noreferrer"));
});

const bootLive = (targetUrl) => {
  const url = normalizeBroadcastUrl(targetUrl || savedLiveUrl || liveRoot?.dataset.liveSrc || config.liveUrl);
  if (!url) { showOffline(); return; }
  if (openLink) openLink.href = url || fallbackXUrl;
  openXButtons.forEach((btn) => { btn.onclick = () => window.open(url || fallbackXUrl, "_blank", "noopener,noreferrer"); });
  if (getPostId(url) && showPostEmbed(url)) return;
  if (isRawBroadcastUrl(url)) { showOffline(); return; }
  showLive(url);
  window.setTimeout(() => { if (!liveFrame?.contentWindow) showOffline(); }, 2800);
};

if (window.twttr?.ready) {
  window.twttr.ready(() => bootLive());
} else {
  window.addEventListener("load", () => bootLive());
  window.setTimeout(() => bootLive(), 1600);
}

window.addEventListener("message", (event) => {
  if (event.origin.includes("x.com") || event.origin.includes("twitter.com")) {
    liveRoot?.classList.add("has-x-message");
  }
});

// ==================== CHAT ====================
const CHAT_ADMIN_PASSWORD = "rsnmod";
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

const setJoinedState = () => {
  if (!chatUsername || !chatJoinBtn) return;
  if (username) {
    chatUsername.value = username;
    chatUsername.readOnly = true;
    chatUsername.style.opacity = "0.7";
    chatJoinBtn.textContent = username;
    chatJoinBtn.classList.add("is-joined");
  } else {
    chatUsername.value = "";
    chatUsername.readOnly = false;
    chatUsername.style.opacity = "1";
    chatJoinBtn.textContent = "Entrar";
    chatJoinBtn.classList.remove("is-joined");
  }
};

setJoinedState();

chatJoinBtn?.addEventListener("click", () => {
  const raw = chatUsername?.value.trim() || "";
  if (!raw) return;

  if (username) {
    // Logout: trocar de nome
    if (confirm("Trocar de apelido? Seus dados locais serao limpos.")) {
      username = "";
      localStorage.removeItem(CHAT_USERNAME_KEY);
      isAdmin = false;
      localStorage.removeItem(CHAT_ADMIN_KEY);
      if (chatAdminToggle) chatAdminToggle.classList.remove("is-active");
      setJoinedState();
    }
    return;
  }

  // Login
  username = raw.slice(0, 20);
  localStorage.setItem(CHAT_USERNAME_KEY, username);
  setJoinedState();
});

chatUsername?.addEventListener("click", () => {
  if (username && chatUsername.readOnly) {
    if (confirm("Deseja trocar de apelido?")) {
      chatJoinBtn?.click();
    }
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
