/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useCallback, useMemo, useState } from "react";
import { observer } from "mobx-react";
// plane imports
import { DEFAULT_WORK_ITEM_FORM_VALUES } from "@plane/constants";
import type { ISearchIssueResponse, TIssue, TWorkItemTemplateData } from "@plane/types";
// components
import { IssueModalContext } from "@/components/issues/issue-modal/context";
import type { THandleTemplateChangeProps } from "@/components/issues/issue-modal/context";
// hooks
import { useLabel } from "@/hooks/store/use-label";
import { useMember } from "@/hooks/store/use-member";
import { useModule } from "@/hooks/store/use-module";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useUser } from "@/hooks/store/user/user-user";
import { useWorkItemTemplate } from "@/hooks/store/use-work-item-template";

export type TIssueModalProviderProps = {
  templateId?: string;
  dataForPreload?: Partial<TIssue>;
  allowedProjectIds?: string[];
  children: React.ReactNode;
};

const keepExisting = (ids: string[] | null | undefined, available: string[] | null | undefined) =>
  (ids ?? []).filter((id) => (available ?? []).includes(id));

export const IssueModalProvider = observer(function IssueModalProvider(props: TIssueModalProviderProps) {
  const { children, allowedProjectIds, templateId } = props;
  // states
  const [selectedParentIssue, setSelectedParentIssue] = useState<ISearchIssueResponse | null>(null);
  const [workItemTemplateId, setWorkItemTemplateId] = useState<string | null>(templateId ?? null);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  // store hooks
  const { projectsWithCreatePermissions } = useUser();
  const { getTemplateById } = useWorkItemTemplate();
  const { getProjectStateIds } = useProjectState();
  const { getProjectLabelIds } = useLabel();
  const { getProjectModuleIds } = useModule();
  const {
    project: { getProjectMemberIds },
  } = useMember();
  // derived values
  const projectIdsWithCreatePermissions = Object.keys(projectsWithCreatePermissions ?? {});

  const handleTemplateChange = useCallback(
    async ({ reset, editorRef }: THandleTemplateChangeProps) => {
      if (!workItemTemplateId) return;
      const template = getTemplateById(workItemTemplateId);
      if (!template) return;

      setIsApplyingTemplate(true);
      const { name, description_html, priority, state_id, assignee_ids, label_ids, module_ids } = template.data ?? {};
      const projectId = template.project_id;
      const data: TWorkItemTemplateData = {
        name,
        description_html,
        priority,
        state_id: getProjectStateIds(projectId)?.includes(state_id ?? "") ? state_id : undefined,
        assignee_ids: keepExisting(assignee_ids, getProjectMemberIds(projectId, true)),
        label_ids: keepExisting(label_ids, getProjectLabelIds(projectId)),
        module_ids: keepExisting(module_ids, getProjectModuleIds(projectId)),
      };

      reset({
        ...DEFAULT_WORK_ITEM_FORM_VALUES,
        project_id: projectId,
        ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
      } as TIssue);
      editorRef.current?.setEditorValue(description_html ?? "<p></p>", true);
      setIsApplyingTemplate(false);
    },
    [
      workItemTemplateId,
      getTemplateById,
      getProjectStateIds,
      getProjectMemberIds,
      getProjectLabelIds,
      getProjectModuleIds,
    ]
  );

  const contextValue = useMemo(
    () => ({
      allowedProjectIds: allowedProjectIds ?? projectIdsWithCreatePermissions,
      workItemTemplateId,
      setWorkItemTemplateId,
      isApplyingTemplate,
      setIsApplyingTemplate,
      selectedParentIssue,
      setSelectedParentIssue,
      issuePropertyValues: {},
      setIssuePropertyValues: () => {},
      issuePropertyValueErrors: {},
      setIssuePropertyValueErrors: () => {},
      getIssueTypeIdOnProjectChange: () => null,
      getActiveAdditionalPropertiesLength: () => 0,
      handlePropertyValuesValidation: () => true,
      handleCreateUpdatePropertyValues: () => Promise.resolve(),
      handleProjectEntitiesFetch: () => Promise.resolve(),
      handleTemplateChange,
      handleConvert: () => Promise.resolve(),
      handleCreateSubWorkItem: () => Promise.resolve(),
    }),
    [
      allowedProjectIds,
      projectIdsWithCreatePermissions,
      workItemTemplateId,
      isApplyingTemplate,
      selectedParentIssue,
      handleTemplateChange,
    ]
  );

  return <IssueModalContext.Provider value={contextValue}>{children}</IssueModalContext.Provider>;
});
