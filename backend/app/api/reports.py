from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.database.session import get_db
from backend.app.models.investigation_report import InvestigationReport

router = APIRouter(prefix="/reports", tags=["Investigation Reports"])

@router.get("/{report_id}/download")
def download_report(report_id: int, db: Session = Depends(get_db)):
    rep = db.query(InvestigationReport).filter(InvestigationReport.id == report_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Investigation report record not found.")

    pdf_path = settings.REPORTS_DIR / rep.storage_reference
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF report file not found on disk.")

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"PixelTrace_Report_{rep.report_reference}.pdf"
    )
