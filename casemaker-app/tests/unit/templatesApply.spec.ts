import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore, clearHistory, createDefaultProject } from '@/store/projectStore';
import { TEMPLATES, findTemplate } from '@/library/templates';

/**
 * Issue #31 — apply path mirrors what TemplatesPanel does (without React):
 * setProject + clearHistory. Asserts that after the call, project state has
 * been replaced by the template build output.
 */
describe('Issue #31 — TemplatesPanel apply replaces the active project', () => {
  beforeEach(() => {
    useProjectStore.getState().setProject(createDefaultProject('rpi-4b'));
    clearHistory();
  });

  for (const tpl of TEMPLATES) {
    it(`applying template "${tpl.id}" replaces the project state with the template build output`, () => {
      const t = findTemplate(tpl.id)!;
      const before = useProjectStore.getState().project.name;
      const project = t.build();
      useProjectStore.getState().setProject(project);
      clearHistory();
      const after = useProjectStore.getState().project;
      expect(after.name).toBe(project.name);
      expect(after.name).not.toBe(before);
      expect(after.board.id).toBe(project.board.id);
    });
  }
});
