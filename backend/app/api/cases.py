import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.investigation_case import InvestigationCase
from backend.app.models.evidence_file import EvidenceFile
from backend.app.models.investigation_event import InvestigationEvent
from backend.app.models.investigation_report import InvestigationReport
from backend.app.schemas.forensic_schemas import (
    CaseCreate, CaseUpdate, CaseResponse, EvidenceResponse,
    GraphDataResponse, ExactDuplicatesResponse, TimelineEventResponse,
    ReportGenerateRequest, ReportResponse
)
from backend.app.services.evidence_service import evidence_service
from backend.app.services.relationship_service import relationship_service
from backend.app.services.similarity_service import similarity_service
from backend.app.services.timeline_service import timeline_service
from backend.app.services.report_service import report_service

router = APIRouter(prefix="/cases", tags=["Investigation Cases"])

@router.get("", response_model=List[CaseResponse])
def list_cases(
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(InvestigationCase)
    if status:
        query = query.filter(InvestigationCase.status == status)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (InvestigationCase.title.ilike(s)) |
            (InvestigationCase.case_number.ilike(s)) |
            (InvestigationCase.examiner.ilike(s))
        )
    cases = query.order_by(InvestigationCase.created_at.desc()).all()
    
    results = []
    for c in cases:
        results.append(CaseResponse(
            id=c.id,
            case_number=c.case_number,
            title=c.title,
            description=c.description,
            examiner=c.examiner,
            created_at=c.created_at,
            updated_at=c.updated_at,
            status=c.status,
            evidence_count=len(c.evidence_files)
        ))
    return results

@router.post("", response_model=CaseResponse)
def create_case(case_in: CaseCreate, db: Session = Depends(get_db)):
    case_number = case_in.case_number
    if not case_number:
        # Generate format: CASE-YYYYMMDD-XXXX
        case_number = f"CASE-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    # Check uniqueness
    existing = db.query(InvestigationCase).filter(InvestigationCase.case_number == case_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Case number already exists.")

    new_case = InvestigationCase(
        case_number=case_number,
        title=case_in.title,
        description=case_in.description,
        examiner=case_in.examiner,
        status="Active"
    )
    db.add(new_case)
    db.flush()

    # Log case creation event
    db.add(InvestigationEvent(
        case_id=new_case.id,
        event_type="case_creation",
        event_timestamp=datetime.utcnow(),
        details_json=f'{{"case_number": "{case_number}", "title": "{new_case.title}"}}',
        examiner_notes=f"Investigation case created by {new_case.examiner or 'Examiner'}."
    ))

    db.commit()
    db.refresh(new_case)
    return CaseResponse(
        id=new_case.id,
        case_number=new_case.case_number,
        title=new_case.title,
        description=new_case.description,
        examiner=new_case.examiner,
        created_at=new_case.created_at,
        updated_at=new_case.updated_at,
        status=new_case.status,
        evidence_count=0
    )

@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    return CaseResponse(
        id=case.id,
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        examiner=case.examiner,
        created_at=case.created_at,
        updated_at=case.updated_at,
        status=case.status,
        evidence_count=len(case.evidence_files)
    )

@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(case_id: int, update_in: CaseUpdate, db: Session = Depends(get_db)):
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    if update_in.title is not None:
        case.title = update_in.title
    if update_in.description is not None:
        case.description = update_in.description
    if update_in.examiner is not None:
        case.examiner = update_in.examiner
    if update_in.status is not None:
        case.status = update_in.status

    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    return CaseResponse(
        id=case.id,
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        examiner=case.examiner,
        created_at=case.created_at,
        updated_at=case.updated_at,
        status=case.status,
        evidence_count=len(case.evidence_files)
    )

@router.post("/{case_id}/evidence", response_model=List[EvidenceResponse])
async def acquire_evidence(
    case_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    acquired = []
    for file in files:
        contents = await file.read()
        filename = file.filename or "uploaded_evidence"

        if filename.lower().endswith(".zip"):
            zip_acquired = evidence_service.acquire_zip_collection(
                db=db,
                case_id=case_id,
                zip_bytes=contents,
                archive_name=filename
            )
            acquired.extend(zip_acquired)
        else:
            ev = evidence_service.acquire_single_image(
                db=db,
                case_id=case_id,
                file_bytes=contents,
                original_filename=filename
            )
            acquired.append(ev)

    return [EvidenceResponse.model_validate(e) for e in acquired]

@router.get("/{case_id}/evidence", response_model=List[EvidenceResponse])
def list_case_evidence(case_id: int, db: Session = Depends(get_db)):
    ev_list = db.query(EvidenceFile).filter(EvidenceFile.case_id == case_id).order_by(
        EvidenceFile.acquisition_timestamp.desc()
    ).all()
    return [EvidenceResponse.model_validate(e) for e in ev_list]

@router.get("/{case_id}/duplicates", response_model=ExactDuplicatesResponse)
def get_case_exact_duplicates(case_id: int, db: Session = Depends(get_db)):
    return similarity_service.get_exact_duplicates(db, case_id=case_id)

@router.get("/{case_id}/graph", response_model=GraphDataResponse)
def get_case_graph(case_id: int, db: Session = Depends(get_db)):
    return relationship_service.get_graph_data(db, case_id=case_id)

@router.get("/{case_id}/timeline", response_model=List[TimelineEventResponse])
def get_case_timeline(case_id: int, db: Session = Depends(get_db)):
    events = timeline_service.get_timeline(db, case_id=case_id)
    return [TimelineEventResponse(**ev) for ev in events]

@router.post("/{case_id}/reports", response_model=ReportResponse)
def generate_report(
    case_id: int,
    req: ReportGenerateRequest,
    db: Session = Depends(get_db)
):
    rep = report_service.generate_case_report(
        db=db,
        case_id=case_id,
        examiner_notes=req.examiner_notes
    )
    return ReportResponse(
        id=rep.id,
        case_id=rep.case_id,
        report_reference=rep.report_reference,
        generated_at=rep.generated_at,
        file_size=rep.file_size,
        download_url=f"/api/reports/{rep.id}/download"
    )

@router.get("/{case_id}/reports", response_model=List[ReportResponse])
def list_case_reports(case_id: int, db: Session = Depends(get_db)):
    reps = db.query(InvestigationReport).filter(
        InvestigationReport.case_id == case_id
    ).order_by(InvestigationReport.generated_at.desc()).all()
    
    return [
        ReportResponse(
            id=r.id,
            case_id=r.case_id,
            report_reference=r.report_reference,
            generated_at=r.generated_at,
            file_size=r.file_size,
            download_url=f"/api/reports/{r.id}/download"
        )
        for r in reps
    ]
