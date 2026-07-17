"""
End-to-end coverage of `POST /api/evidence` — the app's main write path,
never exercised by any test until now because it uploads to blob storage on
its first line and the suite had no seam for blob storage at all (see
`tests/conftest.py`'s `blob_container` fixture, added alongside this file).

These run against a real Azurite emulator, so they assert what a user of the
API would actually observe — the response, the database rows, and whether
an uploaded file can really be fetched or is really gone after deletion —
never an internal detail like "we called save_file" / "we called
delete_file". That distinction is the reason a real emulator was chosen
over a fake in the first place.
"""
import httpx

from app.models.control import Control
from app.models.evidence_file import EvidenceFile
from app.models.evidence import Evidence
from app.models.framework import Framework
from app.models.product import Product
from app.models.submission import Submission
from app.storage.blob_storage import get_signed_url


def _make_control(db_session) -> Control:
    product = Product(name="Test Product")
    db_session.add(product)
    db_session.flush()
    framework = Framework(product_id=product.id, name="Test Framework")
    db_session.add(framework)
    db_session.flush()
    control = Control(framework_id=framework.id, control_ref="C-1", title="Test Control")
    db_session.add(control)
    db_session.commit()
    db_session.refresh(control)
    return control


def test_create_evidence_end_to_end(db_session, engineer_client, engineer_user):
    """The request succeeds, the Evidence, its Evidence File and its
    Submission all exist, and the uploaded file is really fetchable —
    a real GET against the emulator, not an assertion that some internal
    upload function was called."""
    control = _make_control(db_session)

    response = engineer_client.post(
        "/api/evidence",
        data={
            "title": "Console screenshot",
            "control_id": str(control.id),
            "description": "proof the control is satisfied",
        },
        files={"file": ("screenshot.png", b"fake screenshot bytes", "image/png")},
    )

    assert response.status_code == 201
    body = response.json()

    evidence = db_session.query(Evidence).filter(Evidence.id == body["id"]).one()
    assert evidence.title == "Console screenshot"
    assert evidence.control_id == control.id
    assert evidence.created_by == engineer_user.email

    evidence_file = (
        db_session.query(EvidenceFile)
        .filter(EvidenceFile.evidence_id == evidence.id)
        .one()
    )
    assert evidence_file.file_name == evidence.file_name

    submission = (
        db_session.query(Submission).filter(Submission.evidence_id == evidence.id).one()
    )
    assert submission.status == "pending"
    assert submission.submitted_by == engineer_user.email

    fetch = httpx.get(body["file_url"])
    assert fetch.status_code == 200
    assert fetch.content == b"fake screenshot bytes"


def test_deleting_evidence_file_really_removes_it_from_storage(
    db_session, engineer_client, admin_client
):
    """A later fetch of a deleted file's blob fails rather than succeeding —
    the property that matters, not whether `delete_file` was invoked."""
    control = _make_control(db_session)

    create_response = engineer_client.post(
        "/api/evidence",
        data={"title": "Console screenshot", "control_id": str(control.id)},
        files={"file": ("screenshot.png", b"more fake bytes", "image/png")},
    )
    assert create_response.status_code == 201
    evidence_id = create_response.json()["id"]

    evidence_file = (
        db_session.query(EvidenceFile)
        .filter(EvidenceFile.evidence_id == evidence_id)
        .one()
    )

    # Fetchable before deletion — establishes the file was really there.
    assert httpx.get(get_signed_url(evidence_file.file_name)).status_code == 200

    delete_response = admin_client.delete(f"/api/evidence/files/{evidence_file.id}")
    assert delete_response.status_code == 204

    fetch_after = httpx.get(get_signed_url(evidence_file.file_name))
    assert fetch_after.status_code == 404
