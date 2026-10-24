import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)

from backend.app.core.config import settings
from backend.app.models.investigation_case import InvestigationCase
from backend.app.models.evidence_file import EvidenceFile
from backend.app.models.evidence_relationship import EvidenceRelationship
from backend.app.models.investigation_event import InvestigationEvent
from backend.app.models.investigation_report import InvestigationReport
from backend.app.services.similarity_service import similarity_service

class ReportService:
    def generate_case_report(
        self,
        db: Session,
        case_id: int,
        examiner_notes: Optional[str] = None
    ) -> InvestigationReport:
        """
        Compiles and builds an investigation PDF report adhering to digital forensics documentation standards.
        """
        case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
        if not case:
            raise ValueError(f"Investigation Case {case_id} not found.")

        evidence_list = db.query(EvidenceFile).filter(EvidenceFile.case_id == case_id).all()
        ev_ids = [e.id for e in evidence_list]
        relationships = []
        if ev_ids:
            relationships = db.query(EvidenceRelationship).filter(
                (EvidenceRelationship.source_evidence_id.in_(ev_ids)) |
                (EvidenceRelationship.target_evidence_id.in_(ev_ids))
            ).all()
        events = db.query(InvestigationEvent).filter(InvestigationEvent.case_id == case_id).order_by(InvestigationEvent.event_timestamp.asc()).all()
        exact_dups = similarity_service.get_exact_duplicates(db, case_id=case_id)

        # Generate report reference and filepath
        timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        report_ref = f"REP-{case_id}-{timestamp_str}-{uuid.uuid4().hex[:6].upper()}"
        pdf_filename = f"{report_ref}.pdf"
        pdf_path = settings.REPORTS_DIR / pdf_filename

        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom forensic typography styles
        title_style = ParagraphStyle(
            'ForensicTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'ForensicSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#475569'),
            spaceAfter=12
        )
        h2_style = ParagraphStyle(
            'ForensicH2',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=14,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'ForensicBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#334155'),
            spaceAfter=6
        )
        mono_style = ParagraphStyle(
            'ForensicMono',
            parent=styles['Normal'],
            fontName='Courier',
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor('#0f172a')
        )
        disclaimer_style = ParagraphStyle(
            'ForensicDisclaimer',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#64748b'),
            spaceBefore=6,
            spaceAfter=6
        )

        story = []

        # Header Banner
        story.append(Paragraph("PIXELTRACE DIGITAL FORENSICS WORKSTATION", subtitle_style))
        story.append(Paragraph("Digital Image Provenance & Evidence Relationship Investigation Report", title_style))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0284c7'), spaceAfter=12))

        # Case Metadata Summary Block
        meta_data = [
            [Paragraph("<b>Report Reference:</b>", body_style), Paragraph(report_ref, mono_style),
             Paragraph("<b>Date Generated:</b>", body_style), Paragraph(datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"), body_style)],
            [Paragraph("<b>Case Number:</b>", body_style), Paragraph(case.case_number, body_style),
             Paragraph("<b>Case Title:</b>", body_style), Paragraph(case.title, body_style)],
            [Paragraph("<b>Examiner:</b>", body_style), Paragraph(case.examiner or "Unassigned", body_style),
             Paragraph("<b>Case Status:</b>", body_style), Paragraph(case.status, body_style)],
            [Paragraph("<b>Total Evidence Files:</b>", body_style), Paragraph(str(len(evidence_list)), body_style),
             Paragraph("<b>Exact Duplicate Groups:</b>", body_style), Paragraph(str(exact_dups["total_groups"]), body_style)]
        ]
        meta_table = Table(meta_data, colWidths=[100, 170, 100, 170])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 14))

        # Executive Summary & Examiner Notes
        story.append(Paragraph("1. Executive Summary & Investigation Scope", h2_style))
        summary_text = case.description or "Forensic examination of digital image evidence files to investigate provenance, cryptographic integrity, perceptual similarity, and transformation history."
        story.append(Paragraph(summary_text, body_style))
        if examiner_notes:
            story.append(Paragraph(f"<b>Examiner Operational Notes:</b> {examiner_notes}", body_style))
        story.append(Spacer(1, 10))

        # Evidence Inventory Table
        story.append(Paragraph("2. Evidence Inventory & Cryptographic Hashes", h2_style))
        story.append(Paragraph("All evidence files acquired into this case with immutable acquisition SHA-256 hashes:", body_style))

        inv_headers = ["Evidence ID", "Original Filename", "Dimensions", "Format", "Size (bytes)", "SHA-256 Hash", "Integrity"]
        inv_rows = [[Paragraph(h, body_style) for h in inv_headers]]

        for ev in evidence_list:
            inv_rows.append([
                Paragraph(ev.id, mono_style),
                Paragraph(ev.original_filename, body_style),
                Paragraph(f"{ev.width}x{ev.height}", body_style),
                Paragraph(ev.image_format, body_style),
                Paragraph(str(ev.file_size), body_style),
                Paragraph(f"{ev.sha256_hash[:16]}...{ev.sha256_hash[-8:]}", mono_style),
                Paragraph(ev.integrity_status, body_style),
            ])

        if len(evidence_list) == 0:
            inv_rows.append([Paragraph("No evidence acquired in this case.", body_style)] + [Paragraph("-", body_style)]*6)

        inv_table = Table(inv_rows, colWidths=[85, 105, 55, 45, 55, 140, 55])
        inv_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#94a3b8')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(inv_table)
        story.append(Spacer(1, 14))

        # Exact Duplicate Findings
        story.append(Paragraph("3. Exact Cryptographic Duplicate Groups", h2_style))
        if exact_dups["total_groups"] == 0:
            story.append(Paragraph("No byte-identical exact duplicates were identified in this case.", body_style))
        else:
            story.append(Paragraph(f"Identified {exact_dups['total_groups']} group(s) of byte-exact duplicates sharing identical SHA-256 hashes:", body_style))
            for idx, grp in enumerate(exact_dups["groups"], 1):
                story.append(Paragraph(f"<b>Group #{idx} (SHA-256: {grp['sha256_hash']}) - {grp['file_count']} files</b>", body_style))
                for f in grp["files"]:
                    story.append(Paragraph(f"• Evidence ID: {f.id} — Filename: {f.original_filename} ({f.file_size} bytes)", body_style))
        story.append(Spacer(1, 12))

        # Perceptual Similarity & Relationships
        story.append(Paragraph("4. Perceptual Similarity & Evidence Relationships", h2_style))
        if not relationships:
            story.append(Paragraph("No relationships have been recorded or suggested for evidence in this case.", body_style))
        else:
            rel_rows = [[
                Paragraph("Source Evidence", body_style),
                Paragraph("Target Evidence", body_style),
                Paragraph("Relationship Type", body_style),
                Paragraph("Similarity", body_style),
                Paragraph("Status", body_style),
                Paragraph("Examiner Notes", body_style),
            ]]
            for r in relationships:
                sim_str = f"{r.similarity_value*100:.1f}%" if r.similarity_value is not None else "N/A"
                rel_rows.append([
                    Paragraph(r.source_evidence_id, mono_style),
                    Paragraph(r.target_evidence_id, mono_style),
                    Paragraph(r.relationship_type.replace('_', ' ').title(), body_style),
                    Paragraph(sim_str, body_style),
                    Paragraph(r.status, body_style),
                    Paragraph(r.examiner_notes or "None", body_style),
                ])
            rel_table = Table(rel_rows, colWidths=[95, 95, 100, 50, 85, 115])
            rel_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#334155')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#94a3b8')),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                ('TOPPADDING', (0,0), (-1,-1), 3),
                ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ]))
            story.append(rel_table)
        story.append(Spacer(1, 14))

        # Metadata Correlation Findings
        meta_events = [ev for ev in events if ev.event_type == "metadata_correlated"]
        story.append(Paragraph("5. Metadata Correlation Findings", h2_style))
        if not meta_events:
            story.append(Paragraph("No dedicated metadata correlation analyses were recorded for this case.", body_style))
        else:
            for me in meta_events[:5]:
                story.append(Paragraph(f"• {me.examiner_notes or me.event_timestamp.strftime('%Y-%m-%d %H:%M:%S')}", body_style))
        story.append(Spacer(1, 12))

        # Computer Vision Transformation Analysis Findings
        tf_events = [ev for ev in events if ev.event_type == "transformation_analyzed"]
        story.append(Paragraph("6. Image Transformation & Geometric Homography Findings", h2_style))
        if not tf_events:
            story.append(Paragraph("No controlled computer vision transformation analyses were executed in this case scope.", body_style))
        else:
            for te in tf_events[:5]:
                story.append(Paragraph(f"• {te.examiner_notes or te.event_timestamp.strftime('%Y-%m-%d %H:%M:%S')}", body_style))
        story.append(Spacer(1, 12))

        # Investigation Audit Trail
        story.append(Paragraph("7. Investigation Chronological Audit Trail", h2_style))
        if not events:
            story.append(Paragraph("No audit events recorded.", body_style))
        else:
            event_rows = [[
                Paragraph("Timestamp (UTC)", body_style),
                Paragraph("Event Type", body_style),
                Paragraph("Associated Evidence", body_style),
                Paragraph("Examiner Notes / Details", body_style),
            ]]
            for ev in events[:25]:  # include first 25 events
                event_rows.append([
                    Paragraph(ev.event_timestamp.strftime("%Y-%m-%d %H:%M:%S"), mono_style),
                    Paragraph(ev.event_type.replace('_', ' ').title(), body_style),
                    Paragraph(ev.evidence_id or "Case Scope", mono_style),
                    Paragraph(ev.examiner_notes or ev.details_json or "", body_style),
                ])
            event_table = Table(event_rows, colWidths=[105, 105, 100, 230])
            event_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#475569')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                ('TOPPADDING', (0,0), (-1,-1), 2.5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
            ]))
            story.append(event_table)
        story.append(Spacer(1, 14))

        # Mandatory Forensic Limitations Section
        story.append(Paragraph("8. Forensic Methodology & Scientific Limitations", h2_style))
        limitations = (
            "1. <b>Algorithmic Inferences vs. Certified Conclusions:</b> Perceptual hashing (pHash, aHash, dHash) "
            "measures frequency/gradient visual similarity. A high similarity score does NOT prove common source, "
            "authenticity, or ownership. Common photographic subjects, stock textures, and repetitive patterns may "
            "exhibit elevated perceptual similarity without shared lineage.<br/>"
            "2. <b>Cryptographic Verification:</b> SHA-256 verification establishes byte-exact consistency with the file "
            "as acquired by PixelTrace. It does not certify the authenticity or provenance of the file prior to acquisition.<br/>"
            "3. <b>Metadata Caveat:</b> EXIF, IPTC, and XMP metadata can be forged, modified, stripped, or erroneously "
            "altered by operating systems and social media platforms. Correlated metadata indicates consistency, not absolute proof.<br/>"
            "4. <b>Educational Disclaimer:</b> PixelTrace is designed for educational digital forensics research and analysis. "
            "This report is generated automatically based on recorded algorithmic and examiner data."
        )
        story.append(Paragraph(limitations, disclaimer_style))
        story.append(Spacer(1, 14))

        # Signature Block
        sig_data = [
            [Paragraph("<b>Examined By:</b>", body_style), Paragraph(case.examiner or "Investigator", body_style),
             Paragraph("<b>Signature:</b> ___________________________", body_style)]
        ]
        sig_table = Table(sig_data, colWidths=[100, 180, 260])
        story.append(sig_table)

        doc.build(story)

        # Record report in database
        file_size = pdf_path.stat().st_size
        report_record = InvestigationReport(
            case_id=case_id,
            report_reference=report_ref,
            generated_at=datetime.utcnow(),
            storage_reference=pdf_filename,
            file_size=file_size
        )
        db.add(report_record)

        # Log event
        db.add(InvestigationEvent(
            case_id=case_id,
            event_type="report_generated",
            event_timestamp=datetime.utcnow(),
            details_json=json.dumps({"report_ref": report_ref, "file_size": file_size}),
            examiner_notes=f"Investigation report {report_ref} generated."
        ))

        db.commit()
        db.refresh(report_record)
        return report_record

report_service = ReportService()
