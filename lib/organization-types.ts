export type Organization = {
  id: string; slug: string; name: string; summary: string; mission: string;
  positions: string; approach: string; manifesto: string; created_at: string; updated_at: string;
};
export type OrgRole = "owner" | "admin" | "member";
export type OrgMember = { org_id: string; user_id: string; display_name: string; role: OrgRole; status: "pending" | "active" | "rejected"; created_at: string };
export type OrgMessage = { id: string; sender_id: string; body: string; created_at: string; name: string };
export type ChecklistItem = { id: string; label: string; position: number; completed: boolean };
export type Assignment = { id: string; assignee_id: string; title: string; description: string; kind: "task" | "challenge"; due_date: string | null; created_at: string; vardena_org_checklist: ChecklistItem[] };
export type ActionState = { error?: string; success?: string };
export const orgFields = "id,slug,name,summary,mission,positions,approach,manifesto,created_at,updated_at";
export const orgMemberFields = "org_id,user_id,display_name,role,status,created_at";
export const roleLabels: Record<OrgRole, string> = { owner: "Eigenaar", admin: "Beheerder", member: "Lid" };
export const isManager = (role?: string) => role === "owner" || role === "admin";
export const pageNumber = (value?: string) => Math.min(10000, Math.max(1, Math.floor(Number(value) || 1)));

