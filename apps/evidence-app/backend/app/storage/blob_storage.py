import uuid
from pathlib import Path

from azure.core.exceptions import ResourceNotFoundError
from azure.storage.blob import BlobServiceClient
from fastapi import UploadFile

from app.config import settings

_blob_service: BlobServiceClient | None = None


def _get_blob_service() -> BlobServiceClient:
    global _blob_service
    if _blob_service is None:
        _blob_service = BlobServiceClient.from_connection_string(
            settings.AZURE_STORAGE_CONNECTION_STRING
        )
    return _blob_service


def save_file(file: UploadFile) -> tuple[str, str]:
    """Upload an evidence file to blob storage and return (blob_name, public_url)."""
    extension = Path(file.filename).suffix
    unique_name = f"{uuid.uuid4()}{extension}"
    blob = _get_blob_service().get_blob_client(
        container=settings.AZURE_STORAGE_CONTAINER, blob=unique_name
    )
    blob.upload_blob(file.file, overwrite=True)
    return unique_name, f"/uploads/{unique_name}"


def delete_file(file_name: str) -> None:
    """Delete a blob by name. Missing blobs are treated as already deleted."""
    blob = _get_blob_service().get_blob_client(
        container=settings.AZURE_STORAGE_CONTAINER, blob=file_name
    )
    try:
        blob.delete_blob()
    except ResourceNotFoundError:
        pass
