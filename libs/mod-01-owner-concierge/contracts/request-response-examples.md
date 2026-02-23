# Module 01 API Examples

Endpoint: `POST /v1/owner-concierge/interaction`

## 1) Text message (one-shot)

Request:
```json
{
  "request": {
    "request_id": "91c34db1-8f2f-4f40-a227-626768e4a349",
    "tenant_id": "tenant_automania",
    "session_id": "9dbad420-7659-4c44-8cd3-e58bcbb875fb",
    "operation": "send_message",
    "channel": "ui-chat",
    "payload": {
      "text": "Resuma meus compromissos de hoje."
    }
  }
}
```

Response:
```json
{
  "response": {
    "request_id": "91c34db1-8f2f-4f40-a227-626768e4a349",
    "status": "accepted",
    "owner_command": {
      "command_id": "fe308e49-04eb-466b-8d5d-95e040ef0f84",
      "correlation_id": "6f9fc14f-d5f5-4204-ad37-081de111f1a2",
      "name": "owner.command.create"
    },
    "session_state": {
      "mode": "one-shot",
      "state": "awaiting_user"
    },
    "avatar_state": {
      "enabled": false,
      "state": "disabled"
    },
    "assistant_output": {
      "text": "Hoje voce tem 3 compromissos confirmados."
    }
  }
}
```

## 2) Audio message with attachment

Request:
```json
{
  "request": {
    "request_id": "8f6ea7d5-bf16-447a-8568-c3ad8b1ceb95",
    "tenant_id": "tenant_automania",
    "session_id": "9dbad420-7659-4c44-8cd3-e58bcbb875fb",
    "operation": "send_message",
    "channel": "ui-chat",
    "payload": {
      "text": "Transcreva e me diga os pontos de acao.",
      "attachments": [
        {
          "type": "audio",
          "uri": "s3://tenant_automania/uploads/audio/note-001.wav",
          "mime_type": "audio/wav",
          "filename": "note-001.wav"
        }
      ]
    }
  }
}
```

Response:
```json
{
  "response": {
    "request_id": "8f6ea7d5-bf16-447a-8568-c3ad8b1ceb95",
    "status": "accepted",
    "session_state": {
      "mode": "one-shot",
      "state": "awaiting_user"
    },
    "avatar_state": {
      "enabled": false,
      "state": "disabled"
    },
    "assistant_output": {
      "text": "Resumo da transcricao concluido.",
      "attachments": [
        {
          "type": "file",
          "attachment_ref": "att_summary_001",
          "mime_type": "text/plain"
        }
      ]
    }
  }
}
```

## 3) Image and file in same message

Request:
```json
{
  "request": {
    "request_id": "ef3302f7-a026-4c6e-a9ca-dd09ec344b09",
    "tenant_id": "tenant_automania",
    "session_id": "9dbad420-7659-4c44-8cd3-e58bcbb875fb",
    "operation": "send_message",
    "channel": "ui-chat",
    "payload": {
      "text": "Analise esta imagem e compare com o documento.",
      "attachments": [
        {
          "type": "image",
          "uri": "s3://tenant_automania/uploads/images/doc-photo.png",
          "mime_type": "image/png"
        },
        {
          "type": "file",
          "uri": "s3://tenant_automania/uploads/files/contrato.pdf",
          "mime_type": "application/pdf",
          "filename": "contrato.pdf"
        }
      ]
    }
  }
}
```

Response:
```json
{
  "response": {
    "request_id": "ef3302f7-a026-4c6e-a9ca-dd09ec344b09",
    "status": "accepted",
    "session_state": {
      "mode": "one-shot",
      "state": "awaiting_user"
    },
    "avatar_state": {
      "enabled": false,
      "state": "disabled"
    },
    "assistant_output": {
      "text": "Comparacao pronta com 2 divergencias principais."
    },
    "downstream_tasks": [
      {
        "task_id": "3d8ca85f-6127-4032-9858-6bbac1ab2e7f",
        "target_module": "mod-03-clientes",
        "task_type": "customer.upsert"
      }
    ]
  }
}
```

## 4) Toggle continuous mode and enable avatar

Request (toggle mode):
```json
{
  "request": {
    "request_id": "8367f12d-ce94-4736-a50a-73f1b7131eb3",
    "tenant_id": "tenant_automania",
    "session_id": "9dbad420-7659-4c44-8cd3-e58bcbb875fb",
    "operation": "toggle_continuous_mode",
    "channel": "ui-avatar",
    "payload": {
      "enabled": true,
      "reason": "owner_prefers_hands_free"
    }
  }
}
```

Response:
```json
{
  "response": {
    "request_id": "8367f12d-ce94-4736-a50a-73f1b7131eb3",
    "status": "accepted",
    "session_state": {
      "mode": "continuous",
      "state": "active_continuous"
    },
    "avatar_state": {
      "enabled": true,
      "state": "ready",
      "voice_profile": "owner-default"
    }
  }
}
```

Request (avatar config upsert):
```json
{
  "request": {
    "request_id": "b31fb258-aa76-4fae-aa9a-27044af2a4f2",
    "tenant_id": "tenant_automania",
    "session_id": "9dbad420-7659-4c44-8cd3-e58bcbb875fb",
    "operation": "avatar_config_upsert",
    "channel": "ui-avatar",
    "payload": {
      "enabled": true,
      "avatar_asset_path": "tenants/tenant_automania/avatars/owner/",
      "persona_profile_path": "tenants/tenant_automania/personas/owner.yaml",
      "voice_profile": "owner-default"
    }
  }
}
```

Response:
```json
{
  "response": {
    "request_id": "b31fb258-aa76-4fae-aa9a-27044af2a4f2",
    "status": "accepted",
    "session_state": {
      "mode": "continuous",
      "state": "active_continuous"
    },
    "avatar_state": {
      "enabled": true,
      "state": "ready",
      "voice_profile": "owner-default"
    }
  }
}
```
