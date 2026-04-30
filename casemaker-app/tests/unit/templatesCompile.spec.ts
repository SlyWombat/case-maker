import { describe, it, expect } from 'vitest';
import { TEMPLATES } from '@/library/templates';
import { compileProject } from '@/engine/compiler/ProjectCompiler';
import type { BuildOp, BuildPlan } from '@/engine/compiler/buildPlan';

/**
 * Issue #88 — vitest companion to the Playwright templates-smoke harness.
 *
 * Iterates every entry in TEMPLATES, runs compileProject on the resulting
 * project, and walks the BuildPlan tree asserting structural invariants:
 *
 *   - every node's op tree is reachable
 *   - no zero-extent cubes (all dims > 0)
 *   - no union/difference/intersection with an empty children array
 *   - no nested mesh ops with empty position buffers, or position counts not
 *     a multiple of 3 (xyz triples) and indices not a multiple of 3
 *
 * Catches BuildPlan-shape regressions on every push without needing the
 * worker round-trip. The Playwright harness covers the post-Manifold
 * componentCount > 1 / loose-piece failure mode separately.
 */

interface PlanIssue {
  templateId: string;
  nodeId: string;
  path: string;
  message: string;
}

function walk(
  op: BuildOp,
  templateId: string,
  nodeId: string,
  path: string,
  issues: PlanIssue[],
): void {
  switch (op.kind) {
    case 'cube': {
      const [x, y, z] = op.size;
      if (!(x > 0) || !(y > 0) || !(z > 0)) {
        issues.push({
          templateId,
          nodeId,
          path,
          message: `cube has non-positive extent: [${x}, ${y}, ${z}]`,
        });
      }
      return;
    }
    case 'cylinder': {
      if (!(op.height > 0)) {
        issues.push({
          templateId,
          nodeId,
          path,
          message: `cylinder has non-positive height: ${op.height}`,
        });
      }
      const r = Math.max(op.radiusLow, op.radiusHigh ?? op.radiusLow);
      if (!(r > 0)) {
        issues.push({
          templateId,
          nodeId,
          path,
          message: `cylinder has non-positive radius: ${op.radiusLow}`,
        });
      }
      return;
    }
    case 'translate':
      walk(op.child, templateId, nodeId, `${path}/translate`, issues);
      return;
    case 'rotate':
      walk(op.child, templateId, nodeId, `${path}/rotate`, issues);
      return;
    case 'scale':
      walk(op.child, templateId, nodeId, `${path}/scale`, issues);
      return;
    case 'mesh': {
      if (op.positions.length === 0) {
        issues.push({
          templateId,
          nodeId,
          path,
          message: 'mesh has empty positions buffer',
        });
      }
      // positions is a flat xyz Float32Array — must be a multiple of 3.
      if (op.positions.length % 3 !== 0) {
        issues.push({
          templateId,
          nodeId,
          path,
          message: `mesh positions length ${op.positions.length} not multiple of 3`,
        });
      }
      // The issue text mentions `% 9 !== 0` (positions length per triangle when
      // un-indexed). This compiler uses indexed meshes, so the relevant check
      // is on indices: triangles come in triples.
      if (op.indices.length === 0) {
        issues.push({
          templateId,
          nodeId,
          path,
          message: 'mesh has empty indices buffer',
        });
      }
      if (op.indices.length % 3 !== 0) {
        issues.push({
          templateId,
          nodeId,
          path,
          message: `mesh indices length ${op.indices.length} not multiple of 3`,
        });
      }
      return;
    }
    case 'union':
    case 'difference':
    case 'intersection': {
      if (op.children.length === 0) {
        issues.push({
          templateId,
          nodeId,
          path,
          message: `${op.kind} has empty children array`,
        });
        return;
      }
      op.children.forEach((c, i) => {
        walk(c, templateId, nodeId, `${path}/${op.kind}[${i}]`, issues);
      });
      return;
    }
  }
}

function inspectPlan(templateId: string, plan: BuildPlan): PlanIssue[] {
  const issues: PlanIssue[] = [];
  for (const node of plan.nodes) {
    walk(node.op, templateId, node.id, `nodes['${node.id}']`, issues);
  }
  return issues;
}

describe('Issue #88 — template compile smoke (BuildPlan well-formedness)', () => {
  it('TEMPLATES is non-empty (sanity)', () => {
    expect(TEMPLATES.length).toBeGreaterThan(0);
  });

  for (const tpl of TEMPLATES) {
    it(`${tpl.id} compiles to a well-formed BuildPlan`, () => {
      const project = tpl.build();
      const plan = compileProject(project);

      // Every plan must have at least one node with a reachable op tree.
      expect(plan.nodes.length, `${tpl.id} produced no nodes`).toBeGreaterThan(0);
      for (const node of plan.nodes) {
        expect(
          node.op,
          `${tpl.id} node ${node.id} missing op`,
        ).toBeTruthy();
      }

      const issues = inspectPlan(tpl.id, plan);
      const summary = issues
        .map((i) => `  - ${i.nodeId} @ ${i.path}: ${i.message}`)
        .join('\n');
      expect(
        issues,
        `${tpl.id} has BuildPlan shape issues:\n${summary}`,
      ).toEqual([]);
    });
  }
});
