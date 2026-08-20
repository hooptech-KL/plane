/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import { useTranslation } from "@plane/i18n";
// components
import { PageHead } from "@/components/core/page-title";
import { WorkItemTemplatesRoot } from "@/components/work-item-templates";
// hooks
import { useProject } from "@/hooks/store/use-project";
// local imports
import type { Route } from "./+types/page";

function ProjectTemplatesPage({ params }: Route.ComponentProps) {
  const { workspaceSlug, projectId } = params;
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { getProjectById } = useProject();
  // derived values
  const project = getProjectById(projectId);
  const pageTitle = project?.name ? `${project?.name} - ${t("sidebar.templates")}` : undefined;

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="size-full overflow-y-auto p-6">
        <WorkItemTemplatesRoot workspaceSlug={workspaceSlug} projectId={projectId} />
      </div>
    </>
  );
}

export default observer(ProjectTemplatesPage);
