# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import models
from django.db.models import Q

from .workspace import WorkspaceBaseModel


class WorkItemTemplate(WorkspaceBaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    data = models.JSONField(default=dict)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "name"],
                condition=Q(deleted_at__isnull=True),
                name="unique_work_item_template_name_when_not_deleted",
            )
        ]
        verbose_name = "Work Item Template"
        verbose_name_plural = "Work Item Templates"
        db_table = "work_item_templates"
        ordering = ("-created_at",)

    def __str__(self):
        return str(self.name)
