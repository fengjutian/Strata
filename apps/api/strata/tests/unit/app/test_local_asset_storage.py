from urllib.parse import parse_qs, urlparse

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from strata.settings.storage import S3Storage


@pytest.mark.unit
def test_local_asset_upload_and_download(settings, tmp_path):
    settings.FILE_STORAGE_BACKEND = "local"
    settings.MEDIA_ROOT = tmp_path
    settings.SIGNED_URL_EXPIRATION = 3600

    storage = S3Storage()
    upload = storage.generate_presigned_post(
        object_name="workspace/logo.png",
        file_type="image/png",
        file_size=8,
    )

    response = APIClient().post(
        upload["url"],
        {"file": SimpleUploadedFile("logo.png", b"png-data", content_type="image/png")},
        format="multipart",
    )

    assert response.status_code == 204
    assert (tmp_path / "workspace" / "logo.png").read_bytes() == b"png-data"

    download_url = storage.generate_presigned_url(
        object_name="workspace/logo.png",
        disposition="inline",
        filename="logo.png",
        content_type="image/png",
    )
    assert parse_qs(urlparse(download_url).query)["token"]

    response = APIClient().get(download_url)

    assert response.status_code == 200
    assert b"".join(response.streaming_content) == b"png-data"
    assert response["Content-Type"] == "image/png"


@pytest.mark.unit
def test_local_asset_upload_rejects_files_larger_than_signed_limit(settings, tmp_path):
    settings.FILE_STORAGE_BACKEND = "local"
    settings.MEDIA_ROOT = tmp_path
    settings.SIGNED_URL_EXPIRATION = 3600

    upload = S3Storage().generate_presigned_post(
        object_name="workspace/logo.png",
        file_type="image/png",
        file_size=3,
    )
    response = APIClient().post(
        upload["url"],
        {"file": SimpleUploadedFile("logo.png", b"too-large", content_type="image/png")},
        format="multipart",
    )

    assert response.status_code == 400
    assert not (tmp_path / "workspace" / "logo.png").exists()
