import { API_BASE_URL } from "@strata/constants";

import { APIService } from "@/services/api.service";

export type TAutomationTrigger = "issue_created" | "issue_state_changed";
export type TAutomationPriority = "none" | "urgent" | "high" | "medium" | "low";

export type TAutomationRule = {
  id: string;
  name: string;
  trigger: TAutomationTrigger;
  conditions: Partial<{ priority: TAutomationPriority; state_id: string }>;
  actions: {
    priority?: TAutomationPriority;
    assignee_ids?: string[];
    label_ids?: string[];
  };
  is_active: boolean;
};

export class AutomationService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  private path(workspaceSlug: string, projectId: string, ruleId?: string) {
    const base = `/api/workspaces/${workspaceSlug}/projects/${projectId}/automation-rules/`;
    return ruleId ? `${base}${ruleId}/` : base;
  }

  async list(workspaceSlug: string, projectId: string): Promise<TAutomationRule[]> {
    return this.get(this.path(workspaceSlug, projectId)).then((response) => response.data);
  }

  async create(workspaceSlug: string, projectId: string, data: Omit<TAutomationRule, "id">): Promise<TAutomationRule> {
    return this.post(this.path(workspaceSlug, projectId), data).then((response) => response.data);
  }

  async update(
    workspaceSlug: string,
    projectId: string,
    ruleId: string,
    data: Partial<TAutomationRule>
  ): Promise<TAutomationRule> {
    return this.patch(this.path(workspaceSlug, projectId, ruleId), data).then((response) => response.data);
  }

  async remove(workspaceSlug: string, projectId: string, ruleId: string): Promise<void> {
    await this.delete(this.path(workspaceSlug, projectId, ruleId));
  }
}
