# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Module imports
from .base import BaseSerializer
from plane.db.models import WorkItemTemplate


class WorkItemTemplateSerializer(BaseSerializer):
    class Meta:
        model = WorkItemTemplate
        fields = "__all__"
        read_only_fields = ["workspace", "project", "deleted_at"]
