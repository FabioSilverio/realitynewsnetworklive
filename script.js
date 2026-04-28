const config = {
  xHandle: "faaretz",
  youtubeUrl: "https://www.youtube.com/@faaretz",
  liveUrl: ""
};

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
  }).catch(() => showOffline());

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
    if (!markHydrated()) {
      const fallback = document.querySelector("[data-feed-fallback]");
      if (fallback) fallback.hidden = false;
    }
  }, 8000);
};

window.addEventListener("load", hydrateTimeline);
window.setTimeout(hydrateTimeline, 2000);
