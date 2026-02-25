export type ModuleId =
  | "mod-01-owner-concierge"
  | "mod-02-whatsapp-crm"
  | "mod-03-clientes"
  | "mod-04-agenda"
  | "mod-05-faturamento-cobranca";

export type CommandName =
  | "owner.command.create"
  | "module.task.create"
  | "crm.whatsapp.send"
  | "agenda.reminder.schedule"
  | "agenda.reminder.dispatch.request"
  | "billing.collection.request"
  | "billing.collection.dispatch.request"
  | "customer.record.upsert";

export type EventName =
  | "owner.command.created"
  | "owner.context.promoted"
  | "module.task.created"
  | "module.task.accepted"
  | "module.task.completed"
  | "module.task.failed"
  | "crm.lead.created"
  | "crm.lead.converted"
  | "customer.created"
  | "customer.updated"
  | "agenda.reminder.scheduled"
  | "agenda.reminder.sent"
  | "agenda.reminder.failed"
  | "agenda.reminder.canceled"
  | "billing.charge.created"
  | "billing.collection.requested"
  | "billing.payment.confirmed"
  | "billing.collection.sent"
  | "billing.collection.failed";

export type ActorType = "owner" | "agent" | "system" | "customer";
export type ChannelType = "ui-chat" | "ui-avatar" | "whatsapp" | "api" | "scheduler" | "billing";
export type EventStatus = "accepted" | "completed" | "failed" | "info";

export interface ActorRef {
  actor_id: string;
  actor_type: ActorType;
  channel: ChannelType;
}

export interface CommandEnvelope<TName extends CommandName, TPayload extends object> {
  schema_version: string;
  kind: "command";
  command_id: string;
  name: TName;
  tenant_id: string;
  source_module: ModuleId;
  target_module: ModuleId;
  created_at: string;
  correlation_id: string;
  causation_id?: string;
  trace_id: string;
  actor: ActorRef;
  payload: TPayload;
}

export interface EventEnvelope<TName extends EventName, TPayload extends object> {
  schema_version: string;
  kind: "event";
  event_id: string;
  name: TName;
  tenant_id: string;
  source_module: ModuleId;
  target_module: ModuleId;
  emitted_at: string;
  correlation_id: string;
  causation_id?: string;
  trace_id: string;
  status?: EventStatus;
  payload: TPayload;
}

export type OwnerCommandCreate = CommandEnvelope<
  "owner.command.create",
  {
    owner_command_id: string;
    text: string;
    mode: "one-shot" | "continuous";
    attachments?: Array<{ type: "audio" | "image" | "file"; uri: string }>;
    persona_overrides?: {
      owner_concierge_prompt?: string;
      whatsapp_agent_prompt?: string;
    };
  }
>;

export type ModuleTaskCreate = CommandEnvelope<
  "module.task.create",
  {
    task_id: string;
    task_type:
      | "crm.followup.send"
      | "crm.lead.capture"
      | "customer.upsert"
      | "agenda.commitment.schedule"
      | "billing.charge.create"
      | "billing.collection.request";
    priority: "low" | "normal" | "high";
    due_at?: string;
    input: Record<string, unknown>;
  }
>;

export type BillingCollectionRequested = EventEnvelope<
  "billing.collection.requested",
  { charge_id: string; channel: "whatsapp" }
>;

export type BillingCollectionSent = EventEnvelope<
  "billing.collection.sent",
  { charge_id: string; message_id: string; sent_at: string }
>;

export type BillingCollectionFailed = EventEnvelope<
  "billing.collection.failed",
  { charge_id: string; error_code: string; retryable: boolean }
>;
