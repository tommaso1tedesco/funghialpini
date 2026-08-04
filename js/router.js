/**
 * router.js — micro-router basato su hash, senza dipendenze esterne.
 * Route supportate: #/riconosci (default), #/impostazioni, #/info
 */
const FunghiRouter = (() => {
  const viewRoot = document.getElementById("view-root");

  function parseHash() {
    const raw = location.hash.replace(/^#/, "") || "/riconosci";
    return raw.split("/").filter(Boolean)[0] || "riconosci";
  }

  async function render() {
    const routeName = parseHash();
    let view;
    switch (routeName) {
      case "impostazioni":
        view = FunghiViews.ViewImpostazioni;
        break;
      case "info":
        view = FunghiViews.ViewInfo;
        break;
      case "riconosci":
      default:
        view = FunghiViews.ViewRiconosci;
        break;
    }

    viewRoot.innerHTML = view.render();
    await view.afterRender();
    window.scrollTo(0, 0);
    viewRoot.focus({ preventScroll: true });
  }

  function init() {
    window.addEventListener("hashchange", render);
    render();
  }

  return { init, render };
})();
