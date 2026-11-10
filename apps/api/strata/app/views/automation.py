from rest_framework import status
from rest_framework.response import Response

from strata.app.permissions import ROLE, allow_permission
from strata.app.serializers import AutomationRuleSerializer
from strata.app.views.base import BaseViewSet
from strata.db.models import AutomationRule, Project


class AutomationRuleViewSet(BaseViewSet):
    serializer_class = AutomationRuleSerializer
    model = AutomationRule

    def get_queryset(self):
        return AutomationRule.objects.filter(
            workspace__slug=self.kwargs["slug"], project_id=self.kwargs["project_id"]
        )

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "project_id": self.kwargs["project_id"]}

    @allow_permission([ROLE.ADMIN])
    def list(self, request, slug, project_id):
        return Response(self.get_serializer(self.get_queryset(), many=True).data)

    @allow_permission([ROLE.ADMIN])
    def create(self, request, slug, project_id):
        project = Project.objects.get(id=project_id, workspace__slug=slug)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project, workspace=project.workspace)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @allow_permission([ROLE.ADMIN])
    def retrieve(self, request, slug, project_id, pk=None):
        return Response(self.get_serializer(self.get_object()).data)

    @allow_permission([ROLE.ADMIN])
    def partial_update(self, request, slug, project_id, pk=None):
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @allow_permission([ROLE.ADMIN])
    def destroy(self, request, slug, project_id, pk=None):
        self.get_object().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
