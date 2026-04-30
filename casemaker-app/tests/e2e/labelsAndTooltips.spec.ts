import { test, expect } from './fixtures/caseMaker';

/**
 * Issue #89 — accessibility audit harness.
 *
 * Walks every visible <input> / <select> / <textarea> in the sidebar and
 * viewport overlays. Each control must satisfy BOTH:
 *
 *   1. Has a label: visible <label for="id">, aria-label, or aria-labelledby
 *      pointing at non-empty text.
 *   2. Has a description: title="…" attribute OR aria-describedby pointing at
 *      a non-empty text node. Disabled inputs still need this so users know
 *      WHY they're disabled (issue #83 host X/Y).
 *
 * The spec sets up rich state first — clones the board so the BoardEditor
 * row inputs render, enables ventilation, switches to snap-fit, adds one
 * antenna / fan / text label / cutout / snap catch / HAT — so the walker
 * exercises every conditional control. Without this setup, lots of inputs
 * would be hidden and the audit would silently miss them.
 *
 * If you're wondering why a particular control isn't covered, expand the
 * setup in `prepareRichState` first.
 */

const HOST_PCB_DISABLED_TESTIDS = new Set<string>([]); // (none whitelisted — disabled inputs must still have title=)

test.describe('Issue #89 — labels & tooltips audit', () => {
  test('every editable control has a label and a description', async ({ cm, page }) => {
    await cm.ready();

    // Skip the welcome overlay and load a board so the sidebar populates.
    await page.evaluate(async () => {
      await window.__caseMaker!.loadBuiltinBoard('rpi-4b');
    });

    // Make every conditional UI block visible so the walker doesn't skip
    // anything.
    await prepareRichState(page);

    // Wait one tick for React to flush the state changes.
    await page.waitForTimeout(200);

    const failures = await page.evaluate(({ disabledWhitelist }) => {
      function visible(el: HTMLElement): boolean {
        if (el.hidden) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none') return false;
        if (style.visibility === 'hidden') return false;
        // File inputs are intentionally display:none; they're driven via a
        // visible button. Skip those.
        if (el instanceof HTMLInputElement && el.type === 'file') return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return true;
      }

      function describe(el: HTMLElement): string {
        const tid = el.getAttribute('data-testid');
        if (tid) return `[data-testid="${tid}"]`;
        const id = el.id;
        if (id) return `#${id}`;
        const name = (el as HTMLInputElement).name;
        const cls = el.className?.toString().split(' ').filter(Boolean).slice(0, 2).join('.');
        return `${el.tagName.toLowerCase()}${name ? `[name=${name}]` : ''}${cls ? `.${cls}` : ''}`;
      }

      function getLabelText(el: HTMLElement): string {
        // 1. aria-label
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
        // 2. aria-labelledby
        const labelledBy = el.getAttribute('aria-labelledby');
        if (labelledBy) {
          const parts = labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
            .filter(Boolean);
          if (parts.length) return parts.join(' ');
        }
        // 3. <label for="id">
        if (el.id) {
          const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (lbl?.textContent?.trim()) return lbl.textContent.trim();
        }
        // 4. wrapping <label> — but exclude the input's own value, since
        //    `<label><input value="42"/>foo</label>` would otherwise count
        //    the "42" as label text. We collect only TEXT_NODE descendants
        //    that are siblings of the input itself.
        const wrap = el.closest('label');
        if (wrap && wrap !== el) {
          const walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT);
          let txt = '';
          while (walker.nextNode()) {
            const n = walker.currentNode;
            // Skip text inside the input/select/textarea itself.
            if (n.parentElement && (n.parentElement === el || el.contains(n.parentElement))) continue;
            txt += ` ${n.nodeValue?.trim() ?? ''}`;
          }
          txt = txt.trim();
          if (txt) return txt;
        }
        return '';
      }

      function getDescription(el: HTMLElement): string {
        const title = el.getAttribute('title');
        if (title && title.trim()) return title.trim();
        const describedBy = el.getAttribute('aria-describedby');
        if (describedBy) {
          const parts = describedBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
            .filter(Boolean);
          if (parts.length) return parts.join(' ');
        }
        return '';
      }

      const selectors = ['input', 'select', 'textarea'];
      const all = Array.from(document.querySelectorAll<HTMLElement>(selectors.join(',')));
      const visible_ = all.filter(visible);

      const failures: { selector: string; reason: string; tag: string; disabled: boolean }[] = [];
      for (const el of visible_) {
        // Skip range partner of a slider where the range itself is labelled
        // via aria-label — actually we DON'T skip, every control needs its
        // own label. The slider component sets aria-label on both halves.
        const tag = el.tagName.toLowerCase();
        const inputType = (el as HTMLInputElement).type ?? '';
        // Hidden inputs are non-interactive — skip.
        if (tag === 'input' && inputType === 'hidden') continue;
        // The dev hidden-text node we add in LabelledField is a span, not
        // matched here. OK.
        const tid = el.getAttribute('data-testid') ?? '';
        if (disabledWhitelist.includes(tid)) continue;

        const label = getLabelText(el);
        const desc = getDescription(el);
        const disabled = (el as HTMLInputElement).disabled === true;

        if (!label) {
          failures.push({
            selector: describe(el),
            reason: 'no label (need <label for>, aria-label, or aria-labelledby)',
            tag,
            disabled,
          });
          continue;
        }
        if (!desc) {
          failures.push({
            selector: describe(el),
            reason: `no description (need title= or aria-describedby) — label was "${label}"`,
            tag,
            disabled,
          });
        }
      }
      return failures;
    }, { disabledWhitelist: Array.from(HOST_PCB_DISABLED_TESTIDS) });

    if (failures.length) {
      const msg = failures
        .map((f) => `  - ${f.selector} (${f.tag}${f.disabled ? ', disabled' : ''}): ${f.reason}`)
        .join('\n');
      throw new Error(
        `Issue #89 a11y audit: ${failures.length} control(s) missing labels/tooltips:\n${msg}`,
      );
    }
    expect(failures.length).toBe(0);
  });
});

