"""
Submission reads must be scoped to the owning Engineer, mirroring how
Evidence reads are already scoped: a non-admin only sees Submissions tied to
Evidence they created; an Admin sees everything.

Seeds two Engineers' worth of Evidence + Submission rows directly via
`db_session`, then asserts list/get behaviour over HTTP through the
`engineer_client` / `admin_client` fixtures from conftest.py.
"""
from app.models.evidence import Evidence
from app.models.submission import Submission


def _make_evidence_with_submission(db_session, *, created_by: str, title: str) -> Submission:
    evidence = Evidence(
        title=title,
        description="test evidence",
        file_name=f"{title}.png",
        file_url=f"/uploads/{title}.png",
        control_id=None,
        created_by=created_by,
    )
    db_session.add(evidence)
    db_session.commit()
    db_session.refresh(evidence)

    submission = Submission(
        evidence_id=evidence.id,
        submitted_by=created_by,
        status="pending",
        notes=f"submission for {title}",
    )
    db_session.add(submission)
    db_session.commit()
    db_session.refresh(submission)
    return submission


def test_engineer_lists_only_their_own_submissions(db_session, engineer_client, engineer_user):
    own = _make_evidence_with_submission(db_session, created_by=engineer_user.email, title="own-evidence")
    _make_evidence_with_submission(db_session, created_by="other-engineer@example.com", title="other-evidence")

    response = engineer_client.get("/api/submissions")

    assert response.status_code == 200
    ids = {s["id"] for s in response.json()}
    assert ids == {own.id}


def test_admin_lists_all_submissions(db_session, admin_client, engineer_user):
    mine = _make_evidence_with_submission(db_session, created_by=engineer_user.email, title="own-evidence")
    theirs = _make_evidence_with_submission(db_session, created_by="other-engineer@example.com", title="other-evidence")

    response = admin_client.get("/api/submissions")

    assert response.status_code == 200
    ids = {s["id"] for s in response.json()}
    assert ids == {mine.id, theirs.id}


def test_engineer_reading_own_submission_by_id_succeeds(db_session, engineer_client, engineer_user):
    own = _make_evidence_with_submission(db_session, created_by=engineer_user.email, title="own-evidence")

    response = engineer_client.get(f"/api/submissions/{own.id}")

    assert response.status_code == 200
    assert response.json()["id"] == own.id


def test_engineer_reading_another_engineers_submission_by_id_is_refused(db_session, engineer_client):
    theirs = _make_evidence_with_submission(db_session, created_by="other-engineer@example.com", title="other-evidence")

    response = engineer_client.get(f"/api/submissions/{theirs.id}")

    assert response.status_code == 403


def test_admin_reads_any_submission_by_id(db_session, admin_client):
    theirs = _make_evidence_with_submission(db_session, created_by="some-engineer@example.com", title="some-evidence")

    response = admin_client.get(f"/api/submissions/{theirs.id}")

    assert response.status_code == 200
    assert response.json()["id"] == theirs.id
