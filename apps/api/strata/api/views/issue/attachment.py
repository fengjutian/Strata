# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import json
import uuid

# Django imports
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponseRedirect
from django.utils import timezone

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# drf-spectacular imports
from drf_spectacular.utils import OpenApiExample, OpenApiRequest, OpenApiResponse

# Module imports
from strata.api.serializers import IssueAttachmentSerializer, IssueAttachmentUploadSerializer
from strata.app.permissions import ROLE
from strata.bgtasks.storage_metadata_task import get_asset_object_metadata
from strata.db.models import FileAsset, Issue, Workspace
from strata.settings.storage import S3Storage
from strata.utils.openapi import (
    ATTACHMENT_ID_PARAMETER,
    ATTACHMENT_NOT_FOUND_RESPONSE,
    ATTACHMENT_UPLOAD_CONFIRM_EXAMPLE,
    FORBIDDEN_RESPONSE,
    INVALID_REQUEST_RESPONSE,
    ISSUE_ATTACHMENT_EXAMPLE,
    ISSUE_ATTACHMENT_NOT_UPLOADED_EXAMPLE,
    ISSUE_ATTACHMENT_UPLOAD_EXAMPLE,
    ISSUE_ID_PARAMETER,
    issue_attachment_docs,
)
from strata.utils.path_validator import sanitize_filename

from . import common
from ..base import BaseAPIView
from .permissions import (
    guest_cannot_view_issue,
    is_active_project_member,
    is_project_or_workspace_admin,
    user_has_issue_permission,
)


