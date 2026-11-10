import { useState } from "react";
import useSWR from "swr";
import { Switch } from "@makestrata/propel/components/switch";
import { setToast } from "@strata/blocks/toast";

import { SettingsBoxedControlItem } from "@/components/settings/boxed-control-item";
import { AutomationService, type TAutomationPriority, type TAutomationTrigger } from "@/services/automation.service";

const automationService = new AutomationService();
const priorities: TAutomationPriority[] = ["none", "urgent", "high", "medium", "low"];

type Props = { workspaceSlug: string; projectId: string; disabled?: boolean };

export function RuleAutomation({ workspaceSlug, projectId, disabled = false }: Props) {
  const key = `AUTOMATION_RULES_${workspaceSlug}_${projectId}`;
  const { data: rules = [], mutate, isLoading } = useSWR(key, () => automationService.list(workspaceSlug, projectId));
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<TAutomationTrigger>("issue_created");
  const [priority, setPriority] = useState<TAutomationPriority>("medium");
  const [isSaving, setIsSaving] = useState(false);

  const createRule = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await automationService.create(workspaceSlug, projectId, {
        name: name.trim(),
        trigger,
        conditions: {},
        actions: { priority },
        is_active: true,
      });
      setName("");
      await mutate();
    } catch {
      setToast({ type: "error", title: "Unable to create automation rule" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-subtle bg-layer-1 p-4">
        <div className="mb-3">
          <h4 className="text-body-sm-medium">Rule-based automation</h4>
          <p className="text-body-xs-regular text-secondary">Set a work item priority when an event occurs.</p>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_12rem_10rem_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Rule name"
            disabled={disabled || isSaving}
            className="rounded-md border border-subtle bg-layer-1 px-3 py-2 text-body-sm-regular outline-none"
          />
          <select
            value={trigger}
            onChange={(event) => setTrigger(event.target.value as TAutomationTrigger)}
            disabled={disabled || isSaving}
            className="rounded-md border border-subtle bg-layer-1 px-3 py-2 text-body-sm-regular"
          >
            <option value="issue_created">Work item created</option>
            <option value="issue_state_changed">State changed</option>
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TAutomationPriority)}
            disabled={disabled || isSaving}
            className="rounded-md border border-subtle bg-layer-1 px-3 py-2 text-body-sm-regular"
          >
            {priorities.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void createRule()}
            disabled={disabled || isSaving || !name.trim()}
            className="rounded-md bg-accent-primary px-4 py-2 text-body-sm-medium text-on-color disabled:opacity-50"
          >
            Add rule
          </button>
        </div>
      </div>

      {!isLoading &&
        rules.map((rule) => (
          <SettingsBoxedControlItem
            key={rule.id}
            title={rule.name}
            description={`${rule.trigger.replaceAll("_", " ")} · set priority to ${rule.actions.priority ?? "unchanged"}`}
            control={
              <div className="flex items-center gap-3">
                <Switch
                  size="md"
                  checked={rule.is_active}
                  disabled={disabled}
                  onCheckedChange={() =>
                    void automationService
                      .update(workspaceSlug, projectId, rule.id, { is_active: !rule.is_active })
                      .then(() => mutate())
                  }
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void automationService.remove(workspaceSlug, projectId, rule.id).then(() => mutate())}
                  className="text-red-500 text-body-xs-medium disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            }
          />
        ))}
    </div>
  );
}
