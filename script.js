const config = {
  xHandle: "faaretz",
  youtubeUrl: "https://www.youtube.com/@faaretz",
  liveUrl: ""
};

const ADMIN_PASSWORD = "rsn2024";

const params = new URLSearchParams(window.location.search);
const liveFromUrl = params.get("broadcast");
const liveRoot = document.querySelector("[data-live]");
const liveFrame = document.querySelector(".live-frame");
const livePostMount = document.querySelector("[data-live-post]");
const offlineState = document.querySelector("[data-offline]");
const openXButtons = document.querySelectorAll("[data-open-x]");
const openLink = document.querySelector("[data-open-link]");
const liveLabel = document.querySelector("[data-live-label]");
const tweetsPanel = document.querySelector(".tweets-panel");
const tweetsEmbed = document.querySelector(".tweets-panel__embed");
const timelineMount = document.querySelector("[data-x-timeline]");
const adminForm = document.querySelector("[data-admin-form]");
const adminLiveUrl = document.querySelector("[data-admin-live-url]");
const adminStatus = document.querySelector("[data-admin-status]");
const adminClear = document.querySelector("[data-admin-clear]");
const adminShare = document.querySelector("[data-admin-share]");
const adminCopy = document.querySelector("[data-admin-copy]");
const adminPanel = document.querySelector("#admin");
const adminGate = document.querySelector("[data-admin-gate]");
const adminGateInput = document.querySelector("[data-admin-gate-input]");
const adminGateUnlock = document.querySelector("[data-admin-gate-unlock]");
const storageKey = "rsnLiveUrl";

const normalizeBroadcastUrl = (value) => {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

const savedLiveUrl = localStorage.getItem(storageKey) || "";
const broadcastUrl = normalizeBroadcastUrl(savedLiveUrl || liveRoot?.dataset.liveSrc || config.liveUrl);
const fallbackXUrl = `https://x.com/${config.xHandle}`;
const isRawBroadcastUrl = (url) => url.includes("/i/broadcasts/");

const getPostId = (url) => {
  const match = url.match(/\/status(?:es)?\/(\d+)/);
  return match ? match[1] : "";
};

const setAdminMessage = (message) => {
  if (adminStatus) adminStatus.textContent = message;
};

const updateShareLink = (url) => {
  if (!adminShare) return;
  const shareUrl = new URL(window.location.origin + window.location.pathname);
  if (url) shareUrl.searchParams.set("broadcast", url);
  adminShare.href = shareUrl.href;
};

const resetPostMount = () => {
  if (!livePostMount) return;
  livePostMount.hidden = true;
  livePostMount.replaceChildren();
};

const showOffline = () => {
  liveRoot?.classList.remove("is-live");
  if (liveFrame) {
    liveFrame.hidden = true;
    liveFrame.removeAttribute("src");
  }
  resetPostMount();
  if (offlineState) offlineState.hidden = false;
  if (liveLabel) liveLabel.textContent = "Broadcast offline_";
};

const showPostEmbed = (url) => {
  const postId = getPostId(url);
  if (!liveRoot || !livePostMount || !postId || !window.twttr?.widgets?.createTweet) {
    return false;
  }
  if (liveFrame) {
    liveFrame.hidden = true;
    liveFrame.removeAttribute("src");
  }
  livePostMount.hidden = false;
  livePostMount.replaceChildren();
  liveRoot.classList.add("is-live");
  if (offlineState) offlineState.hidden = false;
  if (liveLabel) liveLabel.textContent = "Broadcast embedded_";

  window.twttr.widgets.createTweet(postId, livePostMount, {
    align: "center",
    conversation: "none",
    dnt: true,
    theme: "dark"
  }).catch(() => {
    showOffline();
    setAdminMessage("O X nao retornou embed para esse post. Tente o link publico do post da live.");
  });

  return true;
};

const showLive = (url) => {
  if (!liveRoot || !liveFrame || !url) {
    showOffline();
    return;
  }
  resetPostMount();
  liveFrame.src = url;
  liveFrame.hidden = false;
  offlineState.hidden = false;
  liveRoot.classList.add("is-live");
  if (liveLabel) liveLabel.textContent = "Broadcast connected_";
};

if (openLink) openLink.href = broadcastUrl || fallbackXUrl;

openXButtons.forEach((button) => {
  button.addEventListener("click", () => {
    window.open(broadcastUrl || fallbackXUrl, "_blank", "noopener,noreferrer");
  });
});

if (adminLiveUrl) adminLiveUrl.value = broadcastUrl;
updateShareLink(broadcastUrl);

const bootLive = (targetUrl) => {
  const url = normalizeBroadcastUrl(targetUrl || savedLiveUrl || liveRoot?.dataset.liveSrc || config.liveUrl);

  if (!url) {
    showOffline();
    return;
  }

  if (openLink) openLink.href = url || fallbackXUrl;

  openXButtons.forEach((button) => {
    button.onclick = () => window.open(url || fallbackXUrl, "_blank", "noopener,noreferrer");
  });

  if (getPostId(url) && showPostEmbed(url)) return;

  if (isRawBroadcastUrl(url)) {
    showOffline();
    setAdminMessage("Esse link /i/broadcasts foi cadastrado, mas o X bloqueia iframe direto. Use a URL do post da live para embedar.");
    return;
  }

  showLive(url);
  window.setTimeout(() => {
    if (!liveFrame?.contentWindow) showOffline();
  }, 2800);
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

const hydrateTimeline = () => {
  if (!tweetsPanel || !tweetsEmbed || !timelineMount) return;

  const markHydrated = () => {
    const iframe = timelineMount.querySelector("iframe[id^='twitter-widget'], iframe[src*='syndication.twitter.com']");
    if (iframe) {
      tweetsPanel.classList.add("is-hydrated");
      return true;
    }
    return false;
  };

  if (window.twttr?.widgets?.load) {
    window.twttr.widgets.load(timelineMount);
  }

  if (markHydrated()) return;

  const observer = new MutationObserver(() => {
    if (markHydrated()) observer.disconnect();
  });

  observer.observe(tweetsEmbed, { childList: true, subtree: true });

  window.setTimeout(() => {
    observer.disconnect();
    markHydrated();
  }, 8000);
};

window.addEventListener("load", hydrateTimeline);
window.setTimeout(hydrateTimeline, 1500);
window.setTimeout(hydrateTimeline, 4000);

adminForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextUrl = normalizeBroadcastUrl(adminLiveUrl?.value || "");
  if (!nextUrl) {
    setAdminMessage("Cole uma URL valida do X para atualizar o palco.");
    return;
  }
  localStorage.setItem(storageKey, nextUrl);
  updateShareLink(nextUrl);
  setAdminMessage("Fonte salva neste navegador. A URL publica permanece limpa.");
  bootLive(nextUrl);
});

