import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const DISCOVER_CANVAS_KEY = "discover_canvas";

/** Strip non-serializable fields from nodes for sessionStorage / Supabase */
function serializableNodes(nodes: Node[]): Node[] {
  return nodes.map((n) => ({
    ...n,
    data:
      n.type === "idea-card"
        ? (() => {
            const { onSubmitPrompt, onCreateVariations, onAuthRequired, ...rest } = n.data as Record<string, unknown>;
            return rest;
          })()
        : n.data,
  }));
}

/* ------------------------------------------------------------------ */
/*  Height estimation for layout (heuristic, good enough for v1)      */
/* ------------------------------------------------------------------ */

const CARD_WIDTH = 385;
const PROMPT_WIDTH = 582;
const COMPANY_WIDTH = 582;
const COMPANY_HEIGHT = 112;
const FIRST_ROW_GAP = 150;
const MIN_GAP = 40; // minimum gap between adjacent columns
const VERTICAL_GAP = 80;

function estimateNodeHeight(node: Node): number {
  if (node.type === "company-header") return COMPANY_HEIGHT;

  if (node.type === "prompt-bubble") {
    const text: string = (node.data as Record<string, unknown>).prompt as string ?? "";
    const charsPerLine = 55; // ~55 chars per line at 582px with padding
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
    return lines * 22 + 36; // line-height + padding
  }

  if (node.type === "idea-card") {
    const title: string = (node.data as Record<string, unknown>).title as string ?? "";
    const desc: string = (node.data as Record<string, unknown>).description as string ?? "";
    const titleLines = title ? Math.max(1, Math.ceil(title.length / 30)) : 0;
    const descLines = Math.max(1, Math.ceil(desc.length / 50));
    return (titleLines + descLines) * 20 + 48 + (title ? 12 : 0); // padding + gap
  }

  return 100;
}

/* ------------------------------------------------------------------ */
/*  Layout: tree structure with vertical chains below each idea card  */
/* ------------------------------------------------------------------ */

function nodeWidth(node: Node): number {
  if (node.type === "prompt-bubble") return PROMPT_WIDTH;
  if (node.type === "company-header") return COMPANY_WIDTH;
  return CARD_WIDTH;
}

/**
 * Walk a sub-tree and return the width it needs.
 * - Single child → classic chain (widest node wins).
 * - Multiple children → they fan out horizontally, so the width is the sum
 *   of every child's sub-tree width + gaps between them.
 */
function maxChainWidth(
  rootId: string,
  nodeMap: Map<string, Node>,
  childrenMap: Map<string, string[]>
): number {
  const node = nodeMap.get(rootId);
  const ownWidth = node ? nodeWidth(node) : CARD_WIDTH;
  const childIds = childrenMap.get(rootId) || [];

  if (childIds.length === 0) return ownWidth;

  if (childIds.length === 1) {
    // Linear chain – just take the max of own and descendant widths
    return Math.max(ownWidth, maxChainWidth(childIds[0], nodeMap, childrenMap));
  }

  // Multiple children → they spread horizontally
  const childWidths = childIds.map((cid) =>
    maxChainWidth(cid, nodeMap, childrenMap)
  );
  const totalChildWidth =
    childWidths.reduce((s, w) => s + w, 0) +
    (childIds.length - 1) * MIN_GAP;
  return Math.max(ownWidth, totalChildWidth);
}

