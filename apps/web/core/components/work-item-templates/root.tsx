/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { EditIcon, TrashIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TWorkItemTemplate } from "@plane/types";
import { AlertModalCore } from "@plane/ui";
// hooks
import { useWorkItemTemplate } from "@/hooks/store/use-work-item-template";
// local imports
import { WorkItemTemplateFormModal } from "./form-modal";

type Props = {
  workspaceSlug: string;
  projectId: string;
};

export const WorkItemTemplateSettingsRoot = observer(function WorkItemTemplateSettingsRoot(props: Props) {
  const { workspaceSlug, projectId } = props;
  // states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TWorkItemTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<TWorkItemTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // plane imports
  const { t } = useTranslation();
  // store hooks
  const { fetchTemplates, getProjectTemplates, deleteTemplate } = useWorkItemTemplate();
  // derived values
  const templates = getProjectTemplates(projectId);

  useEffect(() => {
    fetchTemplates(workspaceSlug, projectId);
  }, [workspaceSlug, projectId, fetchTemplates]);

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    setIsDeleting(true);
    try {
      await deleteTemplate(workspaceSlug, projectId, deletingTemplate.id);
      setDeletingTemplate(null);
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: t("work_item_templates.toast.error"),
      });
    }
    setIsDeleting(false);
  };

  return (
    <>
      <WorkItemTemplateFormModal
        data={editingTemplate}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTemplate(null);
        }}
        workspaceSlug={workspaceSlug}
        projectId={projectId}
      />
      <AlertModalCore
        isOpen={!!deletingTemplate}
        handleClose={() => setDeletingTemplate(null)}
        handleSubmit={handleDelete}
        isSubmitting={isDeleting}
        title={t("work_item_templates.delete.title")}
        content={<>{t("work_item_templates.delete.content")}</>}
      />
      <div className="flex items-center justify-end">
        <Button variant="primary" size="sm" onClick={() => setIsFormOpen(true)}>
          {t("work_item_templates.create_template")}
        </Button>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {templates.length === 0 ? (
          <p className="text-sm py-6 text-center text-secondary">{t("work_item_templates.empty_state")}</p>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between gap-3 rounded-md border border-subtle px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm truncate font-medium">{template.name}</p>
                {template.description && <p className="truncate text-13 text-secondary">{template.description}</p>}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplate(template);
                    setIsFormOpen(true);
                  }}
                >
                  <EditIcon className="h-4 w-4 text-tertiary" />
                </button>
                <button type="button" onClick={() => setDeletingTemplate(template)}>
                  <TrashIcon className="h-4 w-4 text-tertiary" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
});
