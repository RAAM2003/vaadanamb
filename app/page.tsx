"use client";

import { useMemo, useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react";

const initialState = {
  agent: {
    name: "Procurement Follow-up Agent",
    role: "Supplier coordination assistant",
    company: "Vaadanamb Procurement",
    region: "India",
    workflowMode: "multi-agent",
    instructions: "You are the procurement follow-up assistant. Coordinate with suppliers, prepare concise reminders, and escalate delivery risks only when the policy requires it.",
    tools: [
      {
        id: 1,
        name: "python_hello",
        type: "python",
        code: "print('BHASHA SETU agent is ready.')",
        premium_only: false,
      },
      {
        id: 2,
        name: "python_premium_summary",
        type: "python",
        code: "print('Premium supplier summary generated.')",
        premium_only: true,
      },
    ],
  },
  purchaseOrder: {
    poNumber: "PO-10245",
    supplier: "ABC Components",
    item: "Industrial Bearings",
    quantity: "5000 units",
    orderDate: "2026-09-09",
    requiredDeliveryDate: "2026-09-15",
    deliveryLocation: "Chennai Plant",
    status: "Awaiting acknowledgement",
    priority: "Critical",
    productionImpact: "High",
    alternativeSupplier: "No",
    maxAcceptableDelayDays: "1",
  },
  supplier: {
    contactPerson: "Rajesh Kumar",
    email: "supplier@abc.com",
    preferredLanguage: "Hindi",
    preferredChannel: "Email",
    workingHours: "9 AM - 6 PM",
  },
  followUpPolicy: {
    firstReminderAfterHours: "24",
    secondReminderAfterHours: "24",
    maximumReminders: "3",
    escalateDeliveryDelay: true,
    requireHumanApprovalForChanges: true,
  },
  llm: {
    provider: "OpenAI",
    model: "gpt-4o-mini",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
  },
  subagents: [
    { id: 1, name: "PO Validation Agent", description: "Checks acknowledgement, quantities and order context." },
    { id: 2, name: "Delivery Risk Agent", description: "Flags delays and escalation risk." },
  ],
};

const supplierProfiles = [
  {
    name: "ABC Components",
    contactPerson: "Rajesh Kumar",
    email: "supplier@abc.com",
    preferredLanguage: "Hindi",
    preferredChannel: "Email",
    workingHours: "9 AM - 6 PM",
  },
  {
    name: "SteelWorks Suppliers",
    contactPerson: "Anand Singh",
    email: "sales@steelworks.in",
    preferredLanguage: "English",
    preferredChannel: "WhatsApp",
    workingHours: "10 AM - 7 PM",
  },
  {
    name: "Chennai Industrial Co.",
    contactPerson: "Meena Nair",
    email: "ops@chennaiindustrial.in",
    preferredLanguage: "Tamil",
    preferredChannel: "Phone",
    workingHours: "8 AM - 5 PM",
  },
];

const modelOptionsByProvider: Record<string, readonly string[]> = {
  OpenAI: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"],
  "Azure OpenAI": ["gpt-4o-mini", "gpt-4.1-mini"],
  OpenRouter: ["openai/gpt-4o-mini", "openai/gpt-4o", "meta-llama/llama-3.1-8b-instruct"],
  Custom: ["Custom model (subscription required)"],
};

export default function Home() {
  const [form, setForm] = useState(initialState);
  const [result, setResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMode, setInputMode] = useState<"upload" | "manual">("upload");
  const [uploadSummary, setUploadSummary] = useState("No CSV or file imported yet.");
  const [uploadPreview, setUploadPreview] = useState<Record<string, string>[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "premium">("free");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isFlowEditorOpen, setIsFlowEditorOpen] = useState(false);
  const [isFreeInfoModalOpen, setIsFreeInfoModalOpen] = useState(false);
  const [agentFlowSteps, setAgentFlowSteps] = useState([
    { id: 1, title: "Capture context", description: "Load purchase order, supplier, and delivery data." },
    { id: 2, title: "Generate reminders", description: "Prepare polite, classroom-friendly follow-up messages." },
    { id: 3, title: "Escalate risk", description: "Flag delays and request approval when a critical issue is detected." },
  ]);

  const isDarkTheme = theme === "dark";
  const pageStyle = isDarkTheme ? styles.page : styles.pageLight;
  const headerStyle = isDarkTheme ? styles.header : styles.headerLight;
  const eyebrowStyle = isDarkTheme ? styles.eyebrow : styles.eyebrowLight;
  const titleStyle = isDarkTheme ? styles.title : styles.titleLight;
  const subtitleStyle = isDarkTheme ? styles.subtitle : styles.subtitleLight;

  const overviewCards = [
    {
      label: "Workflow",
      value: form.agent.workflowMode === "multi-agent" ? "Multi-agent" : "Single-agent",
      tone: "blue",
    },
    {
      label: "LLM Provider",
      value: form.llm.provider,
      tone: "purple",
    },
    {
      label: "Supplier",
      value: form.purchaseOrder.supplier,
      tone: "green",
    },
    {
      label: "PO Status",
      value: form.purchaseOrder.status,
      tone: "orange",
    },
  ];

  const payload = useMemo(() => ({
    agent: form.agent,
    purchase_order: form.purchaseOrder,
    supplier: form.supplier,
    follow_up_policy: form.followUpPolicy,
    llm: form.llm,
    subagents: form.subagents,
  }), [form]);

  const availableModels = useMemo(
    () => modelOptionsByProvider[form.llm.provider] ?? modelOptionsByProvider.OpenAI,
    [form.llm.provider],
  );

  const selectedSupplierProfile = useMemo(
    () => supplierProfiles.find((supplier) => supplier.name === form.purchaseOrder.supplier) ?? supplierProfiles[0],
    [form.purchaseOrder.supplier],
  );

  const visibleTools = useMemo(
    () => selectedPlan === "premium"
      ? form.agent.tools
      : form.agent.tools.filter((tool) => !tool.premium_only),
    [selectedPlan, form.agent.tools],
  );

  const updateAgent = <K extends keyof typeof form.agent>(key: K, value: (typeof form.agent)[K]) => {
    setForm((prev) => ({ ...prev, agent: { ...prev.agent, [key]: value } }));
  };

  const updateAgentInstructions = (instructions: string) => {
    setForm((prev) => ({ ...prev, agent: { ...prev.agent, instructions } }));
  };

  const updateAgentTool = (id: number, field: "name" | "type" | "code" | "premium_only", value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      agent: {
        ...prev.agent,
        tools: prev.agent.tools.map((tool) =>
          tool.id === id ? { ...tool, [field]: value } : tool,
        ),
      },
    }));
  };

  const addAgentTool = () => {
    setForm((prev) => ({
      ...prev,
      agent: {
        ...prev.agent,
        tools: [
          ...prev.agent.tools,
          {
            id: Date.now(),
            name: "new_tool",
            type: "python",
            code: "print('New demo tool')",
            premium_only: false,
          },
        ],
      },
    }));
  };

  const updateFlowStep = (id: number, field: "title" | "description", value: string) => {
    setAgentFlowSteps((prev) => prev.map((step) =>
      step.id === id ? { ...step, [field]: value } : step,
    ));
  };

  const updatePurchaseOrder = <K extends keyof typeof form.purchaseOrder>(key: K, value: (typeof form.purchaseOrder)[K]) => {
    setForm((prev) => ({ ...prev, purchaseOrder: { ...prev.purchaseOrder, [key]: value } }));
  };

  const updateSupplier = <K extends keyof typeof form.supplier>(key: K, value: (typeof form.supplier)[K]) => {
    setForm((prev) => ({ ...prev, supplier: { ...prev.supplier, [key]: value } }));
  };

  const updateFollowUpPolicy = <K extends keyof typeof form.followUpPolicy>(key: K, value: (typeof form.followUpPolicy)[K]) => {
    setForm((prev) => ({ ...prev, followUpPolicy: { ...prev.followUpPolicy, [key]: value } }));
  };

  const updateLlm = <K extends keyof typeof form.llm>(key: K, value: (typeof form.llm)[K]) => {
    setForm((prev) => ({ ...prev, llm: { ...prev.llm, [key]: value } }));
  };

  const handleProviderChange = (provider: typeof form.llm.provider) => {
    const nextModels = modelOptionsByProvider[provider] ?? modelOptionsByProvider.OpenAI;
    const nextModel = nextModels.includes(form.llm.model) ? form.llm.model : nextModels[0];

    setForm((prev) => ({
      ...prev,
      llm: {
        ...prev.llm,
        provider,
        model: nextModel,
      },
    }));
  };

  const applySupplierProfile = (supplierName: string) => {
    const profile = supplierProfiles.find((supplier) => supplier.name === supplierName);

    if (!profile) return;

    setForm((prev) => ({
      ...prev,
      purchaseOrder: {
        ...prev.purchaseOrder,
        supplier: supplierName,
      },
      supplier: {
        ...prev.supplier,
        contactPerson: profile.contactPerson,
        email: profile.email,
        preferredLanguage: profile.preferredLanguage,
        preferredChannel: profile.preferredChannel,
        workingHours: profile.workingHours,
      },
    }));
  };

  const applyParsedCsvRow = (row: Record<string, string>) => {
    const valueFor = (aliases: string[]) => {
      for (const alias of aliases) {
        const normalizedAlias = alias.toLowerCase();
        const direct = row[normalizedAlias];
        if (direct && direct.trim()) return direct.trim();
      }
      return "";
    };

    setForm((prev) => ({
      ...prev,
      purchaseOrder: {
        ...prev.purchaseOrder,
        poNumber: valueFor(["po_number", "po number", "purchase_order_number", "po no"]) || prev.purchaseOrder.poNumber,
        supplier: valueFor(["supplier", "supplier_name", "supplier name"]) || prev.purchaseOrder.supplier,
        item: valueFor(["item", "product", "item_name", "product_name"]) || prev.purchaseOrder.item,
        quantity: valueFor(["quantity", "qty"]) || prev.purchaseOrder.quantity,
        orderDate: valueFor(["order_date", "order date"]) || prev.purchaseOrder.orderDate,
        requiredDeliveryDate: valueFor(["required_delivery_date", "required delivery date", "delivery_date"]) || prev.purchaseOrder.requiredDeliveryDate,
        deliveryLocation: valueFor(["delivery_location", "delivery location", "location"]) || prev.purchaseOrder.deliveryLocation,
        status: valueFor(["status", "po_status", "purchase_order_status"]) || prev.purchaseOrder.status,
        priority: valueFor(["priority", "po_priority"]) || prev.purchaseOrder.priority,
        productionImpact: valueFor(["production_impact", "production impact"]) || prev.purchaseOrder.productionImpact,
        alternativeSupplier: valueFor(["alternative_supplier", "alternative supplier"]) || prev.purchaseOrder.alternativeSupplier,
        maxAcceptableDelayDays: valueFor(["max_acceptable_delay_days", "acceptable_delay_days", "max_delay_days"]) || prev.purchaseOrder.maxAcceptableDelayDays,
      },
      supplier: {
        ...prev.supplier,
        contactPerson: valueFor(["contact_person", "contact person"]) || prev.supplier.contactPerson,
        email: valueFor(["email", "supplier_email"]) || prev.supplier.email,
        preferredLanguage: valueFor(["preferred_language", "preferred language"]) || prev.supplier.preferredLanguage,
        preferredChannel: valueFor(["preferred_channel", "preferred channel"]) || prev.supplier.preferredChannel,
        workingHours: valueFor(["working_hours", "working hours"]) || prev.supplier.workingHours,
      },
      followUpPolicy: {
        ...prev.followUpPolicy,
        firstReminderAfterHours: valueFor(["first_reminder_after_hours", "first reminder after hours"]) || prev.followUpPolicy.firstReminderAfterHours,
        secondReminderAfterHours: valueFor(["second_reminder_after_hours", "second reminder after hours"]) || prev.followUpPolicy.secondReminderAfterHours,
        maximumReminders: valueFor(["maximum_reminders", "max reminders"]) || prev.followUpPolicy.maximumReminders,
      },
    }));
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsedRows = parseCsvRows(text);

    if (parsedRows.length === 0) {
      setUploadSummary(`No usable rows found in ${file.name}. Please upload a CSV with headers.`);
      setUploadPreview([]);
      return;
    }

    setUploadSummary(`Loaded ${parsedRows.length} row(s) from ${file.name}.`);
    setUploadPreview(parsedRows);
    applyParsedCsvRow(parsedRows[0]);
  };

  const addSubagent = () => {
    setForm((prev) => ({
      ...prev,
      subagents: [
        ...prev.subagents,
        { id: Date.now(), name: "New Subagent", description: "Describe this subagent purpose." },
      ],
    }));
  };

  const updateSubagent = (id: number, field: "name" | "description", value: string) => {
    setForm((prev) => ({
      ...prev,
      subagents: prev.subagents.map((agent) =>
        agent.id === id ? { ...agent, [field]: value } : agent
      ),
    }));
  };

  const handleRunAgent = async () => {
    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(
        JSON.stringify(
          {
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          null,
          2,
        ),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main style={pageStyle}>
      <div style={styles.container}>
        <header style={headerStyle}>
          <div style={styles.headerContent}>
            <div>
              <p style={eyebrowStyle}>VAADHANAMB</p>
              <h1 style={titleStyle}>Procurement Agent Configuration</h1>
              <p style={subtitleStyle}>Configure supplier coordination, follow-up policies, and the LLM stack in one polished workspace.</p>
            </div>

            <div style={styles.headerActions}>
              <div style={styles.badgeRow}>
                <span style={styles.badge}>Agent UI</span>
                <span style={styles.badgeSecondary}>{form.agent.workflowMode}</span>
              </div>

              <div style={styles.planSwitcher}>
                <button
                  type="button"
                  onClick={() => setSelectedPlan("free")}
                  style={selectedPlan === "free" ? styles.planButtonActive : styles.planButton}
                >
                  Free Demo
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlan("premium")}
                  style={selectedPlan === "premium" ? styles.planButtonActivePremium : styles.planButtonPremium}
                >
                  Premium Mock
                </button>
              </div>

              <div style={styles.themeSwitcher}>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  style={theme === "dark" ? styles.themeButtonActive : styles.themeButton}
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  style={theme === "light" ? styles.themeButtonActive : styles.themeButton}
                >
                  Light
                </button>
              </div>

              <button onClick={handleRunAgent} style={styles.primaryButton} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Run agent"}
              </button>
            </div>
          </div>

          <div style={styles.headerStats}>
            <div style={styles.headerStat}>
              <span style={styles.headerStatLabel}>Active agents</span>
              <strong style={styles.headerStatValue}>{form.subagents.length + 1}</strong>
            </div>
            <div style={styles.headerStat}>
              <span style={styles.headerStatLabel}>Supplier</span>
              <strong style={styles.headerStatValue}>{form.purchaseOrder.supplier}</strong>
            </div>
            <div style={styles.headerStat}>
              <span style={styles.headerStatLabel}>PO status</span>
              <strong style={styles.headerStatValue}>{form.purchaseOrder.status}</strong>
            </div>
          </div>
        </header>

        <section style={styles.metricsGrid}>
          {overviewCards.map((card) => (
            <div key={card.label} style={{ ...styles.metricCard, background: card.tone === "blue" ? "linear-gradient(135deg, rgba(47, 74, 140, 0.88) 0%, rgba(42, 54, 96, 0.92) 100%)" : card.tone === "purple" ? "linear-gradient(135deg, rgba(78, 58, 132, 0.9) 0%, rgba(42, 44, 92, 0.92) 100%)" : card.tone === "green" ? "linear-gradient(135deg, rgba(28, 76, 75, 0.9) 0%, rgba(22, 56, 54, 0.93) 100%)" : "linear-gradient(135deg, rgba(111, 80, 46, 0.86) 0%, rgba(74, 55, 38, 0.92) 100%)" }}>
              <span style={styles.metricLabel}>{card.label}</span>
              <strong style={styles.metricValue}>{card.value}</strong>
            </div>
          ))}
        </section>

        <section style={styles.dataSourceHeader}>
          <div style={styles.dataSourceTopRow}>
            <div style={styles.dataSourceText}>
              <p style={styles.eyebrow}>Supplier</p>
              <h2 style={styles.cardTitle}>Select supplier</h2>
            </div>

            <div style={styles.segmentControl}>
              <button
                type="button"
                onClick={() => setInputMode("upload")}
                style={inputMode === "upload" ? styles.segmentButtonActive : styles.segmentButton}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setInputMode("manual")}
                style={inputMode === "manual" ? styles.segmentButtonActive : styles.segmentButton}
              >
                Enter details
              </button>
            </div>
          </div>

          <div style={styles.dataSourceContent}>
            <label style={styles.dropdownField}>
              <span style={styles.dropdownLabel}>Supplier</span>
              <select
                value={form.purchaseOrder.supplier}
                onChange={(e) => {
                  updatePurchaseOrder("supplier", e.target.value);
                  applySupplierProfile(e.target.value);
                }}
                style={styles.dropdown}
              >
                {supplierProfiles.map((supplier) => (
                  <option key={supplier.name} value={supplier.name}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={styles.supplierSummaryCard}>
              <div style={styles.supplierSummaryHeader}>
                <span style={styles.supplierPill}>Active profile</span>
                <span style={styles.dataSourceSummary}>{uploadSummary}</span>
              </div>

              <div style={styles.supplierSummaryGrid}>
                <div>
                  <p style={styles.supplierLabel}>Contact person</p>
                  <strong style={styles.supplierValue}>{selectedSupplierProfile.contactPerson}</strong>
                </div>
                <div>
                  <p style={styles.supplierLabel}>Preferred channel</p>
                  <strong style={styles.supplierValue}>{selectedSupplierProfile.preferredChannel}</strong>
                </div>
                <div>
                  <p style={styles.supplierLabel}>Email</p>
                  <strong style={styles.supplierValue}>{selectedSupplierProfile.email}</strong>
                </div>
                <div>
                  <p style={styles.supplierLabel}>Preferred language</p>
                  <strong style={styles.supplierValue}>{selectedSupplierProfile.preferredLanguage}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={styles.grid}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>1. Agent Information</h2>

            <div style={styles.formGrid}>
              <Field label="Agent Name">
                {selectedPlan === "premium" ? (
                  <input value={form.agent.name} onChange={(e) => updateAgent("name", e.target.value)} style={styles.input} />
                ) : (
                  <div style={styles.readOnlyValue}>{form.agent.name}</div>
                )}
              </Field>
              <Field label="Role">
                {selectedPlan === "premium" ? (
                  <input value={form.agent.role} onChange={(e) => updateAgent("role", e.target.value)} style={styles.input} />
                ) : (
                  <div style={styles.readOnlyValue}>{form.agent.role}</div>
                )}
              </Field>
              <Field label="Company">
                {selectedPlan === "premium" ? (
                  <input value={form.agent.company} onChange={(e) => updateAgent("company", e.target.value)} style={styles.input} />
                ) : (
                  <div style={styles.readOnlyValue}>{form.agent.company}</div>
                )}
              </Field>
              <Field label="Region">
                {selectedPlan === "premium" ? (
                  <input value={form.agent.region} onChange={(e) => updateAgent("region", e.target.value)} style={styles.input} />
                ) : (
                  <div style={styles.readOnlyValue}>{form.agent.region}</div>
                )}
              </Field>
              <Field label="Workflow Mode">
                {selectedPlan === "premium" ? (
                  <select value={form.agent.workflowMode} onChange={(e) => updateAgent("workflowMode", e.target.value as typeof form.agent.workflowMode)} style={styles.input}>
                    <option value="single-agent">Single Agent</option>
                    <option value="multi-agent">Multi-Agent</option>
                  </select>
                ) : (
                  <div style={styles.readOnlyValue}>{form.agent.workflowMode === "multi-agent" ? "Multi-Agent" : "Single Agent"}</div>
                )}
              </Field>
            </div>

            {selectedPlan === "premium" && (
              <div style={styles.agentDetailsPanel}>
                <div style={styles.flowHeader}>
                  <div>
                    <p style={styles.subtleEyebrow}>Flow orchestration</p>
                    <h3 style={styles.subCardTitle}>Agent flow</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFlowEditorOpen((prev) => !prev)}
                    style={styles.secondaryButtonSmall}
                  >
                    {isFlowEditorOpen ? "Done editing" : "Edit flow"}
                  </button>
                </div>

                {isFlowEditorOpen ? (
                  <div style={styles.flowEditorList}>
                    {agentFlowSteps.map((step) => (
                      <div key={step.id} style={styles.flowEditorItem}>
                        <div style={styles.flowEditorHeader}>
                          <span style={styles.flowStepBadge}>Step {step.id}</span>
                        </div>
                        <Field label="Step title">
                          <input
                            value={step.title}
                            onChange={(e) => updateFlowStep(step.id, "title", e.target.value)}
                            style={styles.input}
                          />
                        </Field>
                        <Field label="Step description">
                          <textarea
                            value={step.description}
                            onChange={(e) => updateFlowStep(step.id, "description", e.target.value)}
                            style={{ ...styles.input, minHeight: 84, resize: "vertical" }}
                          />
                        </Field>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.flowList}>
                    {agentFlowSteps.map((step) => (
                      <div key={step.id} style={styles.flowItem}>
                        <div style={styles.flowItemTop}>
                          <span style={styles.flowStepBadge}>Step {step.id}</span>
                          <span style={styles.flowStepTitle}>{step.title}</span>
                        </div>
                        <p style={styles.flowStepText}>{step.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedPlan === "premium" && (
              <div style={styles.agentDetailsPanel}>
                <div style={styles.flowHeader}>
                  <div>
                    <p style={styles.subtleEyebrow}>Agent instructions</p>
                    <h3 style={styles.subCardTitle}>System prompt</h3>
                  </div>
                </div>

                <div style={styles.instructionsEditorWrap}>
                  <textarea
                    value={form.agent.instructions}
                    onChange={(e) => updateAgentInstructions(e.target.value)}
                    style={{ ...styles.input, minHeight: 120, resize: "vertical" }}
                  />
                </div>
              </div>
            )}

            {selectedPlan === "premium" && (
              <div style={styles.agentDetailsPanel}>
                <div style={styles.flowHeader}>
                  <div>
                    <p style={styles.subtleEyebrow}>Available tools</p>
                    <h3 style={styles.subCardTitle}>Configured tools</h3>
                  </div>
                </div>

                <div style={styles.flowList}>
                  {form.agent.tools.map((tool) => (
                    <div key={tool.id} style={styles.flowItem}>
                      <div style={styles.flowItemTop}>
                        <span style={styles.flowStepBadge}>{tool.premium_only ? "Premium" : "Basic"}</span>
                        <span style={styles.flowStepTitle}>{tool.name}</span>
                      </div>
                      <p style={styles.flowStepText}>{tool.code}</p>
                    </div>
                  ))}

                  <div style={styles.infoBox}>
                    <p style={styles.infoText}>
                      Custom tools require the Ultra subscription.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedPlan === "free" && (
              <div style={styles.agentDetailsPanel}>
                <div style={styles.flowHeader}>
                  <div>
                    <p style={styles.subtleEyebrow}>Demo details</p>
                    <h3 style={styles.subCardTitle}>Free mode overview</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFreeInfoModalOpen(true)}
                    style={styles.infoButton}
                  >
                    ⓘ Info
                  </button>
                </div>
              </div>
            )}

            {selectedPlan === "free" && isFreeInfoModalOpen && (
              <div style={styles.modalOverlay} onClick={() => setIsFreeInfoModalOpen(false)}>
                <div style={styles.modalCard} onClick={(event) => event.stopPropagation()}>
                  <div style={styles.modalHeader}>
                    <div>
                      <p style={styles.subtleEyebrow}>Free demo details</p>
                      <h3 style={styles.subCardTitle}>Agent overview</h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsFreeInfoModalOpen(false)}
                      style={styles.popoverCloseButton}
                    >
                      Close
                    </button>
                  </div>

                  <div style={styles.modalBody}>
                    <div style={styles.modalSection}>
                      <h4 style={styles.modalSectionTitle}>Flow orchestration</h4>
                      <div style={styles.flowList}>
                        {agentFlowSteps.map((step) => (
                          <div key={step.id} style={styles.flowItem}>
                            <div style={styles.flowItemTop}>
                              <span style={styles.flowStepBadge}>Step {step.id}</span>
                              <span style={styles.flowStepTitle}>{step.title}</span>
                            </div>
                            <p style={styles.flowStepText}>{step.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={styles.modalSection}>
                      <h4 style={styles.modalSectionTitle}>Agent instructions</h4>
                      <div style={styles.infoBox}>
                        <p style={styles.infoText}>{form.agent.instructions}</p>
                      </div>
                    </div>

                    <div style={styles.modalSection}>
                      <h4 style={styles.modalSectionTitle}>Available tools</h4>
                      <div style={styles.flowList}>
                        {visibleTools.map((tool) => (
                          <div key={tool.id} style={styles.flowItem}>
                            <div style={styles.flowItemTop}>
                              <span style={styles.flowStepBadge}>{tool.type}</span>
                              <span style={styles.flowStepTitle}>{tool.name}</span>
                            </div>
                            <p style={styles.flowStepText}>{tool.code}</p>
                          </div>
                        ))}
                      </div>
                      <div style={styles.infoBox}>
                        <p style={styles.infoText}>Custom tools require the Ultra subscription.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>2. LLM Connection</h2>

            <div style={styles.formGrid}>
              <Field label="Provider">
                <select
                  value={form.llm.provider}
                  onChange={(e) => handleProviderChange(e.target.value as typeof form.llm.provider)}
                  style={styles.input}
                >
                  <option value="OpenAI">OpenAI</option>
                  <option value="Azure OpenAI">Azure OpenAI</option>
                  <option value="OpenRouter">OpenRouter</option>
                  <option value="Custom">Custom</option>
                </select>
              </Field>
              <Field label="Model">
                <select
                  value={form.llm.model}
                  onChange={(e) => updateLlm("model", e.target.value)}
                  style={styles.input}
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="LLM URL">
                <input value={form.llm.baseUrl} onChange={(e) => updateLlm("baseUrl", e.target.value)} style={styles.input} />
              </Field>
              <div style={styles.helperTextBox}>
                <span style={styles.helperText}>
                  {selectedPlan === "premium"
                    ? "Premium mock account enables advanced agent controls, custom provider setup, and premium workflow options."
                    : form.llm.provider === "Custom"
                      ? "Custom model with API key support is available only on the subscribed plan."
                      : "Free demo uses IndicTrans2 for translation."}
                </span>
              </div>
              <Field label="LLM Key">
                <input type="password" value={form.llm.apiKey} onChange={(e) => updateLlm("apiKey", e.target.value)} style={styles.input} placeholder="Enter API key" />
              </Field>
            </div>
          </div>

          {inputMode === "upload" && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>3. Upload supplier data</h2>

              <div style={styles.uploadBox}>
                <label htmlFor="csv-upload" style={styles.uploadLabelButton}>Choose CSV / text file</label>
                <input id="csv-upload" type="file" accept=".csv,.txt,.json" onChange={handleFileUpload} style={styles.fileInputHidden} />
              </div>

              <p style={styles.uploadMeta}>{uploadSummary}</p>

              {uploadPreview.length > 0 && (
                <div style={styles.uploadPreview}>
                  <p style={styles.previewTitle}>Detected columns</p>
                  <div style={styles.chipRow}>
                    {Object.keys(uploadPreview[0]).map((key) => (
                      <span key={key} style={styles.chip}>{key}</span>
                    ))}
                  </div>
                  <pre style={styles.previewCode}>{JSON.stringify(uploadPreview[0], null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {inputMode === "manual" && (
            <>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>3. Purchase Order Information</h2>

                <div style={styles.formGrid}>
                  <Field label="PO Number">
                    <input value={form.purchaseOrder.poNumber} onChange={(e) => updatePurchaseOrder("poNumber", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Supplier">
                    <input value={form.purchaseOrder.supplier} onChange={(e) => updatePurchaseOrder("supplier", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Item/Product">
                    <input value={form.purchaseOrder.item} onChange={(e) => updatePurchaseOrder("item", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Quantity">
                    <input value={form.purchaseOrder.quantity} onChange={(e) => updatePurchaseOrder("quantity", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Order Date">
                    <input type="date" value={form.purchaseOrder.orderDate} onChange={(e) => updatePurchaseOrder("orderDate", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Required Delivery Date">
                    <input type="date" value={form.purchaseOrder.requiredDeliveryDate} onChange={(e) => updatePurchaseOrder("requiredDeliveryDate", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Delivery Location">
                    <input value={form.purchaseOrder.deliveryLocation} onChange={(e) => updatePurchaseOrder("deliveryLocation", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="PO Status">
                    <input value={form.purchaseOrder.status} onChange={(e) => updatePurchaseOrder("status", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Priority">
                    <select value={form.purchaseOrder.priority} onChange={(e) => updatePurchaseOrder("priority", e.target.value as typeof form.purchaseOrder.priority)} style={styles.input}>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Normal">Normal</option>
                    </select>
                  </Field>
                  <Field label="Production Impact">
                    <select value={form.purchaseOrder.productionImpact} onChange={(e) => updatePurchaseOrder("productionImpact", e.target.value as typeof form.purchaseOrder.productionImpact)} style={styles.input}>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </Field>
                  <Field label="Alternative Supplier">
                    <select value={form.purchaseOrder.alternativeSupplier} onChange={(e) => updatePurchaseOrder("alternativeSupplier", e.target.value as typeof form.purchaseOrder.alternativeSupplier)} style={styles.input}>
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </Field>
                  <Field label="Max Acceptable Delay (Days)">
                    <input value={form.purchaseOrder.maxAcceptableDelayDays} onChange={(e) => updatePurchaseOrder("maxAcceptableDelayDays", e.target.value)} style={styles.input} />
                  </Field>
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>4. Supplier Information</h2>

                <div style={styles.formGrid}>
                  <Field label="Contact Person">
                    <input value={form.supplier.contactPerson} onChange={(e) => updateSupplier("contactPerson", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Email">
                    <input value={form.supplier.email} onChange={(e) => updateSupplier("email", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Preferred Language">
                    <input value={form.supplier.preferredLanguage} onChange={(e) => updateSupplier("preferredLanguage", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Preferred Channel">
                    <input value={form.supplier.preferredChannel} onChange={(e) => updateSupplier("preferredChannel", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Working Hours">
                    <input value={form.supplier.workingHours} onChange={(e) => updateSupplier("workingHours", e.target.value)} style={styles.input} />
                  </Field>
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>5. Follow-up Rules</h2>

                <div style={styles.formGrid}>
                  <Field label="First Reminder After (hours)">
                    <input value={form.followUpPolicy.firstReminderAfterHours} onChange={(e) => updateFollowUpPolicy("firstReminderAfterHours", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Second Reminder After (hours)">
                    <input value={form.followUpPolicy.secondReminderAfterHours} onChange={(e) => updateFollowUpPolicy("secondReminderAfterHours", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Maximum Reminders">
                    <input value={form.followUpPolicy.maximumReminders} onChange={(e) => updateFollowUpPolicy("maximumReminders", e.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Escalate Delivery Delay">
                    <input
                      type="checkbox"
                      checked={form.followUpPolicy.escalateDeliveryDelay}
                      onChange={(e) => updateFollowUpPolicy("escalateDeliveryDelay", e.target.checked)}
                      style={styles.checkbox}
                    />
                  </Field>
                  <Field label="Require Human Approval for Changes">
                    <input
                      type="checkbox"
                      checked={form.followUpPolicy.requireHumanApprovalForChanges}
                      onChange={(e) => updateFollowUpPolicy("requireHumanApprovalForChanges", e.target.checked)}
                      style={styles.checkbox}
                    />
                  </Field>
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>6. Subagents / Multi-agent setup</h2>

                <div style={styles.subagentList}>
                  {form.subagents.map((subagent) => (
                    <div key={subagent.id} style={styles.subagentCard}>
                      <div style={styles.subagentHeader}>
                        <span style={styles.subagentBadge}>Subagent</span>
                      </div>
                      <Field label="Name">
                        <input value={subagent.name} onChange={(e) => updateSubagent(subagent.id, "name", e.target.value)} style={styles.input} />
                      </Field>
                      <Field label="Description">
                        <textarea value={subagent.description} onChange={(e) => updateSubagent(subagent.id, "description", e.target.value)} style={{ ...styles.input, minHeight: 84, resize: "vertical" }} />
                      </Field>
                    </div>
                  ))}
                </div>

                <button onClick={addSubagent} style={styles.secondaryButton}>Add subagent</button>
              </div>
            </>
          )}
        </section>

        <section style={styles.previewCard}>
          <div style={styles.previewHeader}>
            <h2 style={styles.cardTitle}>Agent payload preview</h2>
            <button onClick={handleRunAgent} style={styles.primaryButton} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Run agent"}
            </button>
          </div>

          <pre style={styles.code}>{JSON.stringify(payload, null, 2)}</pre>

          {result && (
            <div style={styles.resultContainer}>
              <h3 style={styles.cardTitle}>Processing result</h3>
              <pre style={styles.resultCode}>{result}</pre>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function parseCsvRows(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const [headerLine, ...rows] = lines;
  const headers = headerLine
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);

  if (headers.length === 0) return [];

  return rows
    .map((row) => {
      const cells = row.split(",");
      const record: Record<string, string> = {};

      headers.forEach((header, index) => {
        record[header] = cells[index]?.trim() ?? "";
      });

      return record;
    })
    .filter((row) => Object.values(row).some((value) => value.trim()));
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #081321 0%, #0e1c2d 25%, #101d32 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#ecf3ff",
    padding: "32px 16px",
  },
  pageLight: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #eef4ff 0%, #dae8ff 30%, #f2f6ff 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#10213d",
    padding: "32px 16px",
  },
  container: {
    maxWidth: 1280,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 22,
    padding: "28px 30px",
    background: "linear-gradient(135deg, #0b1220 0%, #111f3c 32%, #1e3a8a 78%, #3a5ec5 100%)",
    borderRadius: 28,
    boxShadow: "0 26px 54px rgba(18, 33, 59, 0.38)",
    color: "#ffffff",
    border: "1px solid rgba(163, 180, 255, 0.24)",
    position: "relative",
    overflow: "hidden",
  },
  headerLight: {
    display: "flex",
    flexDirection: "column",
    gap: 22,
    padding: "28px 30px",
    background: "linear-gradient(135deg, #f3f7ff 0%, #e6eefc 32%, #dfeaff 78%, #d0dbff 100%)",
    borderRadius: 28,
    boxShadow: "0 26px 54px rgba(90, 116, 180, 0.18)",
    color: "#0f172a",
    border: "1px solid rgba(108, 135, 199, 0.2)",
    position: "relative",
    overflow: "hidden",
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    position: "relative",
    zIndex: 1,
  },
  headerActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 12,
  },
  planSwitcher: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  themeSwitcher: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  planButton: {
    border: "1px solid rgba(166, 192, 255, 0.3)",
    borderRadius: 12,
    padding: "10px 14px",
    background: "rgba(15, 30, 53, 0.65)",
    color: "#edf3ff",
    fontWeight: 700,
    cursor: "pointer",
  },
  planButtonActive: {
    border: "1px solid rgba(81, 199, 213, 0.8)",
    borderRadius: 12,
    padding: "10px 14px",
    background: "rgba(81, 199, 213, 0.18)",
    color: "#dffeff",
    fontWeight: 800,
    cursor: "pointer",
  },
  planButtonPremium: {
    border: "1px solid rgba(166, 192, 255, 0.3)",
    borderRadius: 12,
    padding: "10px 14px",
    background: "rgba(15, 30, 53, 0.65)",
    color: "#edf3ff",
    fontWeight: 700,
    cursor: "pointer",
  },
  planButtonActivePremium: {
    border: "1px solid rgba(126, 224, 184, 0.8)",
    borderRadius: 12,
    padding: "10px 14px",
    background: "rgba(126, 224, 184, 0.18)",
    color: "#e6fff0",
    fontWeight: 800,
    cursor: "pointer",
  },
  themeButton: {
    border: "1px solid rgba(166, 192, 255, 0.3)",
    borderRadius: 12,
    padding: "10px 14px",
    background: "rgba(15, 30, 53, 0.65)",
    color: "#edf3ff",
    fontWeight: 700,
    cursor: "pointer",
  },
  themeButtonActive: {
    border: "1px solid rgba(81, 199, 213, 0.8)",
    borderRadius: 12,
    padding: "10px 14px",
    background: "rgba(81, 199, 213, 0.18)",
    color: "#dffeff",
    fontWeight: 800,
    cursor: "pointer",
  },
  subtitle: {
    margin: "10px 0 0",
    maxWidth: 720,
    color: "rgba(255,255,255,0.84)",
    fontSize: 15,
    lineHeight: 1.6,
  },
  subtitleLight: {
    margin: "10px 0 0",
    maxWidth: 720,
    color: "#3d4d69",
    fontSize: 15,
    lineHeight: 1.6,
  },
  headerStats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
    position: "relative",
    zIndex: 1,
  },
  headerStat: {
    borderRadius: 18,
    padding: "14px 16px",
    background: "rgba(15, 23, 42, 0.16)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    backdropFilter: "blur(4px)",
  },
  headerStatLabel: {
    display: "block",
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    textTransform: "uppercase",
    letterSpacing: 0.12,
    marginBottom: 8,
    fontWeight: 700,
  },
  headerStatValue: {
    fontSize: 16,
    color: "#ffffff",
    lineHeight: 1.4,
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
  },
  metricCard: {
    padding: "18px 20px",
    borderRadius: 22,
    border: "1px solid rgba(160, 177, 227, 0.18)",
    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.2)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    transform: "translateY(0)",
  },
  metricLabel: {
    fontSize: 12,
    color: "#bdd1ff",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.06,
  },
  metricValue: {
    fontSize: 18,
    color: "#f3f7ff",
  },
  dataSourceHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    padding: "24px 24px",
    background: "linear-gradient(135deg, rgba(18, 30, 48, 0.98) 0%, rgba(23, 38, 64, 0.98) 100%)",
    borderRadius: 24,
    border: "1px solid rgba(160, 177, 227, 0.18)",
    boxShadow: "0 18px 36px rgba(20,33,61,0.18)",
  },
  dataSourceTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  dataSourceContent: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 300px) minmax(0, 1fr)",
    gap: 18,
    alignItems: "stretch",
  },
  dataSourceText: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  segmentControl: {
    display: "inline-flex",
    padding: 6,
    borderRadius: 12,
    background: "rgba(85, 103, 169, 0.22)",
    gap: 8,
    border: "1px solid rgba(160, 177, 227, 0.16)",
  },
  segmentButton: {
    border: "none",
    borderRadius: 10,
    background: "transparent",
    color: "#cfe0ff",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  segmentButtonActive: {
    border: "none",
    borderRadius: 10,
    background: "linear-gradient(135deg, #4a5cff 0%, #6d7bff 100%)",
    color: "#ffffff",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(74,92,255,0.25)",
  },
  dataSourceSummary: {
    color: "#d4e0ff",
    fontSize: 14,
    fontWeight: 600,
  },
  supplierSummaryCard: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 18,
    borderRadius: 18,
    background: "linear-gradient(135deg, rgba(13, 24, 39, 0.95) 0%, rgba(17, 30, 50, 0.95) 100%)",
    border: "1px solid rgba(153, 170, 255, 0.18)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  },
  supplierSummaryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  supplierSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 14,
  },
  supplierLabel: {
    margin: 0,
    fontSize: 11,
    color: "#9fb3d9",
    textTransform: "uppercase",
    letterSpacing: 0.06,
    fontWeight: 700,
  },
  supplierValue: {
    display: "block",
    marginTop: 6,
    color: "#edf4ff",
    fontSize: 14,
  },
  supplierPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: "#e7ecff",
    color: "#2f41d4",
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.08,
    textTransform: "uppercase",
  },
  dropdownField: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 18,
    borderRadius: 18,
    background: "linear-gradient(180deg, rgba(13, 24, 39, 0.95) 0%, rgba(17, 30, 50, 0.95) 100%)",
    border: "1px solid rgba(153, 170, 255, 0.18)",
    minHeight: "100%",
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#c5d4f5",
    textTransform: "uppercase",
    letterSpacing: 0.06,
  },
  dropdown: {
    width: "100%",
    border: "1px solid rgba(159, 177, 235, 0.4)",
    borderRadius: 12,
    padding: "11px 12px",
    fontSize: 14,
    background: "rgba(13, 24, 39, 0.85)",
    color: "#edf4ff",
    outline: "none",
    boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.02)",
  },
  uploadBox: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 18,
    borderRadius: 16,
    background: "linear-gradient(135deg, rgba(17, 28, 44, 0.96) 0%, rgba(24, 38, 64, 0.96) 100%)",
    border: "1px dashed rgba(161, 180, 255, 0.38)",
    minWidth: 250,
    boxShadow: "inset 0 0 0 1px rgba(99, 102, 241, 0.05)",
  },
  uploadLabel: {
    fontWeight: 700,
    color: "#dfeaff",
    cursor: "pointer",
  },
  uploadLabelButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    borderRadius: 12,
    padding: "11px 16px",
    background: "linear-gradient(135deg, #4a5cff 0%, #6d7bff 100%)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(74, 92, 255, 0.22)",
  },
  fileInput: {
    width: "100%",
    borderRadius: 10,
    padding: 8,
    background: "rgba(13, 24, 39, 0.85)",
    border: "1px solid rgba(159, 177, 235, 0.4)",
    color: "#edf4ff",
  },
  fileInputHidden: {
    display: "none",
  },
  uploadMeta: {
    marginTop: 12,
    color: "#d4e0ff",
    fontSize: 14,
  },
  uploadPreview: {
    marginTop: 20,
    paddingTop: 16,
    borderTop: "1px solid #e5eaf7",
  },
  previewTitle: {
    margin: "0 0 12px",
    fontWeight: 700,
    color: "#334155",
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "#edf1ff",
    color: "#3346d1",
    fontSize: 12,
    fontWeight: 700,
  },
  previewCode: {
    margin: 0,
    background: "#0f172a",
    color: "#e2e8f0",
    borderRadius: 12,
    padding: 18,
    fontSize: 13,
    overflowX: "auto",
    whiteSpace: "pre-wrap",
  },
  collapsibleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  toggleButton: {
    border: "1px solid #cdd7ff",
    borderRadius: 10,
    padding: "8px 12px",
    background: "#edf1ff",
    color: "#2f41d4",
    fontWeight: 700,
    cursor: "pointer",
  },
  manualContent: {
    display: "grid",
    gap: 18,
  },
  cardSubSection: {
    border: "1px solid #e5eaf7",
    borderRadius: 14,
    padding: 16,
    background: "#fafcff",
  },
  subSectionTitle: {
    margin: "0 0 14px",
    color: "#1e293b",
  },
  eyebrow: {
    margin: 0,
    color: "#b6c9ff",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    fontSize: 18,
  },
  eyebrowLight: {
    margin: 0,
    color: "#435b96",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    fontSize: 18,
  },
  title: {
    margin: "6px 0 0",
    fontSize: "clamp(2.1rem, 3vw, 3.2rem)",
    lineHeight: 1.1,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: "#ffffff",
  },
  titleLight: {
    margin: "6px 0 0",
    fontSize: "clamp(2.1rem, 3vw, 3.2rem)",
    lineHeight: 1.1,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: "#0f172a",
  },
  badgeRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: "#e8ebff",
    color: "#3346d1",
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
  },
  badgeSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: "#eafaf1",
    color: "#11833d",
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 24,
  },
  card: {
    background: "linear-gradient(180deg, rgba(21, 35, 58, 0.96) 0%, rgba(17, 28, 47, 0.96) 100%)",
    borderRadius: 26,
    padding: 22,
    boxShadow: "0 22px 40px rgba(5, 11, 22, 0.35)",
    border: "1px solid rgba(153, 170, 255, 0.18)",
  },
  previewCard: {
    background: "linear-gradient(180deg, rgba(21, 35, 58, 0.96) 0%, rgba(17, 28, 47, 0.96) 100%)",
    borderRadius: 26,
    padding: 22,
    boxShadow: "0 22px 40px rgba(5, 11, 22, 0.35)",
    border: "1px solid rgba(153, 170, 255, 0.18)",
  },
  cardTitle: {
    margin: "0 0 18px",
    fontSize: 22,
    color: "#edf4ff",
  },
  agentDetailsPanel: {
    marginTop: 22,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 18,
    borderRadius: 18,
    background: "linear-gradient(180deg, rgba(18, 31, 49, 0.96) 0%, rgba(21, 35, 58, 0.96) 100%)",
    border: "1px solid rgba(161, 180, 255, 0.22)",
  },
  subtleEyebrow: {
    margin: 0,
    color: "#afc2ee",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    fontSize: 11,
  },
  subCardTitle: {
    margin: "4px 0 0",
    fontSize: 18,
    color: "#edf4ff",
  },
  flowHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  flowHeaderActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  flowList: {
    display: "grid",
    gap: 12,
  },
  flowItem: {
    borderRadius: 14,
    padding: 14,
    background: "rgba(11, 24, 39, 0.9)",
    border: "1px solid rgba(161, 180, 255, 0.18)",
  },
  flowItemTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  flowStepBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "6px 10px",
    background: "rgba(101, 124, 204, 0.2)",
    border: "1px solid rgba(161, 180, 255, 0.18)",
    color: "#dfeaff",
    fontSize: 11,
    fontWeight: 700,
  },
  flowStepTitle: {
    color: "#edf4ff",
    fontWeight: 700,
  },
  flowStepText: {
    margin: 0,
    color: "#cfe0ff",
    lineHeight: 1.6,
    fontSize: 14,
  },
  secondaryButtonSmall: {
    border: "1px solid rgba(161, 180, 255, 0.25)",
    borderRadius: 10,
    background: "rgba(75, 95, 161, 0.22)",
    color: "#edf4ff",
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  infoButton: {
    border: "1px solid rgba(161, 180, 255, 0.25)",
    borderRadius: 10,
    background: "rgba(74, 92, 255, 0.14)",
    color: "#edf4ff",
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  flowEditorList: {
    display: "grid",
    gap: 14,
  },
  flowEditorItem: {
    borderRadius: 14,
    padding: 14,
    border: "1px solid rgba(161, 180, 255, 0.18)",
    background: "rgba(11, 24, 39, 0.95)",
  },
  flowEditorHeader: {
    marginBottom: 12,
  },
  instructionsEditorWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  popover: {
    borderRadius: 16,
    background: "rgba(11, 24, 39, 0.96)",
    border: "1px solid rgba(161, 180, 255, 0.18)",
    overflow: "hidden",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(7, 12, 20, 0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 50,
  },
  modalCard: {
    width: "min(900px, 100%)",
    maxHeight: "85vh",
    overflowY: "auto",
    borderRadius: 22,
    background: "linear-gradient(180deg, rgba(21, 35, 58, 0.98) 0%, rgba(17, 28, 47, 0.98) 100%)",
    border: "1px solid rgba(153, 170, 255, 0.22)",
    boxShadow: "0 28px 60px rgba(5, 11, 22, 0.4)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 20,
    borderBottom: "1px solid rgba(161, 180, 255, 0.18)",
    background: "rgba(25, 43, 74, 0.7)",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  modalBody: {
    padding: 20,
    display: "grid",
    gap: 20,
  },
  modalSection: {
    display: "grid",
    gap: 12,
  },
  modalSectionTitle: {
    margin: 0,
    fontSize: 16,
    color: "#edf4ff",
  },
  popoverHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderBottom: "1px solid rgba(161, 180, 255, 0.18)",
    background: "rgba(25, 43, 74, 0.7)",
  },
  popoverTitle: {
    margin: 0,
    fontSize: 15,
    color: "#edf4ff",
  },
  popoverCloseButton: {
    border: "1px solid rgba(161, 180, 255, 0.22)",
    borderRadius: 8,
    background: "rgba(75, 95, 161, 0.22)",
    color: "#edf4ff",
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  popoverBody: {
    padding: 14,
    display: "grid",
    gap: 12,
  },
  infoBox: {
    borderRadius: 14,
    background: "rgba(11, 24, 39, 0.9)",
    border: "1px solid rgba(161, 180, 255, 0.18)",
    padding: 14,
  },
  infoText: {
    margin: 0,
    color: "#cfe0ff",
    lineHeight: 1.6,
    fontSize: 14,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
  },
  label: {
    color: "#c5d4f5",
  },
  helperTextBox: {
    display: "flex",
    alignItems: "center",
    minHeight: 46,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(23, 38, 64, 0.9)",
    border: "1px solid rgba(161, 180, 255, 0.22)",
    gridColumn: "1 / -1",
  },
  helperText: {
    color: "#dfeaff",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.5,
  },
  readOnlyValue: {
    width: "100%",
    border: "1px solid rgba(159, 177, 235, 0.3)",
    borderRadius: 12,
    padding: "11px 12px",
    fontSize: 14,
    background: "rgba(13, 24, 39, 0.5)",
    color: "#dfeaff",
    minHeight: 44,
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    border: "1px solid rgba(159, 177, 235, 0.4)",
    borderRadius: 12,
    padding: "11px 12px",
    fontSize: 14,
    background: "rgba(13, 24, 39, 0.85)",
    color: "#edf4ff",
    outline: "none",
    boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.02)",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  checkbox: {
    width: 18,
    height: 18,
    accentColor: "#4a5cff",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  checkboxLabel: {
    color: "#dfeaff",
    fontSize: 14,
    fontWeight: 600,
  },
  subagentList: {
    display: "grid",
    gap: 16,
  },
  subagentCard: {
    border: "1px solid rgba(161, 180, 255, 0.22)",
    borderRadius: 12,
    padding: 16,
    background: "linear-gradient(180deg, rgba(18, 31, 49, 0.96) 0%, rgba(21, 35, 58, 0.96) 100%)",
  },
  subagentHeader: {
    marginBottom: 12,
  },
  subagentBadge: {
    display: "inline-flex",
    borderRadius: 999,
    background: "rgba(101, 124, 204, 0.2)",
    color: "#dfeaff",
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 700,
    border: "1px solid rgba(161, 180, 255, 0.18)",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  primaryButton: {
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #4a5cff 0%, #6d7bff 100%)",
    color: "#ffffff",
    padding: "11px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(74, 92, 255, 0.22)",
  },
  secondaryButton: {
    marginTop: 16,
    border: "1px solid rgba(161, 180, 255, 0.25)",
    borderRadius: 10,
    background: "rgba(75, 95, 161, 0.22)",
    color: "#edf4ff",
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  code: {
    whiteSpace: "pre-wrap",
    background: "#0f172a",
    color: "#e2e8f0",
    borderRadius: 12,
    padding: 18,
    fontSize: 13,
    overflowX: "auto",
  },
  resultContainer: {
    marginTop: 20,
  },
  resultCode: {
    whiteSpace: "pre-wrap",
    background: "rgba(13, 24, 39, 0.9)",
    border: "1px solid rgba(161, 180, 255, 0.22)",
    borderRadius: 12,
    padding: 18,
    fontSize: 13,
    overflowX: "auto",
    color: "#edf4ff",
  },
};
