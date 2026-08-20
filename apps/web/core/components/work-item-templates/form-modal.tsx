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
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TWorkItemTemplate, TWorkItemTemplateData } from "@plane/types";
import { EModalPosition, EModalWidth, Input, ModalCore, TextArea } from "@plane/ui";
// components
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
import { ModuleDropdown } from "@/components/dropdowns/module/dropdown";
import { PriorityDropdown } from "@/components/dropdowns/priority";
import { StateDropdown } from "@/components/dropdowns/state/dropdown";
import { IssueLabelSelect } from "@/components/issues/select";
// hooks
import { useWorkItemTemplate } from "@/hooks/store/use-work-item-template";

type Props = {
  data?: TWorkItemTemplate | null;
  prefilledData?: TWorkItemTemplateData;
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  projectId: string;
};

const EMPTY_DATA: TWorkItemTemplateData = {
  name: "",
  description_html: "",
  priority: "none",
  state_id: undefined,
  assignee_ids: [],
  label_ids: [],
  module_ids: [],
};

export const WorkItemTemplateFormModal = observer(function WorkItemTemplateFormModal(props: Props) {
  const { data, prefilledData, isOpen, onClose, workspaceSlug, projectId } = props;
  // states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateData, setTemplateData] = useState<TWorkItemTemplateData>(EMPTY_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // plane imports
  const { t } = useTranslation();
  // store hooks
  const { createTemplate, updateTemplate } = useWorkItemTemplate();

  useEffect(() => {
    if (!isOpen) return;
    setName(data?.name ?? "");
    setDescription(data?.description ?? "");
    setTemplateData({ ...EMPTY_DATA, ...(data?.data ?? prefilledData) });
  }, [isOpen, data, prefilledData]);

  const handleChange = (partial: Partial<TWorkItemTemplateData>) =>
    setTemplateData((previous) => ({ ...previous, ...partial }));

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = { name: name.trim(), description, data: templateData };
      if (data) await updateTemplate(workspaceSlug, projectId, data.id, payload);
      else await createTemplate(workspaceSlug, projectId, payload);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.success"),
        message: data ? t("work_item_templates.toast.updated") : t("work_item_templates.toast.created"),
      });
      onClose();
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: t("work_item_templates.toast.error"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={onClose} position={EModalPosition.TOP} width={EModalWidth.XXL}>
      <div className="space-y-4 p-5">
        <h3 className="text-lg font-medium">
          {data ? t("work_item_templates.update_template") : t("work_item_templates.create_template")}
        </h3>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("work_item_templates.form.name_placeholder")}
          className="w-full"
        />
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("work_item_templates.form.description_placeholder")}
          className="text-sm min-h-16 w-full resize-none"
        />
        <div className="space-y-3 border-t border-subtle pt-4">
          <p className="text-sm text-secondary">{t("work_item_templates.form.defaults_title")}</p>
          <Input
            value={templateData.name ?? ""}
            onChange={(e) => handleChange({ name: e.target.value })}
            placeholder={t("work_item_templates.form.title_placeholder")}
            className="w-full"
          />
          <TextArea
            value={templateData.description_html ?? ""}
            onChange={(e) => handleChange({ description_html: e.target.value })}
            placeholder={t("work_item_templates.form.body_placeholder")}
            className="text-sm min-h-24 w-full resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-7">
              <StateDropdown
                value={templateData.state_id ?? undefined}
                onChange={(stateId) => handleChange({ state_id: stateId })}
                projectId={projectId}
                buttonVariant="border-with-text"
                isForWorkItemCreation
              />
            </div>
            <div className="h-7">
              <PriorityDropdown
                value={templateData.priority}
                onChange={(priority) => handleChange({ priority })}
                buttonVariant="border-with-text"
              />
            </div>
            <div className="h-7">
              <MemberDropdown
                projectId={projectId}
                value={templateData.assignee_ids ?? []}
                onChange={(assigneeIds) => handleChange({ assignee_ids: assigneeIds })}
                buttonVariant="border-with-text"
                placeholder={t("assignees")}
                multiple
              />
            </div>
            <div className="h-7">
              <IssueLabelSelect
                value={templateData.label_ids ?? []}
                onChange={(labelIds) => handleChange({ label_ids: labelIds })}
                projectId={projectId}
              />
            </div>
            <div className="h-7">
              <ModuleDropdown
                projectId={projectId}
                value={templateData.module_ids ?? []}
                onChange={(moduleIds) => handleChange({ module_ids: moduleIds })}
                placeholder={t("modules")}
                buttonVariant="border-with-text"
                multiple
                showCount
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-subtle p-5">
        <Button variant="secondary" size="sm" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} loading={isSubmitting} disabled={!name.trim()}>
          {data ? t("common.update") : t("common.create")}
        </Button>
      </div>
    </ModalCore>
  );
});
