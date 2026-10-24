import React, { useState, useEffect } from 'react';
import { forensicApi } from '../services/api';
import {
  Settings,
  ShieldCheck,
  Server,
  Database,
  Cpu,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export const SettingsAbout: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      setLoading(true);
      try {
        const res = await forensicApi.getHealth();
        setHealth(res);
      } catch (err) {
        setHealth({ status: 'offline', error: 'Backend unreachable' });
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
          <Settings className="w-5 h-5 text-sky-400" />
          <span>System Architecture & Forensic Methodology</span>
        </h1>
        <p className="text-xs text-slate-300 mt-0.5">
          Local investigation workstation diagnostics, algorithm references, and scientific limits.
        </p>
      </div>

      {/* System Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 uppercase font-mono">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Forensic Engine API</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span className="text-slate-100 font-bold">{health?.service || 'PixelTrace Engine'}</span>
          </div>
          <div className="text-[10px] text-slate-300 font-mono">
            Version: {health?.version || '1.0.0'} • Binding: 127.0.0.1:8000
          </div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 uppercase font-mono">
            <Database className="w-4 h-4 text-sky-400" />
            <span>Storage & Relational DB</span>
          </div>
          <div className="text-xs font-bold text-slate-100 font-mono">
            SQLite 3 (Local)
          </div>
          <div className="text-[10px] text-slate-300 font-mono">
            Storage: ./storage/evidence/ • WAL Journaling
          </div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 uppercase font-mono">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Computer Vision Stack</span>
          </div>
          <div className="text-xs font-bold text-slate-100 font-mono">
            OpenCV SIFT/ORB + ImageHash
          </div>
          <div className="text-[10px] text-slate-300 font-mono">
            Pillow Fallback Parser • ReportLab PDF
          </div>
        </div>
      </div>

      {/* Forensic Methodology Reference */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="border-b border-slate-800 pb-2">
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Scientific Forensic Methodology Reference
          </span>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
          <div>
            <h4 className="text-xs font-bold text-sky-400 font-mono uppercase mb-1">
              1. Cryptographic Hashing vs. Perceptual Hashing
            </h4>
            <p>
              PixelTrace rigorously separates cryptographic byte-integrity verification from visual similarity inference.
              <strong> SHA-256</strong> hashes are computed strictly on the unadulterated original file bytes stored in local evidence vaults. Any 1-bit alteration in file bytes triggers an immediate cryptographic integrity failure.
              Conversely, <strong>Perceptual Hashes (pHash, aHash, dHash)</strong> compute scale- and compression-invariant frequency descriptors. Differing bits represent the Hamming distance across the 64-bit fingerprint:
            </p>
            <div className="p-2.5 bg-[#070a0f] rounded border border-slate-800 font-mono text-sky-300 text-[11px] my-2">
              Normalized Similarity = 1 - (Hamming Distance / 64)
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-purple-400 font-mono uppercase mb-1">
              2. Computer Vision Transformation Estimation
            </h4>
            <p>
              Transformation analysis uses invariant keypoint detection (SIFT with ORB fallback), descriptor matching with Lowe's ratio test (threshold 0.75), and RANSAC geometric consensus estimation. A homography or affine transformation matrix is accepted only when sufficient inlier consensus exists (&gt;10 points). Inferred transformations (such as resizing, rotation, or recompression) are framed as empirical hypotheses.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-emerald-400 font-mono uppercase mb-1">
              3. Interactive Provenance Graph & Examiner Adjudication
            </h4>
            <p>
              Algorithmic relationships (cryptographic duplicate, perceptual similarity, metadata match) are initially tagged as <code>Suggested</code>. The investigator maintains full adjudicative control to review, confirm (<code>Confirmed by Examiner</code>), or reject (<code>Rejected by Examiner</code>) relationships. Algorithmic reruns never overwrite examiner decisions.
            </p>
          </div>
        </div>
      </div>

      {/* Explicit Scientific Limitations */}
      <div className="bg-[#0b0f19] border border-amber-900/40 rounded-lg p-5 space-y-3">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono">
            Mandatory Forensic Disclaimers & Known Limitations
          </span>
        </div>

        <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside leading-relaxed">
          <li>
            <strong className="text-slate-200">Similarity is Not Provenance:</strong> High perceptual similarity or small Hamming distances indicate visual correlation. They do NOT establish common origin, authentic source, or copyright ownership. Unrelated photos of identical architectural landmarks or natural scenes often yield high perceptual similarity.
          </li>
          <li>
            <strong className="text-slate-200">Metadata is Fragile:</strong> EXIF, IPTC, and XMP metadata can be effortlessly forged, copied, or scrubbed by online social networks and camera apps. Metadata matches serve solely as corroborative evidence.
          </li>
          <li>
            <strong className="text-slate-200">Local Integrity Scope:</strong> SHA-256 verification proves that the file on disk is bit-identical to the file at the moment of acquisition by PixelTrace. It does not certify what happened to the image prior to acquisition.
          </li>
          <li>
            <strong className="text-slate-200">Educational Scope:</strong> PixelTrace is built for educational, academic, and research applications and does not claim certified chain-of-custody compliance.
          </li>
        </ul>
      </div>
    </div>
  );
};
