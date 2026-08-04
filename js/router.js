/**
 * router.js — micro-router basato su hash, senza dipendenze esterne.
 * Route supportate:
 *   #/catalogo[?q=...]
 *   #/specie/:id
 *   #/guidato
 *   #/diario
 *   #/ai
 *   #/info
 */
const FunghiRouter = (() => {
  const viewRoot = document.getElementById("view-root");

  function parseHash() {
    const raw = location.hash.replace(/^#/, "") || "/catalogo";
    const [pathPart, queryPart] = raw.split("?");
    const segments = pathPart.split("/").filter(Boolean);
    const query = Object.fromEntries(new URLSearchParams(queryPart || ""));
    return { segments, query };
  }

  function aggiornaNavAttiva(routeName) {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.route === routeName);
    });
  }

  async function render() {
    const { segments, query } = parseHash();
    const [primo, secondo] = segments;

    let view, params = {}, routeName = primo || "catalogo";

    switch (primo) {
      case "specie":
        view = FunghiViews.ViewSpecie;
        params = { id: secondo };
        routeName = "catalogo"; // la scheda specie fa parte del percorso "catalogo"
        break;
      case "guidato":
        view = FunghiViews.ViewGuidato;
        break;
      case "diario":
        view = FunghiViews.ViewDiario;
        break;
      case "ai":
        view = FunghiViews.ViewAI;
        break;
      case "info":
        view = FunghiViews.ViewInfo;
        break;
      case "catalogo":
      default:
        view = FunghiViews.ViewCatalogo;
        params = { query: query.q || "" };
        routeName = "catalogo";
        break;
    }

    viewRoot.innerHTML = view.render(params);
    await view.afterRender(params);
    aggiornaNavAttiva(routeName);
    window.scrollTo(0, 0);
    viewRoot.focus({ preventScroll: true });
  }

  function init() {
    window.addEventListener("hashchange", render);
    render();
  }

  return { init, render };
})();