function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  // Build children map from edges
  const childrenMap = new Map<string, string[]>();
  for (const edge of edges) {
    const children = childrenMap.get(edge.source) || [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const positioned = new Map<string, { x: number; y: number }>();

  // Find company header
  const companyNode = nodes.find((n) => n.type === "company-header");
  if (companyNode) {
    positioned.set(companyNode.id, { x: -COMPANY_WIDTH / 2, y: 0 });
  }

  // Find top-level idea cards (direct children of company header via edges)
  const companyId = companyNode?.id;
  const topLevelIds = companyId ? (childrenMap.get(companyId) || []) : [];
  const topLevelNodes = topLevelIds
    .map((id) => nodeMap.get(id))
    .filter(Boolean) as Node[];

  // Compute each column's required width (widest node in its chain)
  const columnWidths = topLevelNodes.map((n) =>
    maxChainWidth(n.id, nodeMap, childrenMap)
  );

  // Position columns: each gets exactly the width it needs + MIN_GAP between
  if (topLevelNodes.length > 0) {
    const totalWidth =
      columnWidths.reduce((s, w) => s + w, 0) +
      (topLevelNodes.length - 1) * MIN_GAP;
    let curX = -totalWidth / 2;

    topLevelNodes.forEach((node, i) => {
      const colW = columnWidths[i];
      // Center the 385px card within its column
      const x = curX + (colW - CARD_WIDTH) / 2;
      const y = COMPANY_HEIGHT + FIRST_ROW_GAP;
      positioned.set(node.id, { x, y });

      const centerX = curX + colW / 2;
      layoutChain(node.id, centerX, y + estimateNodeHeight(node));

      curX += colW + MIN_GAP;
    });
  }

  function layoutChain(parentId: string, centerX: number, belowY: number) {
    const childIds = childrenMap.get(parentId) || [];
    if (childIds.length === 0) return;

    const children = childIds
      .map((id) => nodeMap.get(id))
      .filter(Boolean) as Node[];
    if (children.length === 0) return;

    const y = belowY + VERTICAL_GAP;

    if (children.length === 1) {
      // Single child → continue the vertical chain
      const child = children[0];
      const w = nodeWidth(child);
      positioned.set(child.id, { x: centerX - w / 2, y });
      layoutChain(child.id, centerX, y + estimateNodeHeight(child));
    } else {
      // Multiple children → spread horizontally (parallel branches)
      const colWidths = children.map((c) =>
        maxChainWidth(c.id, nodeMap, childrenMap)
      );
      const totalWidth =
        colWidths.reduce((s, w) => s + w, 0) +
        (children.length - 1) * MIN_GAP;
      let curX = centerX - totalWidth / 2;

      children.forEach((child, i) => {
        const colW = colWidths[i];
        const w = nodeWidth(child);
        positioned.set(child.id, { x: curX + (colW - w) / 2, y });

        const childCenter = curX + colW / 2;
        layoutChain(child.id, childCenter, y + estimateNodeHeight(child));

        curX += colW + MIN_GAP;
      });
    }
  }

  return nodes.map((n) => ({
    ...n,
    position: positioned.get(n.id) ?? n.position,
  }));
}

/* ------------------------------------------------------------------ */
/*  Build chat history by walking up the parentId chain               */
/* ------------------------------------------------------------------ */

function buildChatHistory(
  nodeId: string,
  allNodes: Node[]
): Array<{ role: string; content: string }> {
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
  const chain: Node[] = [];

  // Walk up from the given node via parentId
  let current: Node | undefined = nodeMap.get(nodeId);
  while (current) {
    chain.unshift(current);
    const pid = (current.data as Record<string, unknown>)?.parentId as string | undefined;
    current = pid ? nodeMap.get(pid) : undefined;
  }

  // Convert chain to role/content pairs
  const history: Array<{ role: string; content: string }> = [];
  for (const node of chain) {
    if (node.type === "idea-card") {
      const desc = (node.data as Record<string, unknown>).description as string ?? "";
      if (desc) history.push({ role: "assistant", content: desc });
    } else if (node.type === "prompt-bubble") {
      const prompt = (node.data as Record<string, unknown>).prompt as string ?? "";
      if (prompt) history.push({ role: "user", content: prompt });
    }
    // Skip company-header — research is sent separately
  }

  return history;
}

/* ------------------------------------------------------------------ */
/*  Main hook                                                         */
/* ------------------------------------------------------------------ */

type DiscoveryOptions = {
  onAuthRequired?: () => void;
  userId?: string | null;
};

export function useDiscovery(options: DiscoveryOptions = {}) {
  const { onAuthRequired, userId } = options;
  const onAuthRequiredRef = useRef(onAuthRequired);
  onAuthRequiredRef.current = onAuthRequired;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [status, setStatus] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const rawNodesRef = useRef<Node[]>([]);
  const rawEdgesRef = useRef<Edge[]>([]);
  const companyNodeIdRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- helper: re-layout and flush to state ---- */
  function applyLayout() {
    setNodes(layoutNodes(rawNodesRef.current, rawEdgesRef.current));
    setEdges([...rawEdgesRef.current]);
  }

  /* ---- Start discovery (SSE stream) ---- */
  const startDiscovery = useCallback(async () => {
    const stored = sessionStorage.getItem("discover_research");
    if (!stored) return;

    const researchData = JSON.parse(stored) as {
      company: string;
      summary: string;
      research: string;
      context?: string;
      logo_url?: string;
    };

    setIsRunning(true);
    setStatus("Generating ideas...");
    rawNodesRef.current = [];
    rawEdgesRef.current = [];

    try {
      const res = await fetch(`${API_URL}/api/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: researchData.company,
          summary: researchData.summary,
          research: researchData.research,
          context: researchData.context ?? "",
          logo_url: researchData.logo_url ?? null,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            const data = JSON.parse(line.slice(6));
            handleEvent(eventType, data);
            eventType = "";
          }
        }
      }
    } catch (err) {
      setStatus(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Handle SSE events ---- */
  function handleEvent(event: string, data: Record<string, unknown>) {
    switch (event) {
      case "node": {
        const nodeType = data.type as string;
        const nodeId = data.id as string;

        // Track company node ID for parentId on idea cards
        if (nodeType === "company-header") {
          companyNodeIdRef.current = nodeId;
        }

        const newNode: Node = {
          id: nodeId,
          type: nodeType,
          position: { x: 0, y: 0 },
          data: {
            label: data.label,
            title: data.label,
            description: data.content,
            ...(data.logo_url ? { logo_url: data.logo_url } : {}),
            ...(nodeType === "idea-card"
              ? {
                  parentId: companyNodeIdRef.current,
                  onSubmitPrompt: submitPrompt,
                  onCreateVariations: submitVariations,
                  onAuthRequired: onAuthRequiredRef.current,
                }
              : {}),
          },
        };
        rawNodesRef.current = [...rawNodesRef.current, newNode];
        setNodes(layoutNodes(rawNodesRef.current, rawEdgesRef.current));
        break;
      }
      case "edge": {
        const newEdge: Edge = {
          id: data.id as string,
          source: data.source as string,
          target: data.target as string,
          style: { stroke: "#404040", strokeWidth: 2 },
        };
        rawEdgesRef.current = [...rawEdgesRef.current, newEdge];
        // Re-run layout so nodes that arrived before their edge get positioned
        applyLayout();
        break;
      }
      case "status": {
        setStatus(data.message as string);
        break;
      }
      case "error": {
        setStatus(`Error: ${data.message as string}`);
        break;
      }
      case "done": {
        setStatus("Discovery complete");
        break;
      }
    }
  }

  /* ---- Submit a follow-up prompt on a card ---- */
  async function submitPrompt(parentNodeId: string, prompt: string) {
    // 1. Build chat history from the chain
    const history = buildChatHistory(parentNodeId, rawNodesRef.current);

    // 2. Create prompt-bubble node + edge
    const promptNodeId = crypto.randomUUID();
    const promptNode: Node = {
      id: promptNodeId,
      type: "prompt-bubble",
      position: { x: 0, y: 0 },
      data: { prompt, parentId: parentNodeId },
    };
    const promptEdge: Edge = {
      id: crypto.randomUUID(),
      source: parentNodeId,
      target: promptNodeId,
      style: { stroke: "#404040", strokeWidth: 2 },
    };

    rawNodesRef.current = [...rawNodesRef.current, promptNode];
    rawEdgesRef.current = [...rawEdgesRef.current, promptEdge];
    applyLayout();

    // 3. Call backend
    setStatus("Thinking...");
    setIsRunning(true);

    try {
      const stored = sessionStorage.getItem("discover_research");
      const researchData = stored ? JSON.parse(stored) : {};

      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          history,
          research_context: researchData.research || "",
        }),
      });

      if (!res.ok) throw new Error(`Chat failed (${res.status})`);
      const data = await res.json();

      const responseNodeId = crypto.randomUUID();
      const responseNode: Node = {
        id: responseNodeId,
        type: "idea-card",
        position: { x: 0, y: 0 },
        data: {
          title: "",
          description: data.content,
          parentId: promptNodeId,
          onSubmitPrompt: submitPrompt,
          onCreateVariations: submitVariations,
          onAuthRequired: onAuthRequiredRef.current,
        },
      };
      const responseEdge: Edge = {
        id: crypto.randomUUID(),
        source: promptNodeId,
        target: responseNodeId,
        style: { stroke: "#404040", strokeWidth: 2 },
      };

      rawNodesRef.current = [...rawNodesRef.current, responseNode];
      rawEdgesRef.current = [...rawEdgesRef.current, responseEdge];
      applyLayout();
      setStatus("");
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Chat failed"}`);
    } finally {
      setIsRunning(false);
    }
  }

  /* ---- Create variations of an idea card ---- */
  async function submitVariations(parentNodeId: string) {
    // 1. Get the parent node's idea data
    const parentNode = rawNodesRef.current.find(
      (n) => n.id === parentNodeId
    );
    if (!parentNode) return;
    const parentData = parentNode.data as Record<string, unknown>;
    const ideaTitle = (parentData.title as string) || "";
    const ideaDescription = (parentData.description as string) || "";

    // 2. Build chat history from the chain
    const history = buildChatHistory(parentNodeId, rawNodesRef.current);

    // 3. Create prompt-bubble node + edge
    const promptNodeId = crypto.randomUUID();
    const promptNode: Node = {
      id: promptNodeId,
      type: "prompt-bubble",
      position: { x: 0, y: 0 },
      data: { prompt: "Create variations", parentId: parentNodeId },
    };
    const promptEdge: Edge = {
      id: crypto.randomUUID(),
      source: parentNodeId,
      target: promptNodeId,
      style: { stroke: "#404040", strokeWidth: 2 },
    };

    rawNodesRef.current = [...rawNodesRef.current, promptNode];
    rawEdgesRef.current = [...rawEdgesRef.current, promptEdge];
    applyLayout();

    // 4. Call backend
    setStatus("Creating variations...");
    setIsRunning(true);

    try {
      const stored = sessionStorage.getItem("discover_research");
      const researchData = stored ? JSON.parse(stored) : {};

      const res = await fetch(`${API_URL}/api/variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea_title: ideaTitle,
          idea_description: ideaDescription,
          history,
          research_context: researchData.research || "",
        }),
      });

      if (!res.ok) throw new Error(`Variations failed (${res.status})`);
      const data = await res.json();

      for (const variation of data.variations) {
        const variationNodeId = crypto.randomUUID();
        const variationNode: Node = {
          id: variationNodeId,
          type: "idea-card",
          position: { x: 0, y: 0 },
          data: {
            title: variation.title,
            description: variation.description,
            parentId: promptNodeId,
            onSubmitPrompt: submitPrompt,
            onCreateVariations: submitVariations,
            onAuthRequired: onAuthRequiredRef.current,
          },
        };
        const variationEdge: Edge = {
          id: crypto.randomUUID(),
          source: promptNodeId,
          target: variationNodeId,
          style: { stroke: "#404040", strokeWidth: 2 },
        };

        rawNodesRef.current = [...rawNodesRef.current, variationNode];
        rawEdgesRef.current = [...rawEdgesRef.current, variationEdge];
      }

      applyLayout();
      setStatus("");
    } catch (err) {
      setStatus(
        `Error: ${err instanceof Error ? err.message : "Variations failed"}`
      );
    } finally {
      setIsRunning(false);
    }
  }

  /* ---- Persist canvas to sessionStorage so refresh restores ---- */
  const saveCanvasToSession = useCallback((nodesToSave: Node[], edgesToSave: Edge[]) => {
    if (nodesToSave.length === 0) return;
    try {
      const payload = {
        nodes: serializableNodes(nodesToSave),
        edges: edgesToSave,
      };
      sessionStorage.setItem(DISCOVER_CANVAS_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota / serialization errors
    }
  }, []);

  /* ---- Save to Supabase (debounced) ---- */
  const saveToSupabase = useCallback(async (uid: string) => {
    try {
      const researchRaw = sessionStorage.getItem("discover_research");
      const canvasRaw = sessionStorage.getItem(DISCOVER_CANVAS_KEY);
      if (!canvasRaw) return;
      await supabase.from("workspaces").upsert(
        {
          user_id: uid,
          research_data: researchRaw ? JSON.parse(researchRaw) : null,
          canvas_data: JSON.parse(canvasRaw),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch {
      // silently ignore
    }
  }, []);

  /* ---- Load workspace from Supabase into sessionStorage ---- */
  const loadFromSupabase = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from("workspaces")
        .select("research_data, canvas_data")
        .eq("user_id", uid)
        .maybeSingle();
      if (!data?.canvas_data) return false;
      if (data.research_data) {
        sessionStorage.setItem("discover_research", JSON.stringify(data.research_data));
      }
      sessionStorage.setItem(DISCOVER_CANVAS_KEY, JSON.stringify(data.canvas_data));
      return true;
    } catch {
      return false;
    }
  }, []);

  /* ---- Delete workspace from Supabase ---- */
  const deleteFromSupabase = useCallback(async (uid: string) => {
    try {
      await supabase.from("workspaces").delete().eq("user_id", uid);
    } catch {
      // silently ignore
    }
  }, []);

  /* ---- Restore canvas from sessionStorage; returns true if restored ---- */
  const restoreFromSession = useCallback((): boolean => {
    try {
      const raw = sessionStorage.getItem(DISCOVER_CANVAS_KEY);
      if (!raw) return false;
      const { nodes: savedNodes, edges: savedEdges } = JSON.parse(raw) as {
        nodes: Node[];
        edges: Edge[];
      };
      if (!Array.isArray(savedNodes) || !Array.isArray(savedEdges) || savedNodes.length === 0)
        return false;

      const companyNode = savedNodes.find((n) => n.type === "company-header");
      if (companyNode) companyNodeIdRef.current = companyNode.id;

      const hydratedNodes: Node[] = savedNodes.map((n) => {
        if (n.type === "idea-card") {
          return {
            ...n,
            data: {
              ...(n.data as Record<string, unknown>),
              onSubmitPrompt: submitPrompt,
              onCreateVariations: submitVariations,
              onAuthRequired: onAuthRequiredRef.current,
            },
          };
        }
        return n;
      });

      rawNodesRef.current = hydratedNodes;
      rawEdgesRef.current = savedEdges;
      applyLayout();
      return true;
    } catch {
      return false;
    }
  }, [submitPrompt, submitVariations]);

  /* Persist whenever canvas has content — sessionStorage + debounced Supabase */
  useEffect(() => {
    if (nodes.length > 0) {
      saveCanvasToSession(nodes, edges);

      if (userId) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          saveToSupabase(userId);
        }, 3000);
      }
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [nodes, edges, saveCanvasToSession, saveToSupabase, userId]);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    status,
    isRunning,
    startDiscovery,
    restoreFromSession,
    saveToSupabase,
    loadFromSupabase,
    deleteFromSupabase,
  };
}
