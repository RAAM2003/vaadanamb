from typing import Any

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Vaadanamb Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "app": "Vaadanamb",
        "message": "Backend is running inside the Vaadanamb repo.",
    }


@app.post("/api/process")
async def process(payload: dict[str, Any]) -> dict[str, Any]:
    agent = payload.get("agent", {}) or {}
    purchase_order = payload.get("purchase_order", {}) or {}
    follow_up_policy = payload.get("follow_up_policy", {}) or {}
    subagents = payload.get("subagents", []) or []
    llm_config = payload.get("llm", {}) or {}

    provider = str(llm_config.get("provider", "OpenAI") or "OpenAI")
    model = str(llm_config.get("model", "gpt-4o-mini") or "gpt-4o-mini")

    summary = {
        "status": "success",
        "mode": agent.get("workflowMode", "multi-agent"),
        "provider": provider,
        "model": model,
        "agent_name": agent.get("name", "Procurement Follow-up Agent"),
        "po_number": purchase_order.get("poNumber", ""),
        "supplier": purchase_order.get("supplier", ""),
        "required_inputs": [
            "PO acknowledgement",
            "Quantity confirmation",
            "Delivery-date confirmation",
            "Dispatch date",
            "Shipment/tracking details",
            "Delay reason",
            "Revised delivery date",
        ],
        "follow_up_plan": {
            "first_reminder_after_hours": int(follow_up_policy.get("firstReminderAfterHours", 24) or 24),
            "second_reminder_after_hours": int(follow_up_policy.get("secondReminderAfterHours", 24) or 24),
            "maximum_reminders": int(follow_up_policy.get("maximumReminders", 3) or 3),
            "escalate_delivery_delay": bool(follow_up_policy.get("escalateDeliveryDelay", False)),
            "require_human_approval_for_changes": bool(follow_up_policy.get("requireHumanApprovalForChanges", False)),
        },
        "subagents": [
            {
                "name": subagent.get("name", "Subagent"),
                "description": subagent.get("description", ""),
            }
            for subagent in subagents
        ],
        "note": "This Vaadanamb backend uses mock logic by default. Add an API key in the LLM settings to enable live generation.",
    }

    api_key = str(llm_config.get("apiKey", "") or "").strip()
    base_url = str(llm_config.get("baseUrl", "https://api.openai.com/v1") or "https://api.openai.com/v1").strip()

    if not api_key or not base_url:
        return {
            **summary,
            "ai_generation": {
                "enabled": False,
                "mode": "mock",
                "message": "No API key provided. Using mock follow-up generation.",
            },
        }

    try:
        chat_completion_url = (
            base_url
            if base_url.endswith("/chat/completions")
            else f"{base_url.rstrip('/')}/chat/completions"
        )

        prompt = (
            "You are a procurement follow-up assistant. Generate a professional supplier reminder message "
            "based on the data below. Keep it concise, polite, and actionable.\n\n"
            f"PO Number: {purchase_order.get('poNumber', '')}\n"
            f"Supplier: {purchase_order.get('supplier', '')}\n"
            f"Item: {purchase_order.get('item', '')}\n"
            f"Quantity: {purchase_order.get('quantity', '')}\n"
            f"Order Date: {purchase_order.get('orderDate', '')}\n"
            f"Required Delivery Date: {purchase_order.get('requiredDeliveryDate', '')}\n"
            f"Status: {purchase_order.get('status', '')}\n"
            f"Priority: {purchase_order.get('priority', '')}\n"
            f"Production Impact: {purchase_order.get('productionImpact', '')}\n"
            f"Alternative Supplier: {purchase_order.get('alternativeSupplier', '')}\n"
            f"Follow-up policy: first reminder after {follow_up_policy.get('firstReminderAfterHours', 24)} hours, "
            f"second reminder after {follow_up_policy.get('secondReminderAfterHours', 24)} hours, "
            f"maximum reminders {follow_up_policy.get('maximumReminders', 3)}."
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                chat_completion_url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a helpful procurement coordination assistant. Respond with a short, clear supplier follow-up message in plain text.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.7,
                },
            )

        if response.status_code >= 400:
            raise RuntimeError(f"LLM request failed ({response.status_code}): {response.text}")

        completion_data = response.json()
        choices = completion_data.get("choices", []) or []
        generated_message = (
            choices[0].get("message", {}).get("content", "No response generated.")
            if choices
            else "No response generated."
        )

        return {
            **summary,
            "ai_generation": {
                "enabled": True,
                "mode": "live",
                "provider": provider,
                "model": model,
                "message": generated_message,
            },
            "note": "Live OpenAI-compatible LLM generation was used because an API key was provided in the LLM settings.",
        }
    except Exception as exc:
        return {
            **summary,
            "ai_generation": {
                "enabled": False,
                "mode": "fallback",
                "message": (
                    f"Live generation failed: {exc}. Falling back to mock response."
                    if str(exc)
                    else "Live generation failed. Falling back to mock response."
                ),
            },
            "note": "Live LLM generation failed, so the Vaadanamb backend returned mock follow-up data.",
        }
