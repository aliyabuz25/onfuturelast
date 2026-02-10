(() => {
  const BASE_WIDTH = 1440; // reference width (approx. 15.6" view)
  const MIN_TARGET_WIDTH = 1200; // below this, skip scaling to avoid breakage
  const MIN_SCALE = 0.50;
  const MAX_SCALE = 1;
  const SERVICES_COLS = 4;
  const SERVICES_CARD_MIN = 302;
  const SERVICES_GAP = 24;
  const SERVICES_MIN_SCALE = 0.8;
  const PAD_MIN = 24;
  const PAD_MAX = 80;

  const octoLog = (stage, detail = "") => {
    const prefix = "OctopusBackendEngine";
    const stamp = new Date().toISOString();
    console.log(`[${prefix}] ${stamp} :: ${stage}${detail ? " -> " + detail : ""}`);
  };

  console.log(
    [
      "      .-\"\"\"-.",
      "     /  . .  \\",
      "    |   ___   |   OctopusBackendEngine",
      "    |  (___)  |   viewport optimizer booting...",
      "     \\  ___  /",
      "      `-._.-'",
    ].join("\\n")
  );

  let viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    document.head.appendChild(viewportMeta);
  }
  octoLog("viewport-meta-found");

  function applyScale() {
    // Disabled viewport scaling to allow proper responsive reflowing
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
    octoLog("scale-skipped", "using standard device-width viewport");
  }

  function applyServicesGridFit() {
    const grid = document.querySelector('.services-grid-inner');
    if (!grid) return;

    const width = window.innerWidth || document.documentElement.clientWidth || BASE_WIDTH;
    if (width < 992) {
      grid.style.transform = '';
      grid.style.width = '';
      return;
    }
    const available = grid.parentElement?.clientWidth || window.innerWidth || BASE_WIDTH;
    const needed = SERVICES_COLS * SERVICES_CARD_MIN + (SERVICES_COLS - 1) * SERVICES_GAP;
    const shouldScale = available < needed;
    const rawScale = available / needed;
    const scale = shouldScale ? Math.max(SERVICES_MIN_SCALE, Math.min(1, rawScale)) : 1;

    if (scale < 1) {
      grid.style.transform = `scale(${scale})`;
      grid.style.transformOrigin = 'top center';
      grid.style.width = `${(100 / scale).toFixed(3)}%`;
    } else {
      grid.style.transform = '';
      grid.style.width = '';
    }

    octoLog("services-grid-fit", `available=${available}px needed=${needed}px scale=${scale.toFixed(3)} active=${shouldScale}`);
  }

  let padStyle;
  const padSelectors = [
    '.services-grid',
    '.visa-section',
    '.scholarship',
    '.footer-inner',
    '.hero-content',
  ].join(', ');

  function ensurePadStyle() {
    if (padStyle) return;
    padStyle = document.createElement('style');
    padStyle.textContent = `
      :root { --dyn-pad: ${PAD_MAX}px; }
      ${padSelectors} {
        padding-left: var(--dyn-pad) !important;
        padding-right: var(--dyn-pad) !important;
      }
    `;
    document.head.appendChild(padStyle);
    octoLog("pad-style-injected");
  }

  function applyDynamicPadding() {
    const width = window.innerWidth || document.documentElement.clientWidth || BASE_WIDTH;
    if (width < 992) {
      if (padStyle) padStyle.remove();
      document.documentElement.style.removeProperty('--dyn-pad');
      return;
    }
    ensurePadStyle();
    const ratio = Math.min(1, width / BASE_WIDTH);
    const pad = Math.max(PAD_MIN, Math.round(PAD_MAX * ratio));
    document.documentElement.style.setProperty('--dyn-pad', `${pad}px`);
    octoLog("pad-applied", `width=${width}px pad=${pad}px`);
  }

  document.addEventListener('DOMContentLoaded', () => {
    octoLog("dom-loaded");
    applyScale();
    applyServicesGridFit();
    applyDynamicPadding();
  }, { once: true });
})();