/**
 * Force every conditional UI surface to render so the audit covers them.
 *
 * - Clone the board so BoardEditorPanel exposes its full custom-board form.
 * - Switch joint to snap-fit so SnapType + SnapCatches show.
 * - Enable ventilation so vent surfaces / pattern / coverage show.
 * - Add one antenna / fan / text label / cutout / snap catch via the store
 *   (cheaper than clicking each "+ add" button).
 * - Add a HAT placement so HAT controls render.
 * - Pick a built-in display so the display sub-controls render.
 * - Open a port editor row so its detail inputs are visible.
 */
async function prepareRichState(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async () => {
    const api = window.__caseMaker!;
    // Clone for editing — BoardEditor inputs require this.
    await api.cloneBoardForEditing();

    // Snap-fit joint.
    await api.patchCase({ joint: 'snap-fit' });
  });

  // Use the visible "+ add" buttons for features that don't have a public
  // test API. This is more robust than mutating the project directly.
  // Each is wrapped in try/catch — missing a row just narrows the audit.
  for (const tid of [
    'add-antenna',
    'add-fan',
    'add-text-label',
    'add-custom-cutout',
    'add-snap-catch',
  ]) {
    const btn = page.getByTestId(tid);
    if (await btn.count()) {
      await btn.first().click();
    }
  }

  // Enable ventilation so the surfaces / pattern / coverage controls render.
  const ventToggle = page.getByTestId('ventilation-toggle');
  if (await ventToggle.count()) {
    const checked = await ventToggle.isChecked().catch(() => false);
    if (!checked) await ventToggle.check();
  }

  // Pick a built-in display so the display sub-controls render.
  const displaySelect = page.getByTestId('display-select');
  if (await displaySelect.count()) {
    const optionValues = await displaySelect
      .locator('option')
      .evaluateAll((opts) =>
        (opts as HTMLOptionElement[]).map((o) => o.value).filter((v) => v),
      );
    if (optionValues.length) {
      await displaySelect.selectOption(optionValues[0]!);
    }
  }

  // Add a HAT via the public test API.
  await page.evaluate(async () => {
    const ids = ['adafruit-rpi-rfm95-radio-bonnet', 'pi-supply-pirelay'];
    for (const id of ids) {
      try {
        const placementId = await window.__caseMaker!.addHat(id);
        if (placementId) return placementId;
      } catch {
        // try next
      }
    }
    return '';
  });

  // Expand the first port editor row (if any) so its inner inputs render.
  const portExpand = page.locator('[data-testid$="-expand"]').first();
  if (await portExpand.count()) {
    await portExpand.click();
  }
}
