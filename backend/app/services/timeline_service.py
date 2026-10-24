import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.investigation_event import InvestigationEvent

class TimelineService:
    def get_timeline(
        self,
        db: Session,
        case_id: Optional[int] = None,
        evidence_id: Optional[str] = None,
        event_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves chronological audit trail of investigation events with explicit timestamp context.
        """
        query = db.query(InvestigationEvent)
        if case_id is not None:
            query = query.filter(InvestigationEvent.case_id == case_id)
        if evidence_id is not None:
            query = query.filter(InvestigationEvent.evidence_id == evidence_id)
        if event_type is not None:
            query = query.filter(InvestigationEvent.event_type == event_type)

        events = query.order_by(InvestigationEvent.event_timestamp.desc()).all()

        results = []
        for ev in events:
            details = {}
            if ev.details_json:
                try:
                    details = json.loads(ev.details_json)
                except Exception:
                    details = {"raw": ev.details_json}

            results.append({
                "id": ev.id,
                "case_id": ev.case_id,
                "evidence_id": ev.evidence_id,
                "event_type": ev.event_type,
                "event_timestamp": ev.event_timestamp,
                "details": details,
                "examiner_notes": ev.examiner_notes
            })

        return results

timeline_service = TimelineService()
