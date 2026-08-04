/**
 * app.js — bootstrap dell'applicazione:
 *  - toast di sistema
 *  - indicatore online/offline
 *  - registrazione service worker (offline-first)
 *  - caricamento dati e avvio del router
 */
(function () {
  let toastTimer = null;
  window.mostraToast = function mostraToast(messaggio, durataMs = 3000) {
    const el = document.getElementById("toast");
    el.textContent = messaggio;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), durataMs);
  };

  function aggiornaIndicatoreConnessione() {
    const el = document.getElementById("conn-indicator");
    const label = el.querySelector(".conn-label");
    const online = navigator.onLine;
    el.classList.toggle("conn-online", online);
    el.classList.toggle("conn-offline", !online);
    label.textContent = online ? "Online" : "Offline";
  }

  window.addEventListener("online", () => {
    aggiornaIndicatoreConnessione();
    window.mostraToast("Connessione ripristinata");
  });
  window.addEventListener("offline", () => {
    aggiornaIndicatoreConnessione();
    window.mostraToast("Sei offline: catalogo e riconoscimento guidato restano disponibili");
  });

  function registraServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.error("Registrazione service worker fallita:", err);
      });
    });
  }

  async function avvia() {
    aggiornaIndicatoreConnessione();
    registraServiceWorker();
    try {
      await FunghiData.load();
    } catch (err) {
      document.getElementById("view-root").innerHTML =
        `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Impossibile caricare il database dei funghi. Verifica di aver aperto l'app almeno una volta online, poi ricarica.</p></div>`;
      console.error(err);
      return;
    }
    FunghiRouter.init();
  }

  avvia();
})();
