export interface MindbodyBookingPayload {
    id: string;
    mindbody_client_id: string;
    client_email?: string;
    phone?: string;
    class_name?: string;
    scheduled_at: string;
    studio?: string;
}