/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { set, unset } from "lodash-es";
import { action, makeObservable, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
// types
import type { TWorkItemTemplate } from "@plane/types";
// services
import { WorkItemTemplateService } from "@/services/work-item-template.service";
// store
import type { CoreRootStore } from "./root.store";

export interface IWorkItemTemplateStore {
  templateMap: Record<string, TWorkItemTemplate>;
  fetchedMap: Record<string, boolean>;
  getTemplateById: (templateId: string) => TWorkItemTemplate | undefined;
  getProjectTemplates: (projectId: string) => TWorkItemTemplate[];
  fetchTemplates: (workspaceSlug: string, projectId: string) => Promise<TWorkItemTemplate[]>;
  createTemplate: (
    workspaceSlug: string,
    projectId: string,
    data: Partial<TWorkItemTemplate>
  ) => Promise<TWorkItemTemplate>;
  updateTemplate: (
    workspaceSlug: string,
    projectId: string,
    templateId: string,
    data: Partial<TWorkItemTemplate>
  ) => Promise<TWorkItemTemplate>;
  deleteTemplate: (workspaceSlug: string, projectId: string, templateId: string) => Promise<void>;
}

export class WorkItemTemplateStore implements IWorkItemTemplateStore {
  rootStore;
  templateMap: Record<string, TWorkItemTemplate> = {};
  fetchedMap: Record<string, boolean> = {};
  workItemTemplateService;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      templateMap: observable,
      fetchedMap: observable,
      fetchTemplates: action,
      createTemplate: action,
      updateTemplate: action,
      deleteTemplate: action,
    });

    this.rootStore = _rootStore;
    this.workItemTemplateService = new WorkItemTemplateService();
  }

  getTemplateById = computedFn((templateId: string) => this.templateMap[templateId]);

  getProjectTemplates = computedFn((projectId: string) =>
    Object.values(this.templateMap).filter((template) => template.project === projectId)
  );

  fetchTemplates = async (workspaceSlug: string, projectId: string) => {
    const response = await this.workItemTemplateService.getTemplates(workspaceSlug, projectId);
    runInAction(() => {
      response.forEach((template) => set(this.templateMap, [template.id], template));
      set(this.fetchedMap, [projectId], true);
    });
    return response;
  };

  createTemplate = async (workspaceSlug: string, projectId: string, data: Partial<TWorkItemTemplate>) => {
    const response = await this.workItemTemplateService.createTemplate(workspaceSlug, projectId, data);
    runInAction(() => set(this.templateMap, [response.id], response));
    return response;
  };

  updateTemplate = async (
    workspaceSlug: string,
    projectId: string,
    templateId: string,
    data: Partial<TWorkItemTemplate>
  ) => {
    const response = await this.workItemTemplateService.patchTemplate(workspaceSlug, projectId, templateId, data);
    runInAction(() => set(this.templateMap, [response.id], response));
    return response;
  };

  deleteTemplate = async (workspaceSlug: string, projectId: string, templateId: string) => {
    await this.workItemTemplateService.deleteTemplate(workspaceSlug, projectId, templateId);
    runInAction(() => unset(this.templateMap, [templateId]));
  };
}
