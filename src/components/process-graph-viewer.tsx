"use client";

import { useEffect, useState } from "react";
import { ReactFlow, Background, Controls, Edge, Node, Position, BackgroundVariant } from "@xyflow/react";
import * as dagre from "dagre";

interface RawNode {
  id: string;
  label: string;
  action: string;
  role: string;
  system?: string;
}

interface RawEdge {
  source: string;
  target: string;
  condition?: string;
}

interface GraphData {
  raw_nodes: RawNode[];
  raw_edges: RawEdge[];
}

interface DiagnosticIssue {
  id: string;
  nodeIds: string[];
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  description: string;
  evidence: string;
}

interface ProcessGraphViewerProps {
  graph: GraphData | null;
  diagnostics: { issues: DiagnosticIssue[] } | null;
  selectedIssueId: string | null;
}

const nodeWidth = 200;
const nodeHeight = 76;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 60, nodesep: 40 });

  nodes.forEach((node) => dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight }));
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
  dagre.layout(dagreGraph);

  const isHorizontal = direction === "LR";
  const newNodes = nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
    };
  });

  return { nodes: newNodes, edges };
};

function getSeverityStyle(
  isCritical: boolean,
  isSelected: boolean
): React.CSSProperties {
  if (isSelected) {
    return {
      background: "rgba(245, 158, 11, 0.15)",
      border: "2px solid #f59e0b",
      boxShadow: "0 0 12px rgba(245, 158, 11, 0.3)",
    };
  }
  if (isCritical) {
    return {
      background: "rgba(239, 68, 68, 0.15)",
      border: "2px solid #ef4444",
      boxShadow: "0 0 8px rgba(239, 68, 68, 0.2)",
    };
  }
  return {
    background: "#111827",
    border: "1px solid #1f2937",
  };
}

export function ProcessGraphViewer({ graph, diagnostics, selectedIssueId }: ProcessGraphViewerProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (!graph?.raw_nodes) return;

    const initialNodes: Node[] = graph.raw_nodes.map((rn) => {
      const nodeIssues = diagnostics?.issues?.filter((i) => i.nodeIds.includes(rn.id)) ?? [];
      const isCritical = nodeIssues.some((i) => i.severity === "high" || i.severity === "critical");
      const isSelected = !!selectedIssueId && !!(diagnostics?.issues?.find(
        (i) => i.id === selectedIssueId && i.nodeIds.includes(rn.id)
      ));

      const label = (
        <div className="flex flex-col justify-center h-full w-full px-3">
          <strong className="text-xs font-semibold text-white truncate border-b border-gray-700 pb-1 mb-1">
            {rn.label}
          </strong>
          <div className="text-[10px] text-gray-400 truncate">
            {rn.role}{rn.system ? ` · ${rn.system}` : ""}
          </div>
        </div>
      );

      return {
        id: rn.id,
        data: { label },
        position: { x: 0, y: 0 },
        style: {
          width: nodeWidth,
          height: nodeHeight,
          borderRadius: "10px",
          color: "#f9fafb",
          transition: "all 0.25s ease",
          cursor: "default",
          ...getSeverityStyle(isCritical, isSelected),
        },
      };
    });

    const initialEdges: Edge[] = graph.raw_edges.map((re, idx) => ({
      id: `e-${re.source}-${re.target}-${idx}`,
      source: re.source,
      target: re.target,
      label: re.condition,
      labelStyle: { fill: "#9ca3af", fontSize: 10 },
      labelBgStyle: { fill: "#111827" },
      animated: true,
      style: { stroke: "#3b82f6", strokeWidth: 1.5 },
      markerEnd: { type: "arrowclosed" as any, color: "#3b82f6" },
    }));

    const layouted = getLayoutedElements(initialNodes, initialEdges, "TB");
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [graph, diagnostics, selectedIssueId]);

  if (!graph?.raw_nodes) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0d1220] text-quintia-text-secondary rounded-xl border border-quintia-border">
        <div className="text-center space-y-2">
          <svg viewBox="0 0 40 40" className="w-10 h-10 mx-auto text-quintia-border" fill="none">
            <rect x="4" y="4" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
            <rect x="22" y="4" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
            <rect x="13" y="22" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M11 11h18M20 11v11" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
          </svg>
          <p className="text-sm">No Process Graph Available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-quintia-border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1f2937" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
