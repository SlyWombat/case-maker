import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

/**
 * Issue #89 — accessible-by-default field wrapper.
 *
 * Renders a visible `<label>` (associated with the wrapped input via `htmlFor`
 * + `id`), an optional unit suffix span (e.g. "mm" / "deg" / "count"), and
 * propagates the hint string to BOTH the input (via `title=`, surfacing as a
 * native browser tooltip on hover) AND the label (via a hidden span linked
 * with `aria-describedby`, so screen readers announce it).
 *
 * Auto-id behaviour: if the child input has no `id`, this component generates
 * one with `useId()` and threads it through `htmlFor`. Callers can still
 * override by setting `id` on the child.
 *
 * Layout: stacked by default (label above input). Pass `inline` for compact
 * rows where label sits to the left.
 */
export interface LabelledFieldProps {
  /** Visible label text, e.g. "Wall thickness". */
  label: string;
  /** Hover-tooltip + a11y description. Should explain semantics + units. */
  hint?: string;
  /** Optional unit suffix surfaced inline next to the field, e.g. "mm". */
  unit?: string;
  /** Lay out as a horizontal row instead of stacked. */
  inline?: boolean;
  /** Test id for the wrapping element. */
  testId?: string;
  /** Single input/select/textarea (or any element that can take an id + aria attrs). */
  children: ReactNode;
}

export function LabelledField({
  label,
  hint,
  unit,
  inline = false,
  testId,
  children,
}: LabelledFieldProps): ReactElement {
  const generatedId = useId();
  const hintId = useId();

  // Pull the (single) child element so we can decorate it with id, title, and
  // aria-describedby. If multiple children are passed (rare; e.g. a slider
  // with twin inputs), we leave them alone — the calling component is then
  // responsible for wiring up its own ids.
  const child = Children.only(children);
  let inputId: string | undefined;
  let decoratedChild: ReactNode = child;
  if (isValidElement<{ id?: string; title?: string; 'aria-describedby'?: string }>(child)) {
    inputId = child.props.id ?? generatedId;
    const existingDescribedBy = child.props['aria-describedby'];
    decoratedChild = cloneElement(child, {
      id: inputId,
      title: hint ?? child.props.title,
      'aria-describedby': hint
        ? existingDescribedBy
          ? `${existingDescribedBy} ${hintId}`
          : hintId
        : existingDescribedBy,
    });
  }

  const className = inline ? 'labelled-field labelled-field--inline' : 'labelled-field';

  return (
    <div className={className} data-testid={testId}>
      <label className="labelled-field__label" htmlFor={inputId}>
        <span className="labelled-field__text">{label}</span>
        {unit && <span className="labelled-field__unit">({unit})</span>}
      </label>
      <div className="labelled-field__control">{decoratedChild}</div>
      {hint && (
        <span id={hintId} className="labelled-field__hint-sr">
          {hint}
        </span>
      )}
    </div>
  );
}
