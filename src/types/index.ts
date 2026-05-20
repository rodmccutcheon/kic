
export type SignalType =
    | "mindbody_client_id"
    | "phone"
    | "email"

export interface RawSignal {
    type: SignalType;
    value: string;
}

export interface EventDescriptor {
    externalId: string;
    source: string;
    type: string;
    payload: unknown;
    occurredAt: Date;
}

export interface MindbodyBookingPayload {
    id: string;
    mindbody_client_id: string;
    client_email?: string;
    phone?: string;
    class_name?: string;
    scheduled_at: string;
    studio?: string;
}

export interface ShopifyOrderPayload {
    id: string;
    shopify_customer_id: string | null;
    email: string | null;
    phone: string | null;
    device_id: string | null;
    created_at: string;
    total_price?: string;
    line_items?: { title: string; quantity: number }[];
}