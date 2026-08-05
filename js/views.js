/**
 * views.js — genera l'HTML delle tre schermate dell'app e collega gli eventi.
 * Ogni vista espone { render(params) -> string, afterRender(params) }.
 * Il router (js/router.js) inietta render() in #view-root e poi chiama afterRender().
 */
const FunghiViews = (() => {
  // Aumentare ad ogni pubblicazione: mostrata in fondo alla pagina Info,
  // utile per confermare se il dispositivo ha davvero ricevuto l'ultimo
  // aggiornamento o sta ancora usando una versione vecchia in cache.
  const APP_VERSION = "2026-08-06.1";

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function badgeHtml(commestibilita) {
    const l = FunghiData.labelEdibilita(commestibilita);
    return `<span class="badge-edibilita badge-${commestibilita}"><span class="dot">${l.icona}</span>${l.testo}</span>`;
  }

  const DISCLAIMER_GENERICO = `⚠️ Strumento di supporto al riconoscimento — per il consumo, far verificare i funghi da un esperto o all'Ispettorato Micologico ASL. In caso di dubbio anche minimo, NON consumare.`;

  // ===================================================================
  // RICONOSCI (schermata principale)
  // ===================================================================
  const ViewRiconosci = {
    render() {
      return `<div id="riconosci-root"><p class="text-muted">Caricamento...</p></div>`;
    },

    async afterRender() {
      const root = document.getElementById("riconosci-root");

      if (!FunghiAI.isConfigurato()) {
        root.innerHTML = `
          <div class="hero">
            <div class="hero-icon">🍄</div>
            <h1>FunghiAlpini</h1>
            <p class="text-muted">Scatta una foto a un fungo e scopri di che specie si tratta.</p>
          </div>
          <div class="card setup-card">
            <h2 class="mt-0">Configurazione necessaria</h2>
            <p>Per riconoscere i funghi dalle foto serve collegare un servizio AI esterno con una tua API key personale (gratuita per iniziare). Si fa una volta sola.</p>
            <a href="#/impostazioni" class="btn btn-block">Configura ora</a>
          </div>
        `;
        return;
      }

      mostraCattura(root);
    },
  };

  function mostraCattura(root) {
    root.innerHTML = `
      <div class="hero">
        <div class="hero-icon">🍄</div>
        <h1>FunghiAlpini</h1>
        <p class="text-muted">Scatta o carica una foto: l'app cerca di riconoscere la specie e ti dice se è commestibile.</p>
      </div>

      <input type="file" id="foto-input" accept="image/*" capture="environment" style="display:none;">
      <button type="button" class="btn btn-block btn-capture" id="btn-scatta">
        <span class="nav-icon" aria-hidden="true">📷</span> Scatta o carica una foto
      </button>

      <div id="anteprima-wrap"></div>

      <div class="disclaimer-box" style="margin-top:24px;">${DISCLAIMER_GENERICO}</div>
    `;

    const fotoInput = document.getElementById("foto-input");
    const btnScatta = document.getElementById("btn-scatta");
    const anteprimaWrap = document.getElementById("anteprima-wrap");

    btnScatta.addEventListener("click", () => fotoInput.click());

    fotoInput.addEventListener("change", () => {
      const file = fotoInput.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      anteprimaWrap.innerHTML = `
        <div class="card anteprima-card">
          <img src="${url}" alt="Foto scattata" class="anteprima-img">
          <div class="anteprima-azioni">
            <button type="button" class="btn btn-block" id="btn-analizza">Analizza foto</button>
            <button type="button" class="btn btn-ghost btn-block" id="btn-cambia">Scegli un'altra foto</button>
          </div>
        </div>
      `;
      document.getElementById("btn-cambia").addEventListener("click", () => fotoInput.click());
      document.getElementById("btn-analizza").addEventListener("click", () => analizzaFoto(root, file, url));
    });
  }

  function mostraCaricamento(root) {
    root.innerHTML = `
      <div class="loading-block">
        <div class="spinner" aria-hidden="true"></div>
        <p>Analisi della foto in corso...</p>
      </div>
    `;
  }

  async function analizzaFoto(root, file, fotoUrl) {
    mostraCaricamento(root);
    try {
      const candidati = await FunghiAI.identifica(file);
      mostraRisultati(root, candidati, fotoUrl);
    } catch (err) {
      let msg;
      if (err.message === "OFFLINE") msg = "Sei offline: il riconoscimento richiede connessione internet. Riprova quando torni in rete.";
      else if (err.message === "NON_CONFIGURATO") msg = "Configura prima l'assistente AI nelle Impostazioni.";
      else if (err.message === "NESSUN_CANDIDATO") msg = "Il servizio non ha restituito alcun risultato per questa foto. Prova con un'altra inquadratura, più nitida e ravvicinata.";
      else msg = "Errore durante l'analisi: " + err.message;

      root.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <p>${escapeHtml(msg)}</p>
          <button type="button" class="btn btn-secondary" id="btn-riprova">Torna indietro</button>
        </div>
      `;
      document.getElementById("btn-riprova").addEventListener("click", () => mostraCattura(root));
    }
  }

  function schedaCandidato(c, { principale = false, confrontoCon = null } = {}) {
    const s = c.specieLocale;
    const pct = Math.round(c.confidenza * 100);

    if (!s) {
      return `
        <div class="candidato-card ${principale ? "candidato-principale" : ""}">
          <div class="candidato-head">
            <div>
              <div class="candidato-nome">${escapeHtml(c.nome)}</div>
              <div class="text-muted" style="font-size:.85rem;">Non presente nel database locale</div>
            </div>
            <div class="candidato-pct">${pct}%</div>
          </div>
          <div class="disclaimer-box" style="margin-top:10px;">Specie non presente nel database locale: non è possibile indicarne la commestibilità qui. NON consumare senza la verifica di un esperto.</div>
        </div>`;
    }

    const nomeComune = s.nomi_comuni[0] || s.nome_scientifico;
    const caratteriHtml = principale && s.punti_chiave
      ? `<ul class="punti-chiave">
          ${s.punti_chiave.map((punto) => `<li>${escapeHtml(punto)}</li>`).join("")}
        </ul>`
      : "";

    const confrontoHtml = confrontoCon
      ? `<div class="confronto-box">🔀 <strong>Come distinguerlo dal risultato principale:</strong> ${escapeHtml(confrontoCon)}</div>`
      : "";

    const avvisoPericolo = principale && (s.commestibilita === "mortale" || s.commestibilita === "tossico")
      ? `<div class="disclaimer-box" style="margin-top:10px;">⚠️ Specie potenzialmente pericolosa. Non toccare a mani nude in presenza di ferite. In caso di sospetta ingestione contattare immediatamente il 112 / Centro Antiveleni.</div>`
      : "";

    return `
      <div class="candidato-card ${principale ? "candidato-principale" : ""}">
        <div class="candidato-head">
          <div>
            <div class="candidato-nome">${escapeHtml(nomeComune)}</div>
            <div class="candidato-sci">${escapeHtml(s.nome_scientifico)}</div>
          </div>
          <div class="candidato-pct">${pct}%</div>
        </div>
        ${badgeHtml(s.commestibilita)}
        ${avvisoPericolo}
        ${confrontoHtml}
        ${caratteriHtml}
      </div>`;
  }

  function chiaveCandidato(c) {
    return c.specieLocale ? `specie:${c.specieLocale.id}` : `nome:${c.nome.toLowerCase().trim()}`;
  }

  function mostraRisultati(root, candidatiGrezzi, fotoUrl) {
    const [principale, ...resto] = candidatiGrezzi;
    // Filtro di sicurezza: il risultato principale non deve mai ricomparire
    // tra le alternative, qualunque cosa abbia restituito il livello AI.
    const chiavePrincipale = chiaveCandidato(principale);
    const alternative = resto.filter((c) => chiaveCandidato(c) !== chiavePrincipale);

    const alternativeConfrontate = alternative.slice(0, 4).map((alt) => {
      const confronto = principale.specieLocale && alt.specieLocale
        ? FunghiData.confrontaSpecie(principale.specieLocale, alt.specieLocale)
        : null;
      return schedaCandidato(alt, { confrontoCon: confronto });
    });

    root.innerHTML = `
      <div class="risultato-foto-wrap">
        <img src="${fotoUrl}" alt="Foto analizzata" class="risultato-foto">
      </div>

      <h2 class="section-title mt-0">Risultato più probabile</h2>
      ${schedaCandidato(principale, { principale: true })}

      ${alternativeConfrontate.length > 0 ? `
        <h2 class="section-title">Altre possibilità</h2>
        <p class="text-muted" style="margin-top:-6px;">Se non sei sicuro al 100%, confronta questi caratteri prima di decidere.</p>
        ${alternativeConfrontate.join("")}
      ` : ""}

      <div class="disclaimer-box" style="margin-top:20px;">${DISCLAIMER_GENERICO}</div>

      <button type="button" class="btn btn-block" id="btn-nuova-foto" style="margin-top:16px;">Analizza un'altra foto</button>
    `;

    document.getElementById("btn-nuova-foto").addEventListener("click", () => mostraCattura(root));
  }

  // ===================================================================
  // IMPOSTAZIONI
  // ===================================================================
  const ENDPOINT_KINDWISE_DEFAULT = "https://mushroom.kindwise.com/api/v1/identification";

  const ViewImpostazioni = {
    render() {
      const { endpoint, apiKey } = FunghiAI.getConfig();
      return `
        <h1>Impostazioni</h1>

        <div class="card">
          <h2 class="mt-0">🔑 Servizio di riconoscimento AI</h2>
          <p class="text-muted">Il riconoscimento da foto usa un servizio esterno online (Kindwise mushroom.id). Serve una API key personale, gratuita per iniziare (con un numero limitato di richieste al mese).</p>

          <p class="passi-title">Come ottenerla:</p>
          <ol class="passi-list">
            <li>Vai su <a href="https://admin.kindwise.com/signup" target="_blank" rel="noopener">admin.kindwise.com/signup</a> e crea un account gratuito (username, email, password).</li>
            <li>Dopo la registrazione entri nel pannello admin: lì trovi la tua <strong>API key</strong> già pronta (sezione "API keys").</li>
            <li>Copiala e incollala qui sotto, poi premi Salva. L'endpoint qui sotto è già precompilato: non serve toccarlo.</li>
          </ol>

          <label class="field-label" for="ai-endpoint">Endpoint API</label>
          <input type="url" id="ai-endpoint" placeholder="${ENDPOINT_KINDWISE_DEFAULT}" value="${escapeHtml(endpoint || ENDPOINT_KINDWISE_DEFAULT)}">
          <label class="field-label" for="ai-apikey">API key</label>
          <input type="password" id="ai-apikey" placeholder="La tua API key" value="${escapeHtml(apiKey)}">
          <button type="button" class="btn btn-block" id="btn-salva-config" style="margin-top:14px;">Salva</button>
        </div>
      `;
    },
    afterRender() {
      document.getElementById("btn-salva-config").addEventListener("click", () => {
        const endpoint = document.getElementById("ai-endpoint").value.trim();
        const apiKey = document.getElementById("ai-apikey").value.trim();
        FunghiAI.setConfig({ endpoint, apiKey });
        window.mostraToast("Configurazione salvata ✓");

        const card = document.querySelector(".card");
        card.innerHTML = `
          <h2 class="mt-0">✅ Configurazione salvata</h2>
          <p>La API key è stata salvata su questo dispositivo. Ora puoi tornare alla schermata principale e analizzare una foto.</p>
          <a href="#/riconosci" class="btn btn-block">Vai al riconoscimento</a>
        `;
      });
    },
  };

  // ===================================================================
  // INFO
  // ===================================================================
  const ViewInfo = {
    render() {
      return `
        <h1>Info</h1>
        <div class="card">
          <h2 class="mt-0">🍄 FunghiAlpini</h2>
          <p>FunghiAlpini è uno strumento personale di <strong>primo riconoscimento</strong> dei funghi: scatti una foto e l'app cerca di identificare la specie, indicandone nome scientifico, nome comune e commestibilità, insieme ad eventuali specie simili con cui potrebbe essere confusa.</p>
          <p>Il riconoscimento avviene tramite un servizio AI esterno (richiede connessione e una tua API key, vedi Impostazioni); i dati di commestibilità, caratteri di riconoscimento e sosia provengono da un database locale di circa 30 specie comuni sull'arco alpino, incluse le principali specie tossiche e mortali.</p>
        </div>

        <div class="disclaimer-box">${DISCLAIMER_GENERICO}</div>

        <div class="card">
          <h2 class="mt-0">Come usarla in sicurezza</h2>
          <p>1. Fotografa il fungo intero: cappello, imenoforo (lamelle/pori) e base del gambo (scavando leggermente per mostrare un'eventuale volva).</p>
          <p>2. Leggi sempre anche le "Altre possibilità": la specie giusta potrebbe non essere la prima indicata.</p>
          <p>3. In caso di dubbio anche minimo, NON consumare il fungo.</p>
          <p>4. Prima di mangiare qualunque raccolta, fai sempre verificare i funghi da un micologo dell'Ispettorato Micologico della tua ASL: il servizio è gratuito in tutta Italia.</p>
        </div>

        <div class="card">
          <h2 class="mt-0">Privacy</h2>
          <p>La API key resta salvata solo su questo dispositivo. Le foto che analizzi vengono inviate al servizio AI che hai configurato tu stesso, e non vengono salvate da questa app.</p>
        </div>

        <p class="text-muted" style="text-align:center;font-size:.78rem;">Versione app: ${APP_VERSION}</p>
      `;
    },
    afterRender() {},
  };

  return { escapeHtml, badgeHtml, ViewRiconosci, ViewImpostazioni, ViewInfo };
})();
