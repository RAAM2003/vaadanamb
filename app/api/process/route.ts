import { NextResponse } from "next/server";

const backendUrl =
  process.env.PYTHON_BACKEND_URL ||
  process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL ||
  "http://127.0.0.1:8000/api/process";

export async function POST(request: Request) {
  const payload = await request.json();

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.ok ? 200 : response.status,
    });
  } catch (error) {
    const llmConfig = payload.llm ?? {};
    const provider = typeof llmConfig.provider === "string" ? llmConfig.provider : "OpenAI";
    const model = typeof llmConfig.model === "string" ? llmConfig.model : "gpt-4o-mini";

    const summary = {
      status: "success",
      mode: payload.agent?.workflowMode ?? "multi-agent",
      provider,
      model,
      agent_name: payload.agent?.name ?? "Procurement Follow-up Agent",
      po_number: payload.purchase_order?.poNumber ?? "",
      supplier: payload.purchase_order?.supplier ?? "",
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
        first_reminder_after_hours: Number(payload.follow_up_policy?.firstReminderAfterHours ?? 24),
        second_reminder_after_hours: Number(payload.follow_up_policy?.secondReminderAfterHours ?? 24),
        maximum_reminders: Number(payload.follow_up_policy?.maximumReminders ?? 3),
        escalate_delivery_delay: Boolean(payload.follow_up_policy?.escalateDeliveryDelay),
        require_human_approval_for_changes: Boolean(payload.follow_up_policy?.requireHumanApprovalForChanges),
      },
      subagents: (payload.subagents ?? []).map((subagent: { name?: string; description?: string }) => ({
        name: subagent.name ?? "Subagent",
        description: subagent.description ?? "",
      })),
      note: "The Python backend was unavailable, so the app returned the local mock response.",
    };

    return NextResponse.json({
      ...summary,
      ai_generation: {
        enabled: false,
        mode: "fallback",
        message:
          error instanceof Error
            ? `Backend unavailable: ${error.message}. Returning mock response.`
            : "Backend unavailable. Returning mock response.",
      },
    });
  }
}
