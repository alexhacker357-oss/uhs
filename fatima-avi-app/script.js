/* ============================================================
   script.js — makes the site installable as a real app:
   registers the service worker and shows an "Install app" button
   (on the Home tab) when the browser offers to install it.
   ============================================================ */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* fine if this fails, e.g. when opened as a local file */
    });
  });
}

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showInstallButton();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  hideInstallButton();
});

function showInstallButton() {
  if (document.getElementById("installAppBtn")) return;
  const quickLinks = document.querySelector(".quick-links");
  if (!quickLinks) return;
  const btn = document.createElement("button");
  btn.id = "installAppBtn";
  btn.className = "quick-card";
  btn.innerHTML = `<span class="ic">⬇️</span><span>Install this app</span>`;
  btn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    hideInstallButton();
  });
  quickLinks.appendChild(btn);
}

function hideInstallButton() {
  const btn = document.getElementById("installAppBtn");
  if (btn) btn.remove();
}
