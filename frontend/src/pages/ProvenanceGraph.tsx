import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCase } from '../context/CaseContext';
import { forensicApi } from '../services/api';
import { GraphData, GraphNode, GraphEdge, EvidenceRelationship } from '../types';
import {
  Network,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Custom Node Component for Forensic Image Evidence
const ForensicImageNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-[#0b0f19] border-2 border-slate-700 hover:border-sky-400 rounded-lg p-2.5 shadow-xl w-48 text-slate-200 font-sans transition-all">
      <Handle type="target" position={Position.Top} className="!bg-sky-400 !w-2 !h-2" />
      <div className="space-y-1.5">
        <div className="relative aspect-video bg-[#070a0f] rounded overflow-hidden flex items-center justify-center border border-slate-800">
          <img
            src={data.thumbnail_url}
            alt={data.label}
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-mono px-1 rounded text-sky-300">
            {data.format}
          </span>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-100 truncate" title={data.label}>
            {data.label}
          </div>
          <div className="text-[10px] font-mono text-sky-400 truncate">
            {data.id}
          </div>
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono text-slate-300 border-t border-slate-800/80 pt-1">
          <span>{data.dimensions}</span>
          <span>{(data.file_size / 1024).toFixed(0)} KB</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-sky-400 !w-2 !h-2" />
    </div>
  );
};

