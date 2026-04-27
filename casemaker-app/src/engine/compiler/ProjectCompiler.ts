import type { Project } from '@/types';
import type { BuildPlan, BuildNode, BuildOp } from './buildPlan';
import { union, difference, translate } from './buildPlan';
import { buildOuterShell } from './caseShell';
import { computeBossPlacements, buildBossesUnion } from './bosses';
import { buildLid, computeLidDims } from './lid';
import { buildPortCutoutsForProject } from './ports';
import { buildSlidingRails } from './slidingRails';
import { buildVentilationCutouts } from './ventilation';
import { buildExternalAssetOps } from './externalAssets';

export function compileProject(project: Project): BuildPlan {
  const { board, case: caseParams, ports, externalAssets } = project;

  const shellOuter = buildOuterShell(board, caseParams);
  const bossPlacements = computeBossPlacements(board, caseParams);
  const bossOps = buildBossesUnion(bossPlacements);
  const railOps = caseParams.joint === 'sliding' ? buildSlidingRails(board, caseParams) : [];
  const assetOps = buildExternalAssetOps(externalAssets);
  const additive = [shellOuter, ...bossOps, ...railOps, ...assetOps.unionOps];

  const cutoutOps: BuildOp[] = [
    ...buildPortCutoutsForProject(ports, board, caseParams),
    ...buildVentilationCutouts(board, caseParams),
    ...assetOps.subtractOps,
  ];

  let shellOp: BuildOp = additive.length > 1 ? union(additive) : shellOuter;
  if (cutoutOps.length > 0) {
    shellOp = difference([shellOp, ...cutoutOps]);
  }

  const nodes: BuildNode[] = [{ id: 'shell', op: shellOp }];

  const lidOp = buildLid(board, caseParams);
  const lidDims = computeLidDims(board, caseParams);
  nodes.push({
    id: 'lid',
    op: translate([0, 0, lidDims.zPosition + lidDims.liftAboveShell], lidOp),
  });

  return { nodes };
}
