import { EdgeDefinition } from 'cytoscape';

import { CouplingResult } from '../../model/coupling-result';
import { GraphType } from '../../model/graph-type';
import { CouplingNodeDefinition } from '../../ui/graph/graph';

export function createEdges(
  result: CouplingResult,
  type: GraphType,
  minConnections: number
): EdgeDefinition[] {
  const edges: EdgeDefinition[] = [];
  const delimiter = type === 'structure' ? '→' : '↔';
  for (let i = 0; i < result.matrix.length; i++) {
    for (let j = 0; j < result.matrix.length; j++) {
      if (result.matrix[i][j] >= minConnections) {
        edges.push({
          data: {
            source: '' + i,
            target: '' + j,
            weight: result.matrix[i][j],
            tooltip: `${result.dimensions[i]
              .split('/')
              .at(-1)} ${delimiter} ${result.dimensions[j]
              .split('/')
              .at(-1)}<br><br>${result.matrix[i][j]} connections`,
          },
        });
      }
    }
  }
  return edges;
}

export function createGroups(dimensions: string[]): CouplingNodeDefinition[] {
  const groupNodes: CouplingNodeDefinition[] = [];
  const groups = findGroups(dimensions);

  groups.sort();

  for (let i = 0; i < groups.length; i++) {
    const label = groups[i];

    const node: CouplingNodeDefinition = {
      data: {
        id: 'G' + i,
        label: label.split('/').at(-1) || '',
        tooltip: label,
        dimension: label,
      },
      classes: 'group',
    };

    const parent = findParent(groupNodes, label);

    if (parent) {
      node.data.parent = parent.data.id;
    }

    groupNodes.push(node);
  }
  return groupNodes;
}

export function createNodes(
  result: CouplingResult,
  groups: CouplingNodeDefinition[],
  type: GraphType
): CouplingNodeDefinition[] {
  const nodes: CouplingNodeDefinition[] = [];

  for (let i = 0; i < result.dimensions.length; i++) {
    const label = result.dimensions[i];

    const soc = result.sumOfCoupling ? result.sumOfCoupling[i] : -1;
    const relSoc = soc !== null ? soc / result.fileCount[i] : -1;

    const node: CouplingNodeDefinition = {
      data: {
        id: '' + i,
        label: label.split('/').at(-1) || '',
        tooltip:
          type === 'structure'
            ? `${label}
  <br><br>${result.fileCount[i]} source files
  <br>Cohesion: ${result.cohesion[i]}%
  <br>Outgoing Deps: ${sumRow(result.matrix, i)}
  <br>Incoming Deps: ${sumCol(result.matrix, i)}
  `
            : `${label}
  <br><br>${result.fileCount[i]} commits
  <br>Sum of Coupling (SoC): ${soc}
  <br>SoC per Commit: ${Math.round(relSoc * 100)}%
  `,
        dimension: label,
      },
    };

    const parent = findParent(groups, label);

    if (parent) {
      node.data.parent = parent.data.id;
    }

    nodes.push(node);
  }
  return nodes;
}

function sumRow(matrix: number[][], nodeIndex: number): number {
  let sum = 0;
  for (let i = 0; i < matrix.length; i++) {
    if (i !== nodeIndex) {
      sum += matrix[nodeIndex][i];
    }
  }
  return sum;
}

function sumCol(matrix: number[][], nodeIndex: number): number {
  let sum = 0;
  for (let i = 0; i < matrix.length; i++) {
    if (i !== nodeIndex) {
      sum += matrix[i][nodeIndex];
    }
  }
  return sum;
}

export function findParent(groups: CouplingNodeDefinition[], label: string) {
  let parent = null;

  const candParents = groups.filter((cp) =>
    label.startsWith(cp.data.dimension + '/')
  );
  if (candParents.length > 0) {
    parent = candParents.reduce(
      (prev, curr) =>
        curr.data.dimension.length > prev.data.dimension.length ? curr : prev,
      candParents[0]
    );
  }
  return parent;
}

function findGroups(labels: string[]): string[] {
  const groups = new Set<string>();
  for (const label of labels) {
    const parts = label.split('/');
    const group = parts.slice(0, parts.length - 1).join('/');
    groups.add(group);
  }
  return Array.from(groups);
}
