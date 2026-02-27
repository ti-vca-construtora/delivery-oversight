// Auth
export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
}

// Users
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  name?: string;
}

// Enterprises
export interface Enterprise {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEnterpriseDto {
  name: string;
}

export interface UpdateEnterpriseDto {
  name: string;
}

// Clients
export interface Client {
  id: number;
  name: string;
  unit: string;
  seller: string;
  identerprise: number;
  created_at: string;
  updated_at: string | null;
}

export interface CreateClientDto {
  name: string;
  unit: string;
  seller: string;
  identerprise: number;
}

export interface UpdateClientDto {
  name?: string;
  unit?: string;
  seller?: string;
  identerprise?: number;
}

export interface BulkCreateResult {
  total: number;
  inserted: number;
  skipped: number;
  skippedDetails: Array<{ name: string; unit: string; reason: string }>;
}

// Overview
export interface Overview {
  id?: number;
  idclient?: number;
  client?: Client;
  status: "PENDENTE" | "EM ANDAMENTO" | "LIBERADA";
  situation: "ATIVO" | "INATIVO";
  status_recente: "ACEITE" | "AGUARDANDO" | "CANCELADA" | "RECUSA";
  status_quality: string | null;
  status_construction: string | null;
  status_delivery: string | null;
  data_register: string | null;
  data_contact: string | null;
  obs: string | null;
  remanescente: boolean;
  inspections: InspectionWithRejections[];
}

export interface UpdateOverviewDto {
  status_quality?: string;
  status_construction?: string;
  status_delivery?: string;
  status?: "PENDENTE" | "EM ANDAMENTO" | "LIBERADA";
  situation?: "ATIVO" | "INATIVO";
  data_register?: string | null;
  data_contact?: string | null;
  obs?: string;
}

// Inspections
export interface Inspection {
  id: number;
  idclient: number;
  datetime: string;
  inspector: string | null;
  mobuss: boolean;
  status: string;
  idprerejection: number | null;
  created_at: string;
  updated_at: string | null;
  obs: string | null;
}

export interface InspectionWithRejections extends Omit<Inspection, 'idclient' | 'idprerejection'> {
  rejections: InspectionRejection[];
}

export interface InspectionRejection {
  id: number;
  status: string;
  prevision_date: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateInspectionDto {
  idclient: number;
  datetime: string;
  inspector?: string;
  mobuss?: boolean;
  idprerejection?: number;
  obs?: string;
}

export interface UpdateInspectionDto {
  status?: string;
  datetime?: string;
  inspector?: string;
  obs?: string;
  mobuss?: boolean;
}

// Rejections
export interface Rejection {
  id: number;
  idinspection: number;
  prevision_date: string | null;
  construction_status: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  obs: string | null;
  idclient: number | null;
  identerprise: number | null;
  nameenterprise: string | null;
}

export interface UpdateRejectionDto {
  prevision_date?: string;
  construction_status?: string;
  status?: string;
  obs?: string;
}

// Eligible
export interface EligibleClient {
  id: number;
  name: string;
  unit: string;
  seller: string;
  identerprise: number;
  nameenterprise: string;
  status: string;
  type: "new" | "again";
  idrejection: number | null;
  created_at: string;
  updated_at: string;
}

// Timeline
export interface TimelineEvent {
  type: "CLIENT_CREATED" | "UNIT_RELEASED" | "INSPECTION_SCHEDULED" | "INSPECTION_APPROVED" | "INSPECTION_REJECTED" | "REJECTION_RESOLVED";
  date: string;
  description: string;
  metadata?: Record<string, unknown> | null;
}

export interface Timeline {
  clientId: number;
  clientName: string;
  unit: string;
  events: TimelineEvent[];
}
