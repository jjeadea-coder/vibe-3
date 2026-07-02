import { requestJson as apiRequestJson } from "./client";

export type Member = {
  id: number;
  name: string;
  department: string | null;
  role: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MemberCreateInput = {
  name: string;
  department?: string | null;
  role?: string | null;
};

export type MemberUpdateInput = Partial<MemberCreateInput>;

export type ScheduleMember = {
  id: number;
  name: string;
  department: string | null;
  role: string | null;
  is_active: boolean;
};

export type ScheduleItem = {
  id: number;
  member_id: number;
  title: string;
  type: string;
  start_at: string;
  end_at: string;
  location: string | null;
  memo: string | null;
  all_day: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  member: ScheduleMember | null;
};

export type ScheduleCreateInput = {
  member_id: number;
  title: string;
  type: string;
  start_at: string;
  end_at: string;
  location?: string | null;
  memo?: string | null;
  all_day?: boolean;
  status?: string;
};

export type ScheduleUpdateInput = Partial<ScheduleCreateInput>;

type ListResponse<T> = { items: T[] };

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequestJson<T>(path, init);
}

function buildScheduleQuery(params: {
  from?: string;
  to?: string;
  memberId?: number | "all";
  status?: string;
  type?: string;
}) {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.memberId && params.memberId !== "all") query.set("member_id", String(params.memberId));
  if (params.status) query.set("status", params.status);
  if (params.type) query.set("type", params.type);
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export async function listMembers(activeOnly = false): Promise<Member[]> {
  const response = await requestJson<ListResponse<Member>>(
    `/api/members${activeOnly ? "?active_only=true" : ""}`,
  );
  return response.items;
}

export async function createMember(input: MemberCreateInput): Promise<Member> {
  return requestJson<Member>("/api/members", { method: "POST", body: JSON.stringify(input) });
}

export async function updateMember(id: number, input: MemberUpdateInput): Promise<Member> {
  return requestJson<Member>(`/api/members/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteMember(id: number): Promise<Member> {
  return requestJson<Member>(`/api/members/${id}`, { method: "DELETE" });
}

export async function listSchedules(params: {
  from?: string;
  to?: string;
  memberId?: number | "all";
  status?: string;
  type?: string;
}): Promise<ScheduleItem[]> {
  const response = await requestJson<ListResponse<ScheduleItem>>(
    `/api/schedules${buildScheduleQuery(params)}`,
  );
  return response.items;
}

export async function createSchedule(input: ScheduleCreateInput): Promise<ScheduleItem> {
  return requestJson<ScheduleItem>("/api/schedules", { method: "POST", body: JSON.stringify(input) });
}

export async function updateSchedule(id: number, input: ScheduleUpdateInput): Promise<ScheduleItem> {
  return requestJson<ScheduleItem>(`/api/schedules/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteSchedule(id: number): Promise<ScheduleItem> {
  return requestJson<ScheduleItem>(`/api/schedules/${id}`, { method: "DELETE" });
}


