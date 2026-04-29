// Issue #83 — surface a warning when any node in the build has more than
// one disjoint solid component. A clean shell or lid has exactly 1; >1
// means something broke loose from its parent (a snap-fit lip not unioned
// with the wall, an orphaned cutout fragment, etc.) and will fall to the
// build plate as a loose part in the slicer.
//
// Warning only — never blocks export. Some users will know they have a
// floater (e.g. a custom cutout that creates an island) and want to clean
// it up in the slicer manually.

import { useJobStore } from '@/store/jobStore';

export function FloatersBanner() {
  const nodes = useJobStore((s) => s.nodes);
  const offenders: { id: string; count: number }[] = [];
  for (const [id, node] of nodes.entries()) {
    const c = node.stats.componentCount;
    if (c !== undefined && c > 1) offenders.push({ id, count: c });
  }
  if (offenders.length === 0) return null;
  const total = offenders.reduce((s, o) => s + o.count, 0);
  return (
    <div
      className="placement-banner placement-banner--warning"
      data-testid="floaters-banner"
      data-severity="warning"
    >
      <div className="placement-banner__head">
        <span className="placement-banner__count">
          {total} loose part{total > 1 ? 's' : ''} detected
        </span>
      </div>
      <ul className="placement-banner__list">
        {offenders.map((o) => (
          <li key={o.id} data-severity="warning">
            <span className="placement-banner__sev">[loose]</span>{' '}
            <code>{o.id}</code> mesh has {o.count} disconnected pieces — the slicer
            will treat each as a separate part. Likely cause: a feature
            (snap-fit lip, custom cutout, ventilation slot) doesn't overlap
            its parent body. Export still works; clean up in your slicer if
            needed.
          </li>
        ))}
      </ul>
    </div>
  );
}