adminClear?.addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  updateShareLink("");
  if (adminLiveUrl) adminLiveUrl.value = "";
  setAdminMessage("Fonte local limpa. O site volta para a configuracao publicada.");
  bootLive("");
});

adminCopy?.addEventListener("click", async () => {
  const url = adminShare?.href;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    setAdminMessage("URL compartilhavel copiada para a area de transferencia.");
  } catch {
    setAdminMessage("Nao foi possivel copiar automaticamente. Use o botao 'Abrir URL compartilhavel'.");
  }
});

const openAdminGate = () => {
  if (!adminGate) return;
  adminGate.hidden = false;
  adminGate.classList.add("is-open");
  adminGateInput?.focus();
};

const closeAdminGate = () => {
  if (!adminGate) return;
  adminGate.classList.remove("is-open");
  adminGate.hidden = true;
};

const unlockAdmin = () => {
  const value = adminGateInput?.value || "";
  if (value !== ADMIN_PASSWORD) {
    if (adminGateInput) adminGateInput.value = "";
    const hint = document.querySelector("[data-admin-gate-hint]");
    if (hint) {
      hint.textContent = "Senha incorreta. Tente novamente.";
      hint.style.color = "var(--red)";
    }
    return;
  }
  closeAdminGate();
  if (adminPanel) {
    adminPanel.hidden = false;
    adminPanel.classList.add("is-visible");
    adminPanel.scrollIntoView({ behavior: "smooth" });
  }
};

adminGateUnlock?.addEventListener("click", unlockAdmin);
adminGateInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") unlockAdmin();
  if (e.key === "Escape") closeAdminGate();
});
adminGate?.addEventListener("click", (e) => {
  if (e.target === adminGate) closeAdminGate();
});

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
    e.preventDefault();
    openAdminGate();
  }
});
