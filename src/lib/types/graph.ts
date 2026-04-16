export interface CanonicalGraphNode {
  id: string;
  label: string;
  type: "start" | "end" | "task" | "decision" | "parallel" | "subprocess";
  description?: string;
  metrics?: {
    avgDurationMinutes?: number;
    costPerExecution?: number;
    errorRate?: number;
  };
  position: { x: number; y: number }; // layout hint
  diagnosticIds?: string[]; // linked diagnostic issues
}

export interface CanonicalGraphEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  label?: string;
  type: "sequential" | "conditional" | "parallel" | "loop";
  condition?: string;
}

export interface CanonicalGraphOutput {
  nodes: CanonicalGraphNode[];
  edges: CanonicalGraphEdge[];
  metadata: {
    projectId: string;
    jobId: string;
    generatedAt: string; // ISO timestamp
    nodeCount: number;
    edgeCount: number;
  };
}
