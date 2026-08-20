/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TIssue } from "./issues/issue";

export type TWorkItemTemplateData = Partial<
  Pick<TIssue, "name" | "description_html" | "priority" | "state_id" | "assignee_ids" | "label_ids" | "module_ids">
>;

export type TWorkItemTemplate = {
  id: string;
  name: string;
  description: string;
  data: TWorkItemTemplateData;
  project: string;
  workspace: string;
  created_at: string;
  updated_at: string;
};