export const ProvenanceGraph: React.FC = () => {
  const { activeCase } = useCase();
  const [graphRaw, setGraphRaw] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [minSimilarity, setMinSimilarity] = useState<number>(0);

  // Inspector drawer states
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [updatingReview, setUpdatingReview] = useState(false);
  const [examinerNotes, setExaminerNotes] = useState('');

  const navigate = useNavigate();

  const nodeTypes = useMemo(() => ({ forensicNode: ForensicImageNode }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const loadGraph = async () => {
    if (!activeCase) return;
    setLoading(true);
    try {
      const data = await forensicApi.getCaseGraph(activeCase.id);
      setGraphRaw(data);
    } catch (err) {
      console.error('Failed to load graph data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [activeCase]);

  // Transform raw nodes & edges into React Flow elements with automatic circular / grid layout
  useEffect(() => {
    if (!graphRaw) return;

    // Filter nodes by search
    const filteredNodesRaw = graphRaw.nodes.filter(n =>
      n.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const validNodeIds = new Set(filteredNodesRaw.map(n => n.id));

    // Calculate layout coordinates
    const total = filteredNodesRaw.length;
    const cols = Math.ceil(Math.sqrt(total)) || 1;
    const spacingX = 260;
    const spacingY = 220;

    const rfNodes: Node[] = filteredNodesRaw.map((n, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      return {
        id: n.id,
        type: 'forensicNode',
        position: { x: col * spacingX + 50, y: row * spacingY + 50 },
        data: n
      };
    });

    // Filter edges by type, similarity, and valid node endpoints
    const rfEdges: Edge[] = graphRaw.edges
      .filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target))
      .filter(e => {
        if (selectedType !== 'all' && e.relationship_type !== selectedType) return false;
        if (e.similarity_value !== undefined && e.similarity_value !== null) {
          if (e.similarity_value < minSimilarity / 100) return false;
        }
        return true;
      })
      .map(e => {
        let strokeColor = '#38bdf8'; // sky blue default
        let strokeDasharray = '5,5';

        if (e.status === 'Confirmed by Examiner') {
          strokeColor = '#10b981'; // emerald
          strokeDasharray = '0';
        } else if (e.status === 'Rejected by Examiner') {
          strokeColor = '#ef4444'; // red
          strokeDasharray = '3,3';
        } else if (e.relationship_type === 'exact_duplicate') {
          strokeColor = '#10b981';
          strokeDasharray = '0';
        } else if (e.relationship_type === 'metadata_correlation') {
          strokeColor = '#a855f7'; // purple
          strokeDasharray = '2,2';
        }

        const label = e.similarity_value ? `${(e.similarity_value * 100).toFixed(0)}%` : e.relationship_type;

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          animated: e.status === 'Suggested',
          label,
          labelStyle: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
          labelBgStyle: { fill: '#0b0f19', fillOpacity: 0.8 },
          style: { stroke: strokeColor, strokeWidth: 2, strokeDasharray },
          markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor },
          data: e
        };
      });

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [graphRaw, searchTerm, selectedType, minSimilarity]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode((node.data as unknown) as GraphNode);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    const edgeData = (edge.data as unknown) as GraphEdge;
    setSelectedEdge(edgeData);
    setSelectedNode(null);
    setExaminerNotes(edgeData?.examiner_notes || '');
  }, []);

  const handleUpdateReview = async (newStatus: string) => {
    if (!selectedEdge) return;
    const relationshipId = parseInt(selectedEdge.id.replace('edge-', ''), 10);
    setUpdatingReview(true);
    try {
      await forensicApi.updateRelationship(relationshipId, {
        status: newStatus,
        examiner_notes: examinerNotes.trim() || undefined
      });
      setSelectedEdge(prev => prev ? { ...prev, status: newStatus, examiner_notes: examinerNotes } : null);
      await loadGraph();
    } catch (err) {
      console.error('Failed to update relationship decision:', err);
    } finally {
      setUpdatingReview(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
            <Network className="w-5 h-5 text-sky-400" />
            <span>Image Provenance & Relationship Graph</span>
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Interactive visual network of observed cryptographic duplicates, perceptual similarities, and examiner review states.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadGraph}
            className="flex items-center space-x-1.5 text-xs bg-[#101726] hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded border border-slate-700 font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Graph</span>
          </button>
        </div>
      </div>

      {/* Control Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0f19] p-3 rounded border border-slate-800 text-xs font-mono">
        <div className="flex items-center space-x-3">
          {/* Search Node */}
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 text-slate-300 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#101726] border border-slate-700 rounded pl-7 pr-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Relationship Type Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-300">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#101726] border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Types</option>
              <option value="exact_duplicate">Exact Duplicate</option>
              <option value="perceptual_similarity">Perceptual Similarity</option>
              <option value="metadata_correlation">Metadata Correlation</option>
            </select>
          </div>
        </div>

        {/* Min Similarity Slider */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-300">Min Similarity:</span>
          <input
            type="range"
            min="0"
            max="95"
            step="5"
            value={minSimilarity}
            onChange={(e) => setMinSimilarity(Number(e.target.value))}
            className="w-24 accent-sky-400"
          />
          <span className="text-sky-400 w-10 text-right">{minSimilarity}%</span>
        </div>
      </div>

      {/* Main Graph Viewport with Inspection Drawer */}
      <div className="flex-1 min-h-[500px] relative bg-[#070a0f] border border-slate-800 rounded-lg overflow-hidden flex">
        <div className="flex-1 h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-[#070a0f]"
          >
            <Background color="#1e293b" gap={18} size={1} />
            <Controls className="!bg-[#0b0f19] !border-slate-800 !fill-slate-300" />
            <MiniMap
              nodeColor="#38bdf8"
              maskColor="rgba(7, 10, 15, 0.85)"
              className="!bg-[#0b0f19] !border-slate-800"
            />
          </ReactFlow>
        </div>

        {/* Node Detail Drawer */}
        {selectedNode && (
          <div className="w-80 bg-[#090d16] border-l border-slate-800 p-4 space-y-4 overflow-y-auto shrink-0 z-10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-200 uppercase font-mono">Evidence Node</span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-300 hover:text-white text-xs font-mono"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-3">
              <img
                src={selectedNode.thumbnail_url}
                alt={selectedNode.label}
                className="w-full h-36 object-contain rounded bg-[#070a0f] border border-slate-800"
              />

              <div>
                <h3 className="text-xs font-bold text-slate-100">{selectedNode.label}</h3>
                <div className="text-[10px] font-mono text-sky-400 break-all">{selectedNode.id}</div>
              </div>

              <div className="space-y-1.5 text-xs font-mono text-slate-300 border-t border-slate-800 pt-2">
                <div className="flex justify-between">
                  <span>Dimensions:</span>
                  <span className="text-slate-200">{selectedNode.dimensions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Format:</span>
                  <span className="text-slate-200">{selectedNode.format}</span>
                </div>
                <div className="flex justify-between">
                  <span>File Size:</span>
                  <span className="text-slate-200">{(selectedNode.file_size / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span>SHA-256 Short:</span>
                  <span className="text-sky-300">{selectedNode.sha256_short}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex flex-col space-y-2">
                <button
                  onClick={() => navigate(`/evidence/${selectedNode.id}`)}
                  className="w-full text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 rounded font-mono border border-slate-700"
                >
                  Full Evidence Inspector
                </button>
                <button
                  onClick={() => navigate(`/similarity?query=${selectedNode.id}`)}
                  className="w-full text-xs bg-sky-950 hover:bg-sky-900 text-sky-300 py-1.5 rounded font-mono border border-sky-800/60"
                >
                  Find Similar Images
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edge Detail Drawer (Examiner Review Workflow) */}
        {selectedEdge && (
          <div className="w-88 bg-[#090d16] border-l border-slate-800 p-4 space-y-4 overflow-y-auto shrink-0 z-10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-200 uppercase font-mono">Relationship Review</span>
              <button
                onClick={() => setSelectedEdge(null)}
                className="text-slate-300 hover:text-white text-xs font-mono"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-sky-400 font-bold">
                  {selectedEdge.relationship_type.replace('_', ' ')}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {selectedEdge.similarity_value ? `${(selectedEdge.similarity_value * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>

              {/* Edge Endpoints */}
              <div className="p-2.5 bg-[#0b0f19] border border-slate-800 rounded space-y-2 text-xs font-mono">
                <div>
                  <div className="text-[10px] text-slate-300">Source:</div>
                  <div className="text-slate-200 truncate">{selectedEdge.source}</div>
                </div>
                <div className="text-center text-slate-300">↓</div>
                <div>
                  <div className="text-[10px] text-slate-300">Target:</div>
                  <div className="text-slate-200 truncate">{selectedEdge.target}</div>
                </div>
              </div>

              {/* Status Indicator */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1 font-mono">
                  Current Status
                </label>
                <div className="p-2 rounded bg-[#101726] border border-slate-800 text-xs font-mono text-sky-300">
                  {selectedEdge.status}
                </div>
              </div>

              {/* Examiner Decision Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase font-mono">
                  Examiner Adjudication
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdateReview('Confirmed by Examiner')}
                    disabled={updatingReview}
                    className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-medium rounded border border-emerald-800/60"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirm</span>
                  </button>

                  <button
                    onClick={() => handleUpdateReview('Rejected by Examiner')}
                    disabled={updatingReview}
                    className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-red-950/80 hover:bg-red-900 text-red-300 text-xs font-medium rounded border border-red-800/60"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>

                <button
                  onClick={() => handleUpdateReview('Under Review')}
                  disabled={updatingReview}
                  className="w-full py-1.5 bg-amber-950/60 hover:bg-amber-900 text-amber-300 text-xs font-medium rounded border border-amber-800/60 font-mono"
                >
                  Mark Under Review
                </button>
              </div>

              {/* Examiner Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1 font-mono">
                  Examiner Notes
                </label>
                <textarea
                  rows={3}
                  value={examinerNotes}
                  onChange={(e) => setExaminerNotes(e.target.value)}
                  placeholder="Record forensic rationale for confirmation or rejection..."
                  className="w-full bg-[#101726] border border-slate-700 rounded p-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Direct Link to CV Analysis */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => navigate(`/transformation?ref=${selectedEdge.source}&cand=${selectedEdge.target}`)}
                  className="w-full text-xs bg-purple-950/80 hover:bg-purple-900 text-purple-300 py-1.5 rounded font-mono border border-purple-800/60"
                >
                  Verify via OpenCV Transformation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
