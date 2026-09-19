export type Member = { id: string; username: string; display_name: string; bio: string };
export type ChatMessage = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null };
export type FormState = { error?: string; success?: boolean };
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const messageFields = "id,sender_id,recipient_id,body,created_at,read_at";
