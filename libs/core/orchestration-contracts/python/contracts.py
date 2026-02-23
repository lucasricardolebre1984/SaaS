from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, TypedDict

ModuleId = Literal[
    "mod-01-owner-concierge",
    "mod-02-whatsapp-crm",
    "mod-03-clientes",
    "mod-04-agenda",
    "mod-05-faturamento-cobranca",
]

CommandName = Literal[
    "owner.command.create",
    "module.task.create",
    "crm.whatsapp.send",
    "agenda.reminder.schedule",
    "agenda.reminder.dispatch.request",
    "billing.collection.request",
    "customer.record.upsert",
]

EventName = Literal[
    "owner.command.created",
    "module.task.created",
    "module.task.accepted",
    "module.task.completed",
    "module.task.failed",
    "crm.lead.created",
    "crm.lead.converted",
    "customer.created",
    "customer.updated",
    "agenda.reminder.scheduled",
    "agenda.reminder.sent",
    "agenda.reminder.failed",
    "agenda.reminder.canceled",
    "billing.charge.created",
    "billing.collection.requested",
    "billing.collection.sent",
    "billing.collection.failed",
]


class ActorRef(TypedDict):
    actor_id: str
    actor_type: Literal["owner", "agent", "system", "customer"]
    channel: Literal["ui-chat", "ui-avatar", "whatsapp", "api", "scheduler", "billing"]


@dataclass(slots=True)
class CommandEnvelope:
    schema_version: str
    kind: Literal["command"]
    command_id: str
    name: CommandName
    tenant_id: str
    source_module: ModuleId
    target_module: ModuleId
    created_at: str
    correlation_id: str
    trace_id: str
    actor: ActorRef
    payload: dict[str, Any]
    causation_id: str | None = None


@dataclass(slots=True)
class EventEnvelope:
    schema_version: str
    kind: Literal["event"]
    event_id: str
    name: EventName
    tenant_id: str
    source_module: ModuleId
    target_module: ModuleId
    emitted_at: str
    correlation_id: str
    trace_id: str
    payload: dict[str, Any]
    status: Literal["accepted", "completed", "failed", "info"] | None = None
    causation_id: str | None = None
