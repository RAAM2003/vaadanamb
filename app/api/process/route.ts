import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json();

  const summary = {
    status: "success",
    mode: payload.agent.workflowMode,
    provider: payload.llm.provider,
    model: payload.llm.model,
    agent_name: payload.agent.name,
    po_number: payload.purchase_order.poNumber,
    supplier: payload.purchase_order.supplier,
    required_inputs: [
      "PO acknowledgement",
      "Quantity confirmation",
      "Delivery-date confirmation",
      "Dispatch date",
      "Shipment/tracking details",
      "Delay reason",
      "Revised delivery date",
    ],
    follow_up_plan: {
      first_reminder_after_hours: Number(payload.follow_up_policy.firstReminderAfterHours || 24),
      second_reminder_after_hours: Number(payload.follow_up_policy.secondReminderAfterHours || 24),
      maximum_reminders: Number(payload.follow_up_policy.maximumReminders || 3),
      escalate_delivery_delay: Boolean(payload.follow_up_policy.escalateDeliveryDelay),
      require_human_approval_for_changes: Boolean(payload.follow_up_policy.requireHumanApprovalForChanges),
    },
    subagents: payload.subagents.map((subagent: { name: string; description: string }) => ({
      name: subagent.name,
      description: subagent.description,
    })),
    note:
      "This is a local demo endpoint. Connect your real LLM service by replacing the mock logic with a real provider call.",
  };

  return NextResponse.json(summary);
}
