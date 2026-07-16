from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from app.auth import User, get_current_user
from app.database import get_db
from app.models.control import Control
from app.rbac import require_admin
from app.schemas.control import ControlCreate, ControlResponse, ControlUpdate
from app.storage.blob_storage import delete_file

router = APIRouter(prefix="/controls", tags=["Controls"])


@router.get("", response_model=list[ControlResponse])
def list_controls(
    framework_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Control)
    if framework_id:
        query = query.filter(Control.framework_id == framework_id)
    return query.all()


@router.post("", response_model=ControlResponse, status_code=201)
def create_control(payload: ControlCreate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    control = Control(**payload.model_dump())
    db.add(control)
    db.commit()
    db.refresh(control)
    return control


@router.get("/{control_id}", response_model=ControlResponse)
def get_control(control_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    control = db.query(Control).filter(Control.id == control_id).first()
    if not control:
        raise HTTPException(status_code=404, detail="Control not found")
    return control


@router.patch("/{control_id}", response_model=ControlResponse)
def update_control(control_id: int, payload: ControlUpdate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    control = db.query(Control).filter(Control.id == control_id).first()
    if not control:
        raise HTTPException(status_code=404, detail="Control not found")
    if payload.control_ref is not None:
        control.control_ref = payload.control_ref.strip()
    if payload.title is not None:
        control.title = payload.title.strip()
    if payload.description is not None:
        control.description = payload.description.strip() or None
    db.commit()
    db.refresh(control)
    return control


@router.delete("/{control_id}", status_code=204)
def delete_control(control_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    control = db.query(Control).filter(Control.id == control_id).first()
    if not control:
        raise HTTPException(status_code=404, detail="Control not found")
    file_names = [ev.file_name for ev in control.evidence]
    db.delete(control)
    db.commit()
    for name in file_names:
        delete_file(name)
    return Response(status_code=204)
