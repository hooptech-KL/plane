/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { TWorkItemTemplate } from "@plane/types";
import { APIService } from "@/services/api.service";

export class WorkItemTemplateService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getTemplates(workspaceSlug: string, projectId: string): Promise<TWorkItemTemplate[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-templates/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createTemplate(
    workspaceSlug: string,
    projectId: string,
    data: Partial<TWorkItemTemplate>
  ): Promise<TWorkItemTemplate> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-templates/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async patchTemplate(
    workspaceSlug: string,
    projectId: string,
    templateId: string,
    data: Partial<TWorkItemTemplate>
  ): Promise<TWorkItemTemplate> {
    return this.patch(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-templates/${templateId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteTemplate(workspaceSlug: string, projectId: string, templateId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-templates/${templateId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
