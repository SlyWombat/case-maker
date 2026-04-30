import { describe, it, expect } from 'vitest';
import { createDefaultProject } from '@/store/projectStore';
import { parseProject, serializeProject } from '@/store/persistence';

/**
 * Issue #82 — every fresh project starts with an editable copy of the
 * built-in profile (no Clone-for-editing click needed). Pre-#82 the board
 * was a deep copy but kept builtin: true and the original id; the editor
 * gated all writes on builtin === false. Now createDefaultProject inlines
 * the same transformation cloneBoardForEditing applied: fresh id,
 * builtin: false, clonedFrom for HAT compatibility, source dropped.
 */
describe('Issue #82 — createDefaultProject auto-clones the board for editing', () => {
  it('day-1 board is editable (builtin: false)', () => {
    const project = createDefaultProject('rpi-4b');
    expect(project.board.builtin).toBe(false);
  });

  it('day-1 board records clonedFrom so HAT compatibility still resolves', () => {
    const project = createDefaultProject('rpi-4b');
    expect(project.board.clonedFrom).toBe('rpi-4b');
  });

  it('day-1 board id is fresh (does not collide with the built-in id)', () => {
    const project = createDefaultProject('rpi-4b');
    expect(project.board.id).not.toBe('rpi-4b');
    expect(project.board.id.startsWith('custom-rpi-4b-')).toBe(true);
  });

  it('two consecutive calls produce different board ids (id uniqueness)', () => {
    const a = createDefaultProject('rpi-4b');
    const b = createDefaultProject('rpi-4b');
    expect(a.board.id).not.toBe(b.board.id);
  });

  it('day-1 board drops the upstream source URL (it belongs to the built-in)', () => {
    const project = createDefaultProject('rpi-4b');
    expect(project.board.source).toBeUndefined();
  });

  it('round-trip via serializeProject → parseProject keeps builtin: false', () => {
    const project = createDefaultProject('rpi-4b');
    const text = serializeProject(project);
    const parsed = parseProject(text);
    expect(parsed.board.builtin).toBe(false);
    expect(parsed.board.clonedFrom).toBe('rpi-4b');
    expect(parsed.board.id).toBe(project.board.id);
  });
});
