from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload
from app.auth import User, get_current_user
from app.database import get_db
from app.models.evidence import Evidence
from app.models.evidence_file import EvidenceFile
from app.models.submission import Submission
from app.rbac import require_admin
from app.schemas.evidence import EvidenceResponse
from app.storage.blob_storage import save_file, delete_file

router = APIRouter(prefix="/evidence", tags=["Evidence"])


class _EvidenceUpdate(BaseModel):
    description: str


@router.get("", response_model=list[EvidenceResponse])
def list_evidence(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Evidence).options(selectinload(Evidence.files))
    if user.role != "admin":
        q = q.filter(Evidence.created_by == user.email)
    return q.order_by(Evidence.id.desc()).all()


@router.post("", response_model=EvidenceResponse, status_code=201)
def create_evidence(
    title: str = Form(...),
    control_id: int = Form(...),
    description: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    file_name, file_url = save_file(file)
    evidence = Evidence(
        title=title,
        description=description,
        file_name=file_name,
        file_url=file_url,
        control_id=control_id,
        created_by=user.email,
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    db.add(EvidenceFile(evidence_id=evidence.id, file_name=file_name, file_url=file_url, sort_order=0))
    db.commit()

    submission = Submission(
        evidence_id=evidence.id,
        submitted_by=user.email,
        status="pending",
        notes=f"Manual upload via Submit page. {description or ''}".strip(),
    )
    db.add(submission)
    db.commit()

    return evidence


@router.delete("/files/{file_id}", status_code=204)
def delete_evidence_file(file_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    ef = db.query(EvidenceFile).filter(EvidenceFile.id == file_id).first()
    if not ef:
        raise HTTPException(status_code=404, detail="File not found")
    evidence_id = ef.evidence_id
    delete_file(ef.file_name)
    db.delete(ef)
    db.commit()
    remaining = db.query(EvidenceFile).filter(EvidenceFile.evidence_id == evidence_id).count()
    if remaining == 0:
        evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
        if evidence:
            delete_file(evidence.file_name)
            db.delete(evidence)
            db.commit()


@router.get("/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(evidence_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    evidence = db.query(Evidence).options(selectinload(Evidence.files)).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    if user.role != "admin" and evidence.created_by != user.email:
        raise HTTPException(status_code=403, detail="Not authorized to view this evidence")
    return evidence


@router.patch("/{evidence_id}", response_model=EvidenceResponse)
def update_evidence(evidence_id: int, body: _EvidenceUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    evidence = (
        db.query(Evidence)
        .options(selectinload(Evidence.files))
        .filter(Evidence.id == evidence_id)
        .first()
    )
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    if user.role != "admin" and evidence.created_by != user.email:
        raise HTTPException(status_code=403, detail="Not authorized to edit this evidence")
    evidence.description = body.description
    db.commit()
    db.refresh(evidence)
    return evidence


@router.delete("/{evidence_id}", status_code=204)
def delete_evidence(evidence_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    evidence = db.query(Evidence).options(selectinload(Evidence.files)).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    file_names = {ef.file_name for ef in evidence.files}
    file_names.add(evidence.file_name)
    for fn in file_names:
        delete_file(fn)
    db.delete(evidence)
    db.commit()