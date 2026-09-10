from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


AGENTS_DIR = Path(__file__).resolve().parent
INSTRUCTIONS_FILE = AGENTS_DIR / "instructions.md"


def load_instructions() -> str:
    return INSTRUCTIONS_FILE.read_text(encoding="utf-8")


def run_agent(payload: dict[str, Any], api_key: str | None = None) -> dict[str, Any]:
    if not api_key:
        raise ValueError("OPENAI_API_KEY is required to run the LangChain agent.")

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", load_instructions()),
            (
                "user",
                "Analyze this procurement payload and return the required JSON response.\n\n"
                + json.dumps(payload, indent=2),
            ),
        ]
    )

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.2,
        api_key=api_key,
    )

    chain = prompt | llm
    result = chain.invoke({})

    content = result.content if hasattr(result, "content") else str(result)

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        parsed = {
            "call_happened": False,
            "decision": "parse_error",
            "reasons": ["The model did not return valid JSON."],
            "supplier_message": content,
        }

    return parsed


if __name__ == "__main__":
    sample_payload = {
        "agent": {"name": "Procurement Follow-up Agent", "workflowMode": "multi-agent"},
        "purchase_order": {
            "poNumber": "PO-1",
            "supplier": "ABC Components",
            "item": "Industrial Bearings",
            "quantity": "5000 units",
            "orderDate": "2026-09-09",
            "requiredDeliveryDate": "2026-09-15",
            "status": "Awaiting acknowledgement",
            "priority": "Critical",
            "productionImpact": "High",
            "alternativeSupplier": "No",
        },
        "follow_up_policy": {
            "firstReminderAfterHours": "24",
            "secondReminderAfterHours": "24",
            "maximumReminders": "3",
            "escalateDeliveryDelay": True,
            "requireHumanApprovalForChanges": True,
        },
        "llm": {"provider": "OpenAI", "model": "gpt-4o-mini", "apiKey": "", "baseUrl": "https://api.openai.com/v1"},
        "subagents": [{"name": "PO Validation Agent", "description": "Checks acknowledgement, quantities and order context."}],
    }

    api_key = input("Enter your OpenAI API key: ").strip()

    response = run_agent(sample_payload, api_key)
    print(json.dumps(response, indent=2))
