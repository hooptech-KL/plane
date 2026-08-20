/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { useTranslation } from "@plane/i18n";
import { ChevronDownIcon, CopyIcon } from "@plane/propel/icons";
import { CustomSearchSelect } from "@plane/ui";
// hooks
import { useIssueModal } from "@/hooks/context/use-issue-modal";
import { useProject } from "@/hooks/store/use-project";
import { useWorkItemTemplate } from "@/hooks/store/use-work-item-template";

export type TWorkItemTemplateDropdownSize = "xs" | "sm";

export type TWorkItemTemplateSelect = {
  projectId: string | null;
  typeId: string | null;
  disabled?: boolean;
  size?: TWorkItemTemplateDropdownSize;
  placeholder?: string;
  renderChevron?: boolean;
  dropDownContainerClassName?: string;
  handleModalClose: () => void;
  handleFormChange?: () => void;
};

export const WorkItemTemplateSelect = observer(function WorkItemTemplateSelect(props: TWorkItemTemplateSelect) {
  const { projectId, disabled, placeholder, renderChevron, dropDownContainerClassName, handleFormChange } = props;
  // router
  const { workspaceSlug } = useParams();
  // plane imports
  const { t } = useTranslation();
  // store hooks
  const { getProjectById } = useProject();
  const { workItemTemplateId, setWorkItemTemplateId } = useIssueModal();
  const { fetchedMap, fetchTemplates, getProjectTemplates } = useWorkItemTemplate();
  // derived values
  const isEnabled = !!projectId && !!getProjectById(projectId)?.work_item_template_view;
  const templates = projectId ? getProjectTemplates(projectId) : [];

  useEffect(() => {
    if (!isEnabled || !projectId || !workspaceSlug || fetchedMap[projectId]) return;
    fetchTemplates(workspaceSlug.toString(), projectId);
  }, [isEnabled, projectId, workspaceSlug, fetchedMap, fetchTemplates]);

  if (!isEnabled) return <></>;

  const options = templates.map((template) => ({
    value: template.id,
    query: template.name,
    content: <span className="flex-grow truncate">{template.name}</span>,
  }));

  return (
    <CustomSearchSelect
      value={workItemTemplateId}
      onChange={(value: string) => {
        setWorkItemTemplateId(value);
        handleFormChange?.();
      }}
      options={options}
      label={
        <span className="flex items-center gap-1.5">
          <CopyIcon className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            {templates.find((template) => template.id === workItemTemplateId)?.name ?? placeholder ?? t("templates")}
          </span>
          {renderChevron && <ChevronDownIcon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />}
        </span>
      }
      className={dropDownContainerClassName}
      noResultsMessage={t("work_item_templates.empty_state")}
      noChevron
      disabled={disabled}
    />
  );
});