class IssueAttachmentListCreateAPIEndpoint(BaseAPIView):
    """Issue Attachment List and Create Endpoint"""

    serializer_class = IssueAttachmentSerializer
    model = FileAsset
    use_read_replica = True

    @issue_attachment_docs(
        operation_id="create_work_item_attachment",
        description="Generate presigned URL for uploading file attachments to a work item.",
        parameters=[
            ISSUE_ID_PARAMETER,
        ],
        request=OpenApiRequest(
            request=IssueAttachmentUploadSerializer,
            examples=[ISSUE_ATTACHMENT_UPLOAD_EXAMPLE],
        ),
        responses={
            200: OpenApiResponse(
                description="Presigned download URL generated successfully",
                examples=[
                    OpenApiExample(
                        name="Work Item Attachment Response",
                        value={
                            "upload_data": {
                                "url": "https://s3.amazonaws.com/bucket/file.pdf?signed-url",
                                "fields": {
                                    "key": "file.pdf",
                                    "AWSAccessKeyId": "AKIAIOSFODNN7EXAMPLE",
                                    "policy": "EXAMPLE",
                                    "signature": "EXAMPLE",
                                    "acl": "public-read",
                                    "Content-Type": "application/pdf",
                                },
                            },
                            "asset_id": "550e8400-e29b-41d4-a716-446655440000",
                            "asset_url": "https://s3.amazonaws.com/bucket/file.pdf?signed-url",
                            "attachment": {
                                "id": "550e8400-e29b-41d4-a716-446655440000",
                                "name": "file.pdf",
                                "type": "application/pdf",
                                "size": 1234567890,
                                "url": "https://s3.amazonaws.com/bucket/file.pdf?signed-url",
                            },
                        },
                    )
                ],
            ),
            400: OpenApiResponse(
                description="Validation error",
                examples=[
                    OpenApiExample(
                        name="Missing required fields",
                        value={
                            "error": "Name and size are required fields.",
                            "status": False,
                        },
                    ),
                    OpenApiExample(
                        name="Invalid file type",
                        value={"error": "Invalid file type.", "status": False},
                    ),
                ],
            ),
            404: OpenApiResponse(
                description="Issue or Project or Workspace not found",
                examples=[
                    OpenApiExample(
                        name="Workspace not found",
                        value={"error": "Workspace not found"},
                    ),
                    OpenApiExample(name="Project not found", value={"error": "Project not found"}),
                    OpenApiExample(name="Issue not found", value={"error": "Issue not found"}),
                ],
            ),
        },
    )
    def post(self, request, slug, project_id, issue_id):
        """Create work item attachment

        Generate presigned URL for uploading file attachments to a work item.
        Validates file type and size before creating the attachment record.
        """
        issue = Issue.objects.get(pk=issue_id, workspace__slug=slug, project_id=project_id)
        # if the user is creator or admin,member then allow the upload
        if not user_has_issue_permission(
            request.user.id,
            project_id=project_id,
            issue=issue,
            allowed_roles=[ROLE.ADMIN.value, ROLE.MEMBER.value, ROLE.GUEST.value],
            allow_creator=True,
        ):
            return Response(
                {"error": "You are not allowed to upload this attachment"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if guest_cannot_view_issue(request.user.id, issue, slug):
            raise Issue.DoesNotExist()

        name = sanitize_filename(request.data.get("name"))
        type = request.data.get("type", False)
        # Clients may send size as a numeric string ("53314").
        # 1e400 parses as inf (OverflowError). Non-positive values must not
        # reach the S3 content-length-range, which is [1, size].
        try:
            size = int(request.data.get("size") or 0)
        except (TypeError, ValueError, OverflowError):
            size = 0
        external_id = request.data.get("external_id")
        external_source = request.data.get("external_source")

        # Check if the request is valid
        if not name or size <= 0:
            return Response(
                {"error": "Invalid request.", "status": False},
                status=status.HTTP_400_BAD_REQUEST,
            )

        size_limit = min(size, settings.FILE_SIZE_LIMIT)

        if not type or type not in settings.ATTACHMENT_MIME_TYPES:
            return Response(
                {"error": "Invalid file type.", "status": False},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the workspace
        workspace = Workspace.objects.get(slug=slug)

        # asset key
        asset_key = f"{workspace.id}/{uuid.uuid4().hex}-{name}"

        if (
            request.data.get("external_id")
            and request.data.get("external_source")
            and FileAsset.objects.filter(
                project_id=project_id,
                workspace__slug=slug,
                external_source=request.data.get("external_source"),
                external_id=request.data.get("external_id"),
                issue_id=issue_id,
                entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
            ).exists()
        ):
            asset = FileAsset.objects.filter(
                project_id=project_id,
                workspace__slug=slug,
                external_source=request.data.get("external_source"),
                external_id=request.data.get("external_id"),
                issue_id=issue_id,
                entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
            ).first()
            return Response(
                {
                    "error": "Issue with the same external id and external source already exists",
                    "id": str(asset.id),
                },
                status=status.HTTP_409_CONFLICT,
            )

        # Create a File Asset
        asset = FileAsset.objects.create(
            attributes={"name": name, "type": type, "size": size_limit},
            asset=asset_key,
            size=size_limit,
            workspace_id=workspace.id,
            created_by=request.user,
            issue_id=issue_id,
            project_id=project_id,
            entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
            external_id=external_id,
            external_source=external_source,
        )

        # Get the presigned URL
        storage = S3Storage(request=request)
        # Generate a presigned URL to share an S3 object
        presigned_url = storage.generate_presigned_post(object_name=asset_key, file_type=type, file_size=size_limit)
        # Return the presigned URL
        return Response(
            {
                "upload_data": presigned_url,
                "asset_id": str(asset.id),
                "attachment": IssueAttachmentSerializer(asset).data,
                "asset_url": asset.asset_url,
            },
            status=status.HTTP_200_OK,
        )

    @issue_attachment_docs(
        operation_id="list_work_item_attachments",
        description="Retrieve all attachments for a work item.",
        parameters=[
            ISSUE_ID_PARAMETER,
        ],
        responses={
            200: OpenApiResponse(
                description="Work item attachment",
                response=IssueAttachmentSerializer,
                examples=[ISSUE_ATTACHMENT_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: ATTACHMENT_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug, project_id, issue_id):
        """List issue attachments

        List all attachments for an issue.
        """
        # Reading attachments requires active project membership
        if not user_has_issue_permission(request.user.id, project_id=project_id, allow_creator=False):
            return Response(
                {"error": "You are not allowed to view these attachments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        issue = Issue.objects.get(pk=issue_id, workspace__slug=slug, project_id=project_id)
        if guest_cannot_view_issue(request.user.id, issue, slug):
            raise Issue.DoesNotExist()

        # Get all the attachments
        issue_attachments = FileAsset.objects.filter(
            issue_id=issue_id,
            entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
            workspace__slug=slug,
            project_id=project_id,
            is_uploaded=True,
        )
        # Serialize the attachments
        serializer = IssueAttachmentSerializer(issue_attachments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class IssueAttachmentDetailAPIEndpoint(BaseAPIView):
    """Issue Attachment Detail Endpoint"""

    serializer_class = IssueAttachmentSerializer
    model = FileAsset
    use_read_replica = True

    @issue_attachment_docs(
        operation_id="delete_work_item_attachment",
        description="Permanently remove an attachment from a work item. Records deletion activity for audit purposes.",
        parameters=[
            ATTACHMENT_ID_PARAMETER,
        ],
        responses={
            204: OpenApiResponse(description="Work item attachment deleted successfully"),
            403: FORBIDDEN_RESPONSE,
            404: ATTACHMENT_NOT_FOUND_RESPONSE,
        },
    )
    def delete(self, request, slug, project_id, issue_id, pk):
        """Delete work item attachment

        Soft delete an attachment from a work item by marking it as deleted.
        Records deletion activity and triggers metadata cleanup.
        """
        issue = Issue.objects.get(pk=issue_id, workspace__slug=slug, project_id=project_id)
        # admins (including a workspace admin with a project GUEST role) skip the guest visibility gate
        is_admin = is_project_or_workspace_admin(request.user.id, project_id, slug)
        if not is_admin and guest_cannot_view_issue(request.user.id, issue, slug):
            raise Issue.DoesNotExist()

        issue_attachment = FileAsset.objects.get(
            id=pk,
            workspace__slug=slug,
            project_id=project_id,
            issue_id=issue_id,
            entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
        )

        # only the attachment's creator (while still an active project member)
        # or an admin may delete it
        if not (
            (
                issue_attachment.created_by_id == request.user.id
                and is_active_project_member(request.user.id, project_id)
            )
            or is_admin
        ):
            return Response(
                {"error": "You are not allowed to delete this attachment"},
                status=status.HTTP_403_FORBIDDEN,
            )

        issue_attachment.is_deleted = True
        issue_attachment.deleted_at = timezone.now()
        issue_attachment.save()

        common.issue_activity.delay(
            type="attachment.activity.deleted",
            requested_data=None,
            actor_id=str(self.request.user.id),
            issue_id=str(issue_id),
            project_id=str(project_id),
            current_instance=None,
            epoch=int(timezone.now().timestamp()),
            notification=True,
            origin=common.base_host(request=request, is_app=True),
        )

        # Get the storage metadata
        if not issue_attachment.storage_metadata:
            get_asset_object_metadata.delay(str(issue_attachment.id))
        issue_attachment.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @issue_attachment_docs(
        operation_id="retrieve_work_item_attachment",
        description="Download attachment file. Returns a redirect to the presigned download URL.",
        parameters=[
            ATTACHMENT_ID_PARAMETER,
        ],
        responses={
            302: OpenApiResponse(
                description="Redirect to presigned download URL",
            ),
            400: OpenApiResponse(
                description="Asset not uploaded",
                response={
                    "type": "object",
                    "properties": {
                        "error": {
                            "type": "string",
                            "description": "Error message",
                            "example": "The asset is not uploaded.",
                        },
                        "status": {
                            "type": "boolean",
                            "description": "Request status",
                            "example": False,
                        },
                    },
                },
                examples=[ISSUE_ATTACHMENT_NOT_UPLOADED_EXAMPLE],
            ),
            404: ATTACHMENT_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug, project_id, issue_id, pk):
        """Retrieve work item attachment

        Retrieve details of a specific attachment.
        """
        # if the user is part of the project then allow the download
        if not user_has_issue_permission(
            request.user.id,
            project_id=project_id,
            issue=None,
            allowed_roles=None,
            allow_creator=False,
        ):
            return Response(
                {"error": "You are not allowed to download this attachment"},
                status=status.HTTP_403_FORBIDDEN,
            )

        issue = Issue.objects.get(pk=issue_id, workspace__slug=slug, project_id=project_id)
        if guest_cannot_view_issue(request.user.id, issue, slug):
            raise Issue.DoesNotExist()

        # Get the asset
        asset = FileAsset.objects.get(
            id=pk,
            workspace__slug=slug,
            project_id=project_id,
            issue_id=issue_id,
            entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
        )

        # Check if the asset is uploaded
        if not asset.is_uploaded:
            return Response(
                {"error": "The asset is not uploaded.", "status": False},
                status=status.HTTP_400_BAD_REQUEST,
            )

        storage = S3Storage(request=request)
        presigned_url = storage.generate_presigned_url(
            object_name=asset.asset.name,
            disposition="attachment",
            filename=asset.attributes.get("name"),
        )
        return HttpResponseRedirect(presigned_url)

    @issue_attachment_docs(
        operation_id="upload_work_item_attachment",
        description="Mark an attachment as uploaded after successful file transfer to storage.",
        parameters=[
            ATTACHMENT_ID_PARAMETER,
        ],
        request=OpenApiRequest(
            request={
                "application/json": {
                    "type": "object",
                    "properties": {
                        "is_uploaded": {
                            "type": "boolean",
                            "description": "Mark attachment as uploaded",
                        }
                    },
                }
            },
            examples=[ATTACHMENT_UPLOAD_CONFIRM_EXAMPLE],
        ),
        responses={
            204: OpenApiResponse(description="Work item attachment uploaded successfully"),
            400: INVALID_REQUEST_RESPONSE,
            404: ATTACHMENT_NOT_FOUND_RESPONSE,
        },
    )
    def patch(self, request, slug, project_id, issue_id, pk):
        """Confirm attachment upload

        Mark an attachment as uploaded after successful file transfer to storage.
        Triggers activity logging and metadata extraction.
        """

        issue = Issue.objects.get(pk=issue_id, workspace__slug=slug, project_id=project_id)
        # if the user is creator or admin then allow the upload
        if not user_has_issue_permission(
            request.user.id,
            project_id=project_id,
            issue=issue,
            allowed_roles=[ROLE.ADMIN.value, ROLE.MEMBER.value, ROLE.GUEST.value],
            allow_creator=True,
        ):
            return Response(
                {"error": "You are not allowed to upload this attachment"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if guest_cannot_view_issue(request.user.id, issue, slug):
            raise Issue.DoesNotExist()

        issue_attachment = FileAsset.objects.get(
            id=pk,
            workspace__slug=slug,
            project_id=project_id,
            issue_id=issue_id,
            entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
        )
        serializer = IssueAttachmentSerializer(issue_attachment)

        # Send this activity only if the attachment is not uploaded before
        if not issue_attachment.is_uploaded:
            common.issue_activity.delay(
                type="attachment.activity.created",
                requested_data=None,
                actor_id=str(self.request.user.id),
                issue_id=str(self.kwargs.get("issue_id", None)),
                project_id=str(self.kwargs.get("project_id", None)),
                current_instance=json.dumps(serializer.data, cls=DjangoJSONEncoder),
                epoch=int(timezone.now().timestamp()),
                notification=True,
                origin=common.base_host(request=request, is_app=True),
            )

            # Update the attachment
            issue_attachment.is_uploaded = True
            # keep the original created_by: delete permission is based on it

        # Get the storage metadata
        if not issue_attachment.storage_metadata:
            get_asset_object_metadata.delay(str(issue_attachment.id))
        issue_attachment.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
