function toCommandSource(origin) {
  if (origin === 'lead_conversion') {
    return 'lead-conversion';
  }
  return 'manual';
}

export function mapCustomerCreateRequestToCommandPayload(request, customerId) {
  return {
    customer_id: customerId,
    source: toCommandSource(request.origin),
    full_name: request.customer.display_name,
    phone_e164: request.customer.primary_phone,
    email: request.customer.primary_email,
    metadata: {
      external_key: request.customer.external_key ?? null,
      origin: request.origin,
      status: request.customer.status ?? 'active',
      lead: request.lead ?? null
    }
  };
}

export function mapCustomerCreateRequestToStoreRecord(request, customerId) {
  return {
    customer_id: customerId,
    tenant_id: request.tenant_id,
    display_name: request.customer.display_name,
    primary_phone: request.customer.primary_phone,
    primary_email: request.customer.primary_email,
    origin: request.origin,
    status: request.customer.status ?? 'active',
    external_key: request.customer.external_key ?? null,
    metadata: {
      request_id: request.request_id,
      lead: request.lead ?? null,
      ...request.customer.metadata
    }
  };
}
