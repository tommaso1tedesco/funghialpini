/**
 * views.js — genera l'HTML di ogni schermata e collega gli eventi.
 * Ogni vista espone { render(params) -> string, afterRender(params) }.
 * Il router (js/router.js) chiama render(), inietta l'HTML in #view-root
 * e poi chiama afterRender() per agganciare i listener.
 */
const FunghiViews = (() => {
  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function badgeHtml(commestibilita) {
    const l = FunghiData.labelEdibilita(commestibilita);
    return `<span class="badge-edibilita badge-${commestibilita}"><span class="dot">${l.icona}</span>${l.testo}</span>`;
  }

  function habitatLabel(tipo) {
    return { conifere: "Conifere", latifoglie: "Latifoglie", misto: "Bosco misto", prateria: "Prateria/prato" }[tipo] || tipo;
  }
  function stagioneLabel(tipo) {
    return { primavera: "Primavera", estate: "Estate", autunno: "Autunno", inverno: "Inverno" }[tipo] || tipo;
  }
  function imenoforoLabel(tipo) {
    return { lamelle: "Lamelle", pori: "Pori (tubuli)", aghi: "Aghi/denti", pieghe: "Pieghe" }[tipo] || tipo;
  }

  // ===================================================================
  // CATALOGO (home)
  // ===================================================================
  function tileHtml(s) {
    const l = FunghiData.labelEdibilita(s.commestibilita);
    return `
      <a class="specie-tile" href="#/specie/${s.id}">
        <img src="${s.immagini[0]}" alt="${escapeHtml(s.nome_scientifico)}" loading="lazy">
        <div class="tile-body">
          <div class="tile-nome">${escapeHtml(s.nomi_comuni[0] || s.nome_scientifico)}</div>
          <div class="tile-sci">${escapeHtml(s.nome_scientifico)}</div>
          <span class="badge-edibilita badge-${s.commestibilita}"><span class="dot">${l.icona}</span>${l.testo}</span>
        </div>
      </a>`;
  }

  const ViewCatalogo = {
    render({ query = "" } = {}) {
      return `
        <h1>Catalogo funghi</h1>
        <div class="search-box">
          <span class="search-icon" aria-hidden="true">🔎</span>
          <input type="text" id="search-input" placeholder="Cerca per nome (es. Porcino, Amanita...)"
                 value="${escapeHtml(query)}" aria-label="Cerca fungo per nome">
        </div>
        <div id="catalogo-grid" class="grid-catalogo"></div>
      `;
    },
    afterRender({ query = "" } = {}) {
      const input = document.getElementById("search-input");
      const grid = document.getElementById("catalogo-grid");

      function draw(q) {
        const risultati = FunghiData.ordinaPerRilevanza(FunghiData.search(q));
        if (risultati.length === 0) {
          grid.outerHTML = `<div class="empty-state" id="catalogo-grid-empty">
            <div class="empty-icon">🍂</div>
            <p>Nessun fungo trovato per "${escapeHtml(q)}".</p>
          </div>`;
        } else {
          const html = risultati.map(tileHtml).join("");
          const target = document.getElementById("catalogo-grid") || document.getElementById("catalogo-grid-empty");
          const grid2 = document.createElement("div");
          grid2.id = "catalogo-grid";
          grid2.className = "grid-catalogo";
          grid2.innerHTML = html;
          target.replaceWith(grid2);
        }
      }

      draw(query);
      input.addEventListener("input", () => {
        history.replaceState(null, "", `#/catalogo?q=${encodeURIComponent(input.value)}`);
        draw(input.value);
      });
    },
  };

  // ===================================================================
  // SCHEDA SPECIE
  // ===================================================================
  const ViewSpecie = {
    render({ id }) {
      const s = FunghiData.getById(id);
      if (!s) {
        return `<a class="back-link" href="#/catalogo">← Torna al catalogo</a><div class="empty-state"><p>Specie non trovata.</p></div>`;
      }
      const [cappello, imenoforo, gambo] = s.immagini;
      const caratteriHtml = s.caratteri_riconoscimento
        .map((c) => `<div class="carattere-item"><span class="tratto">${escapeHtml(c.tratto)}</span>${escapeHtml(c.valore)}</div>`)
        .join("");
      const sosiaHtml = (s.sosia || [])
        .map((so) => `<div class="sosia-card"><div class="sosia-nome">🔀 ${escapeHtml(so.nome)}</div><div class="sosia-diff">${escapeHtml(so.come_distinguerli)}</div></div>`)
        .join("") || `<p class="text-muted">Nessun sosia noto registrato per questa specie.</p>`;

      const avviso = (s.commestibilita === "mortale" || s.commestibilita === "tossico")
        ? `<div class="disclaimer-box">⚠️ Specie potenzialmente pericolosa. Non toccare a mani nude in presenza di ferite e lavarsi sempre le mani dopo la manipolazione. In caso di sospetta ingestione contattare immediatamente il 112 / Centro Antiveleni.</div>`
        : "";

      return `
        <a class="back-link" href="#/catalogo">← Torna al catalogo</a>
        <h1>${escapeHtml(s.nomi_comuni[0] || s.nome_scientifico)}</h1>
        <p class="nomi-comuni"><em>${escapeHtml(s.nome_scientifico)}</em> · ${s.nomi_comuni.map(escapeHtml).join(", ")}</p>
        ${badgeHtml(s.commestibilita)}

        <figure class="gallery" style="margin-top:16px;">
          <figure><img src="${cappello}" alt="Cappello di ${escapeHtml(s.nome_scientifico)}"><figcaption>Cappello</figcaption></figure>
          <figure><img src="${imenoforo}" alt="Imenoforo di ${escapeHtml(s.nome_scientifico)}"><figcaption>Imenoforo</figcaption></figure>
          <figure><img src="${gambo}" alt="Gambo di ${escapeHtml(s.nome_scientifico)}"><figcaption>Gambo</figcaption></figure>
        </figure>

        ${avviso}

        <div class="card">
          <div class="info-row"><span class="info-icon">🌲</span><div><span class="info-label">Habitat</span>${escapeHtml(s.habitat)}</div></div>
          <div class="info-row"><span class="info-icon">📅</span><div><span class="info-label">Stagione</span>${escapeHtml(s.stagione)}</div></div>
        </div>

        <h2 class="section-title">📝 Descrizione</h2>
        <p>${escapeHtml(s.descrizione)}</p>

        <h2 class="section-title">🔬 Caratteri di riconoscimento</h2>
        <div class="card">${caratteriHtml}</div>

        <h2 class="section-title">🔀 Sosia (specie simili)</h2>
        ${sosiaHtml}

        <a class="btn btn-secondary btn-block" href="#/guidato" style="margin-top:10px;">Confronta con il riconoscimento guidato</a>
      `;
    },
    afterRender() {},
  };

  // ===================================================================
  // RICONOSCIMENTO GUIDATO
  // ===================================================================
  const ViewGuidato = {
    render() {
      const opz = FunghiData.opzioniFiltro();
      const chip = (campo, valore, testoVisibile) =>
        `<button type="button" class="chip" data-campo="${campo}" data-valore="${escapeHtml(valore)}">${escapeHtml(testoVisibile)}</button>`;

      return `
        <h1>Riconoscimento guidato</h1>
        <p class="text-muted">Seleziona i caratteri che vedi sul fungo davanti a te. La lista si restringe automaticamente. Funziona anche offline.</p>

        <div class="filtro-gruppo">
          <span class="filtro-titolo">Colore del cappello</span>
          <div class="chip-row">${opz.colori.map((c) => chip("colori", c, c)).join("")}</div>
        </div>

        <div class="filtro-gruppo">
          <span class="filtro-titolo">Imenoforo (parte sotto il cappello)</span>
          <div class="chip-row">${opz.imenofori.map((i) => chip("imenoforo", i, imenoforoLabel(i))).join("")}</div>
        </div>

        <div class="filtro-gruppo">
          <span class="filtro-titolo">Anello sul gambo</span>
          <div class="chip-row">
            ${chip("anello", "true", "Presente")}
            ${chip("anello", "false", "Assente")}
          </div>
        </div>

        <div class="filtro-gruppo">
          <span class="filtro-titolo">Volva alla base (sacco/bulbo avvolto)</span>
          <div class="chip-row">
            ${chip("volva", "true", "Presente")}
            ${chip("volva", "false", "Assente")}
          </div>
        </div>

        <div class="filtro-gruppo">
          <span class="filtro-titolo">Viraggio di colore al taglio</span>
          <div class="chip-row">
            ${chip("viraggio", "true", "Sì, cambia colore")}
            ${chip("viraggio", "false", "No, resta uguale")}
          </div>
        </div>

        <div class="filtro-gruppo">
          <span class="filtro-titolo">Habitat</span>
          <div class="chip-row">${opz.habitat.map((h) => chip("habitat", h, habitatLabel(h))).join("")}</div>
        </div>

        <div class="filtro-gruppo">
          <span class="filtro-titolo">Stagione</span>
          <div class="chip-row">${opz.stagioni.map((st) => chip("stagioni", st, stagioneLabel(st))).join("")}</div>
        </div>

        <button type="button" class="btn btn-ghost btn-block" id="btn-reset-filtri">Azzera filtri</button>

        <div id="guidato-risultati"></div>
      `;
    },
    afterRender() {
      FunghiGuided.reset();
      const chips = Array.from(document.querySelectorAll(".chip"));
      const risultatiEl = document.getElementById("guidato-risultati");

      function disegnaRisultati() {
        const lista = FunghiGuided.risultati();
        const attivi = FunghiGuided.haFiltriAttivi();
        const intestazione = `<h2 class="risultati-count">${attivi ? `${lista.length} candidat${lista.length === 1 ? "o" : "i"}` : `Tutte le specie (${lista.length}) — seleziona dei caratteri per restringere`}</h2>`;
        if (lista.length === 0) {
          risultatiEl.innerHTML = intestazione + `<div class="empty-state"><div class="empty-icon">🤔</div><p>Nessuna specie corrisponde a questa combinazione di caratteri. Prova a togliere qualche filtro: ricordati che i caratteri osservati sul campo possono essere imprecisi.</p></div>`;
        } else {
          risultatiEl.innerHTML = intestazione + `<div class="grid-catalogo">${lista.map(tileHtml).join("")}</div>`;
        }
      }

      chips.forEach((btn) => {
        btn.addEventListener("click", () => {
          const campo = btn.dataset.campo;
          const valore = btn.dataset.valore;
          if (campo === "anello" || campo === "volva" || campo === "viraggio") {
            const boolVal = valore === "true";
            FunghiGuided.setTriStato(campo, boolVal);
            // aggiorna stato visivo dei due chip fratelli (presente/assente)
            const gruppo = btn.parentElement.querySelectorAll(".chip");
            gruppo.forEach((b) => b.classList.remove("active"));
            if (FunghiGuided.get()[campo] !== null) btn.classList.add("active");
          } else {
            FunghiGuided.toggleMultiValore(campo, valore);
            btn.classList.toggle("active");
          }
          disegnaRisultati();
        });
      });

      document.getElementById("btn-reset-filtri").addEventListener("click", () => {
        FunghiGuided.reset();
        chips.forEach((b) => b.classList.remove("active"));
        disegnaRisultati();
      });

      disegnaRisultati();
    },
  };

  // ===================================================================
  // DIARIO / FOTOCAMERA
  // ===================================================================
  const ViewDiario = {
    render() {
      const opzioniSpecie = FunghiData.all()
        .slice()
        .sort((a, b) => a.nome_scientifico.localeCompare(b.nome_scientifico))
        .map((s) => `<option value="${s.id}">${escapeHtml(s.nomi_comuni[0])} (${escapeHtml(s.nome_scientifico)})</option>`)
        .join("");

      return `
        <h1>Diario delle uscite</h1>
        <p class="text-muted">Scatta o carica una foto del fungo trovato: viene salvata solo sul tuo dispositivo, anche senza connessione.</p>

        <div class="card">
          <label class="field-label" for="foto-input">Foto</label>
          <input type="file" id="foto-input" accept="image/*" capture="environment">

          <label class="field-label" for="specie-select">Specie collegata (facoltativo)</label>
          <select id="specie-select">
            <option value="">— Nessuna / da determinare —</option>
            ${opzioniSpecie}
          </select>

          <label class="field-label" for="note-input">Appunti</label>
          <textarea id="note-input" class="note-input" placeholder="Es. trovato sotto abete rosso, 1600m, in gruppo di 5..."></textarea>

          <label style="display:flex;align-items:center;gap:8px;margin-top:12px;">
            <input type="checkbox" id="geo-checkbox" checked style="width:20px;height:20px;">
            Includi posizione GPS attuale (se disponibile)
          </label>

          <button type="button" class="btn btn-block" id="btn-salva-scatto" style="margin-top:14px;">Salva nel diario</button>
        </div>

        <h2 class="section-title">📚 Uscite salvate</h2>
        <div id="diario-lista"><p class="text-muted">Caricamento...</p></div>
      `;
    },
    afterRender() {
      const fotoInput = document.getElementById("foto-input");
      const specieSelect = document.getElementById("specie-select");
      const noteInput = document.getElementById("note-input");
      const geoCheckbox = document.getElementById("geo-checkbox");
      const btnSalva = document.getElementById("btn-salva-scatto");
      const lista = document.getElementById("diario-lista");

      async function ricaricaLista() {
        const entries = await FunghiCamera.elencoDiario();
        if (entries.length === 0) {
          lista.innerHTML = `<div class="empty-state"><div class="empty-icon">🗒️</div><p>Nessuna uscita salvata ancora.</p></div>`;
          return;
        }
        lista.innerHTML = entries
          .map((e) => {
            const specie = e.specieId ? FunghiData.getById(e.specieId) : null;
            const geoTxt = FunghiCamera.formattaGeo(e.geo);
            return `
              <div class="diario-entry" data-id="${e.id}">
                <img src="${e.fotoUrl}" alt="Foto diario del ${FunghiCamera.formattaData(e.data)}">
                <div style="flex:1;min-width:0;">
                  <div class="diario-meta">${FunghiCamera.formattaData(e.data)}${geoTxt ? " · 📍 " + geoTxt : ""}</div>
                  ${specie ? `<div style="font-weight:700;margin-bottom:3px;">${escapeHtml(specie.nomi_comuni[0])}</div>` : ""}
                  ${e.note ? `<div class="diario-note">${escapeHtml(e.note)}</div>` : `<div class="text-muted diario-note">Nessun appunto</div>`}
                  <div class="diario-actions">
                    ${specie ? `<button type="button" class="vai-scheda" data-id="${specie.id}">Apri scheda</button>` : ""}
                    <button type="button" class="elimina-voce" data-id="${e.id}">Elimina</button>
                  </div>
                </div>
              </div>`;
          })
          .join("");

        lista.querySelectorAll(".elimina-voce").forEach((btn) =>
          btn.addEventListener("click", async () => {
            await FunghiCamera.eliminaVoce(Number(btn.dataset.id));
            ricaricaLista();
          })
        );
        lista.querySelectorAll(".vai-scheda").forEach((btn) =>
          btn.addEventListener("click", () => {
            location.hash = `#/specie/${btn.dataset.id}`;
          })
        );
      }

      btnSalva.addEventListener("click", async () => {
        const file = fotoInput.files[0];
        if (!file) {
          window.mostraToast("Seleziona o scatta prima una foto.");
          return;
        }
        btnSalva.disabled = true;
        btnSalva.textContent = "Salvataggio...";
        try {
          await FunghiCamera.salvaScatto({
            file,
            note: noteInput.value,
            specieId: specieSelect.value || null,
            includiPosizione: geoCheckbox.checked,
          });
          fotoInput.value = "";
          noteInput.value = "";
          specieSelect.value = "";
          window.mostraToast("Uscita salvata nel diario ✓");
          ricaricaLista();
        } catch (err) {
          window.mostraToast("Errore nel salvataggio: " + err.message);
        } finally {
          btnSalva.disabled = false;
          btnSalva.textContent = "Salva nel diario";
        }
      });

      ricaricaLista();
    },
  };

  // ===================================================================
  // ASSISTENTE AI (solo online)
  // ===================================================================
  const ViewAI = {
    render() {
      return `
        <h1>Assistente AI (opzionale)</h1>
        <p class="text-muted">Riconoscimento tramite servizio esterno online (es. Kindwise mushroom.id). Richiede connessione e una tua API key personale.</p>
        <div id="ai-root"><p class="text-muted">Caricamento...</p></div>
      `;
    },
    async afterRender() {
      const root = document.getElementById("ai-root");

      if (!navigator.onLine) {
        root.innerHTML = `
          <div class="offline-block card">
            <div class="empty-icon">📡</div>
            <h2>Sei offline</h2>
            <p>L'assistente AI richiede una connessione internet. Usa il <a href="#/guidato">Riconoscimento guidato</a>, che funziona senza rete.</p>
          </div>`;
        return;
      }

      const configurato = await FunghiAI.isConfigurato();
      const { endpoint, apiKey } = await FunghiAI.getConfig();

      root.innerHTML = `
        <div class="card">
          <h2 class="mt-0">⚙️ Configurazione servizio</h2>
          <p class="text-muted">Inserisci l'endpoint e la API key del servizio di riconoscimento (es. Kindwise mushroom.id). La chiave resta salvata solo su questo dispositivo.</p>
          <label class="field-label" for="ai-endpoint">Endpoint API</label>
          <input type="url" id="ai-endpoint" placeholder="https://mushroom.id/api/v1/identification" value="${escapeHtml(endpoint)}">
          <label class="field-label" for="ai-apikey">API key</label>
          <input type="password" id="ai-apikey" placeholder="La tua API key" value="${escapeHtml(apiKey)}">
          <button type="button" class="btn btn-secondary btn-block" id="btn-salva-config" style="margin-top:12px;">Salva configurazione</button>
        </div>

        ${configurato ? `
        <div class="card">
          <h2 class="mt-0">📸 Analizza una foto</h2>
          <input type="file" id="ai-foto-input" accept="image/*" capture="environment">
          <button type="button" class="btn btn-block" id="btn-analizza" style="margin-top:12px;">Analizza foto</button>
          <div id="ai-risultati" style="margin-top:16px;"></div>
        </div>` : `<div class="empty-state"><p>Configura endpoint e API key qui sopra per attivare l'analisi foto.</p></div>`}
      `;

      document.getElementById("btn-salva-config").addEventListener("click", async () => {
        const endpointVal = document.getElementById("ai-endpoint").value.trim();
        const apiKeyVal = document.getElementById("ai-apikey").value.trim();
        await FunghiAI.setConfig({ endpoint: endpointVal, apiKey: apiKeyVal });
        window.mostraToast("Configurazione salvata ✓");
        ViewAI.afterRender();
      });

      const btnAnalizza = document.getElementById("btn-analizza");
      if (btnAnalizza) {
        btnAnalizza.addEventListener("click", async () => {
          const fileInput = document.getElementById("ai-foto-input");
          const file = fileInput.files[0];
          const risultatiEl = document.getElementById("ai-risultati");
          if (!file) {
            window.mostraToast("Seleziona prima una foto.");
            return;
          }
          btnAnalizza.disabled = true;
          btnAnalizza.textContent = "Analisi in corso...";
          risultatiEl.innerHTML = "";
          try {
            const candidati = await FunghiAI.identifica(file);
            if (candidati.length === 0) {
              risultatiEl.innerHTML = `<p class="text-muted">Il servizio non ha restituito candidati.</p>`;
            } else {
              risultatiEl.innerHTML = candidati
                .slice(0, 5)
                .map((c) => {
                  const pct = Math.round(c.confidenza * 100);
                  const link = c.specieLocale ? `#/specie/${c.specieLocale.id}` : null;
                  const nomeVisibile = c.specieLocale ? (c.specieLocale.nomi_comuni[0] + " · " + c.specieLocale.nome_scientifico) : c.nome;
                  const contenuto = `
                    <div style="flex:1;">
                      <div style="font-weight:700;">${escapeHtml(nomeVisibile)}</div>
                      ${!c.specieLocale ? `<div class="text-muted" style="font-size:.82rem;">Non presente nella scheda locale</div>` : ""}
                      <div class="conf-bar-wrap"><div class="conf-bar" style="width:${pct}%;"></div></div>
                    </div>
                    <div class="conf-pct">${pct}%</div>`;
                  return link
                    ? `<a class="ai-candidato" href="${link}">${contenuto}</a>`
                    : `<div class="ai-candidato">${contenuto}</div>`;
                })
                .join("");
            }
          } catch (err) {
            const msg = err.message === "NON_CONFIGURATO"
              ? "Configura prima endpoint e API key."
              : err.message === "OFFLINE"
              ? "Sei offline: riprova quando torni in connessione."
              : "Errore durante l'analisi: " + err.message;
            risultatiEl.innerHTML = `<div class="empty-state"><p>${escapeHtml(msg)}</p></div>`;
          } finally {
            btnAnalizza.disabled = false;
            btnAnalizza.textContent = "Analizza foto";
          }
        });
      }
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
          <p>FunghiAlpini è uno strumento personale di <strong>primo riconoscimento</strong> dei funghi durante escursioni in montagna. Funziona completamente offline dopo il primo caricamento: catalogo, schede, confronto sosia e riconoscimento guidato non richiedono connessione.</p>
          <p>L'app include un catalogo di specie comuni sull'arco alpino, un riconoscimento guidato basato sui caratteri visibili (colore, imenoforo, anello, volva, habitat, stagione, viraggio) e un diario fotografico personale salvato solo sul tuo dispositivo.</p>
        </div>

        <div class="disclaimer-box">
          ⚠️ Strumento di supporto al riconoscimento — per il consumo, far verificare i funghi da un esperto o all'Ispettorato Micologico ASL.
        </div>

        <div class="card">
          <h2 class="mt-0">Come usarla in sicurezza</h2>
          <p>1. Osserva con attenzione tutti i caratteri: cappello, imenoforo, gambo, anello, volva (scavando la base), carne, viraggio, odore.</p>
          <p>2. Usa il Riconoscimento guidato per restringere i candidati e leggi sempre la sezione "Sosia" delle schede.</p>
          <p>3. In caso di dubbio anche minimo, NON consumare il fungo.</p>
          <p>4. Prima di mangiare qualunque raccolta, fai sempre verificare i funghi da un micologo dell'Ispettorato Micologico della tua ASL: il servizio è gratuito in tutta Italia.</p>
        </div>

        <div class="card">
          <h2 class="mt-0">Dati e privacy</h2>
          <p>Foto e appunti del diario restano salvati solo su questo dispositivo (IndexedDB), non vengono mai inviati altrove salvo tua scelta esplicita di usare l'Assistente AI, che invia la singola foto analizzata al servizio esterno configurato.</p>
        </div>
      `;
    },
    afterRender() {},
  };

  return {
    escapeHtml,
    badgeHtml,
    ViewCatalogo,
    ViewSpecie,
    ViewGuidato,
    ViewDiario,
    ViewAI,
    ViewInfo,
  };
})();
