import type {
  LoginDto, AuthResponse, User, CreateUserDto, UpdateUserDto,
  Enterprise, CreateEnterpriseDto, UpdateEnterpriseDto,
  Client, CreateClientDto, UpdateClientDto, BulkCreateResult,
  Overview, UpdateOverviewDto,
  Inspection, CreateInspectionDto, UpdateInspectionDto,
  Rejection, UpdateRejectionDto,
  EligibleClient, Timeline
} from "@/types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const SUPABASE_AUTH_URL = import.meta.env.VITE_SUPABASE_AUTH_URL as string;
const SUPABASE_APIKEY = import.meta.env.VITE_SUPABASE_APIKEY as string;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_email");
    window.location.href = "/";
    throw new Error("Sessão expirada");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API Error ${res.status}: ${body}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

export const api = {
  auth: {
    login: async (data: LoginDto): Promise<AuthResponse> => {
      const res = await fetch(SUPABASE_AUTH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_APIKEY,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error_description || error.msg || "Falha na autenticação");
      }
      return res.json();
    },
  },
  users: {
    list: () => request<User[]>("/users"),
    get: (id: string) => request<User[]>(`/users?id=${id}`),
    create: (data: CreateUserDto) => request<User>("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: UpdateUserDto) => request<User>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/users/${id}`, { method: "DELETE" }),
  },
  enterprises: {
    list: () => request<Enterprise[]>("/enterprises"),
    get: (id: number) => request<Enterprise[]>(`/enterprises?id=${id}`),
    create: (data: CreateEnterpriseDto) => request<Enterprise>("/enterprises", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: UpdateEnterpriseDto) => request<void>(`/enterprises/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/enterprises/${id}`, { method: "DELETE" }),
  },
  clients: {
    list: (params?: { id?: number; identerprise?: number }) => {
      const qs = new URLSearchParams();
      if (params?.id) qs.set("id", String(params.id));
      if (params?.identerprise) qs.set("identerprise", String(params.identerprise));
      return request<Client[]>(`/clients?${qs}`);
    },
    create: (data: CreateClientDto) => request<Client>("/clients", { method: "POST", body: JSON.stringify(data) }),
    bulkCreate: (clients: CreateClientDto[]) => request<BulkCreateResult>("/clients/import", { method: "POST", body: JSON.stringify({ clients }) }),
    update: (id: number, data: UpdateClientDto) => request<Client>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/clients/${id}`, { method: "DELETE" }),
  },
  overview: {
    list: (params?: { id?: number; idclient?: number; status?: string; situation?: string; remanescente?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.id) qs.set("id", String(params.id));
      if (params?.idclient) qs.set("idclient", String(params.idclient));
      if (params?.status) qs.set("status", params.status);
      if (params?.situation) qs.set("situation", params.situation);
      if (params?.remanescente !== undefined) qs.set("remanescente", String(params.remanescente));
      return request<Overview[]>(`/overview?${qs}`);
    },
    update: (id: number, data: UpdateOverviewDto) => request<void>(`/overview/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },
  inspections: {
    list: (params?: { id?: number; idclient?: number; inspector?: string; mobuss?: boolean; status?: string; from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.id) qs.set("id", String(params.id));
      if (params?.idclient) qs.set("idclient", String(params.idclient));
      if (params?.inspector) qs.set("inspector", params.inspector);
      if (params?.mobuss !== undefined) qs.set("mobuss", String(params.mobuss));
      if (params?.status) qs.set("status", params.status);
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      return request<Inspection[]>(`/inspections?${qs}`);
    },
    create: (data: CreateInspectionDto) => request<Inspection>("/inspections", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: UpdateInspectionDto) => request<Inspection>(`/inspections/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/inspections/${id}`, { method: "DELETE" }),
  },
  rejections: {
    list: (params?: { id?: number; idinspection?: number; idclient?: number; status?: string; construction_status?: string; from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.id) qs.set("id", String(params.id));
      if (params?.idinspection) qs.set("idinspection", String(params.idinspection));
      if (params?.idclient) qs.set("idclient", String(params.idclient));
      if (params?.status) qs.set("status", params.status);
      if (params?.construction_status) qs.set("construction_status", params.construction_status);
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      return request<Rejection[]>(`/rejections?${qs}`);
    },
    update: (id: number, data: UpdateRejectionDto) => request<Rejection>(`/rejections/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/rejections/${id}`, { method: "DELETE" }),
  },
  eligible: {
    list: (type?: "new" | "again") => {
      const qs = type ? `?type=${type}` : "";
      return request<EligibleClient[]>(`/eligible${qs}`);
    },
  },
  timeline: {
    get: (idclient: number) => request<Timeline>(`/timeline/${idclient}`),
  },
};
