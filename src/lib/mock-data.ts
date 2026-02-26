import type { User, Enterprise, Client, Overview, Inspection, Rejection, EligibleClient } from "@/types/api";

export const mockUsers: User[] = [
  { id: "u1", email: "admin@empresa.com", name: "Carlos Administrador", created_at: "2025-12-01T10:00:00Z", updated_at: "2025-12-01T10:00:00Z" },
  { id: "u2", email: "maria@empresa.com", name: "Maria Silva", created_at: "2026-01-05T14:00:00Z", updated_at: "2026-01-05T14:00:00Z" },
  { id: "u3", email: "joao@empresa.com", name: "João Santos", created_at: "2026-01-10T09:00:00Z", updated_at: "2026-02-01T08:00:00Z" },
];

export const mockEnterprises: Enterprise[] = [
  { id: 1, name: "Residencial Parque das Flores", created_at: "2025-11-01T10:00:00Z", updated_at: "2025-11-01T10:00:00Z" },
  { id: 2, name: "Edifício Solar Premium", created_at: "2025-12-15T10:00:00Z", updated_at: "2025-12-15T10:00:00Z" },
  { id: 3, name: "Condomínio Vista Verde", created_at: "2026-01-10T10:00:00Z", updated_at: "2026-01-10T10:00:00Z" },
];

export const mockClients: Client[] = [
  { id: 1, name: "Ana Costa", unit: "Apto 101", seller: "Maria Santos", identerprise: 1, created_at: "2026-01-16T15:00:00Z", updated_at: null },
  { id: 2, name: "Pedro Oliveira", unit: "Apto 202", seller: "Maria Santos", identerprise: 1, created_at: "2026-01-17T10:00:00Z", updated_at: null },
  { id: 3, name: "Lucia Ferreira", unit: "Apto 303", seller: "João Silva", identerprise: 2, created_at: "2026-01-18T14:00:00Z", updated_at: null },
  { id: 4, name: "Roberto Almeida", unit: "Apto 404", seller: "João Silva", identerprise: 2, created_at: "2026-01-19T09:00:00Z", updated_at: null },
  { id: 5, name: "Fernanda Lima", unit: "Apto 505", seller: "Maria Santos", identerprise: 3, created_at: "2026-01-20T11:00:00Z", updated_at: null },
  { id: 6, name: "Carlos Mendes", unit: "Apto 102", seller: "João Silva", identerprise: 1, created_at: "2026-01-21T08:00:00Z", updated_at: null },
  { id: 7, name: "Juliana Rocha", unit: "Apto 203", seller: "Maria Santos", identerprise: 2, created_at: "2026-01-22T16:00:00Z", updated_at: null },
  { id: 8, name: "Marcos Souza", unit: "Apto 304", seller: "João Silva", identerprise: 3, created_at: "2026-01-23T13:00:00Z", updated_at: null },
];

export const mockOverviews: Overview[] = mockClients.map((c, i) => ({
  id: i + 1,
  idclient: c.id,
  client: c,
  status: (["LIBERADA", "PENDENTE", "EM ANDAMENTO", "LIBERADA", "PENDENTE", "EM ANDAMENTO", "LIBERADA", "LIBERADA"] as const)[i],
  situation: "ATIVO" as const,
  status_recente: (["AGUARDANDO", "AGUARDANDO", "ACEITE", "RECUSA", "AGUARDANDO", "AGUARDANDO", "ACEITE", "AGUARDANDO"] as const)[i],
  status_quality: (["OK", "PENDENTE", "OK", "OK", "PENDENTE", null, "OK", "PENDENTE"] as (string | null)[])[i],
  status_delivery: (["OK", null, "OK", "OK", null, "PENDENTE", "OK", null] as (string | null)[])[i],
  data_register: c.created_at,
  data_contact: null,
  obs: null,
  remanescente: i === 1 || i === 4 || i === 5,
  inspections: [],
}));

export const mockInspections: Inspection[] = [
  { id: 1, idclient: 1, datetime: "2026-02-25T10:00:00Z", inspector: "João Vistoriador", mobuss: false, status: "AGUARDANDO", idprerejection: null, created_at: "2026-02-20T10:00:00Z", updated_at: null, obs: null },
  { id: 2, idclient: 3, datetime: "2026-02-25T14:00:00Z", inspector: "Maria Vistoriadora", mobuss: true, status: "ACEITE", idprerejection: null, created_at: "2026-02-18T10:00:00Z", updated_at: "2026-02-25T15:00:00Z", obs: "Vistoria aprovada" },
  { id: 3, idclient: 4, datetime: "2026-02-26T09:00:00Z", inspector: "João Vistoriador", mobuss: false, status: "RECUSA", idprerejection: null, created_at: "2026-02-19T10:00:00Z", updated_at: "2026-02-26T10:00:00Z", obs: null },
  { id: 4, idclient: 7, datetime: "2026-02-27T10:00:00Z", inspector: "Maria Vistoriadora", mobuss: true, status: "ACEITE", idprerejection: null, created_at: "2026-02-21T10:00:00Z", updated_at: "2026-02-27T11:00:00Z", obs: null },
  { id: 5, idclient: 2, datetime: "2026-02-28T14:00:00Z", inspector: null, mobuss: false, status: "AGUARDANDO", idprerejection: null, created_at: "2026-02-22T10:00:00Z", updated_at: null, obs: null },
  { id: 6, idclient: 6, datetime: "2026-03-01T10:00:00Z", inspector: "João Vistoriador", mobuss: false, status: "AGUARDANDO", idprerejection: null, created_at: "2026-02-24T10:00:00Z", updated_at: null, obs: "Primeira vistoria" },
  { id: 7, idclient: 5, datetime: "2026-03-02T09:00:00Z", inspector: "Maria Vistoriadora", mobuss: true, status: "AGUARDANDO", idprerejection: null, created_at: "2026-02-25T10:00:00Z", updated_at: null, obs: null },
  { id: 8, idclient: 8, datetime: "2026-03-03T14:00:00Z", inspector: null, mobuss: false, status: "AGUARDANDO", idprerejection: null, created_at: "2026-02-25T10:00:00Z", updated_at: null, obs: null },
  { id: 9, idclient: 4, datetime: "2026-03-05T10:00:00Z", inspector: "João Vistoriador", mobuss: false, status: "AGUARDANDO", idprerejection: 1, created_at: "2026-02-28T10:00:00Z", updated_at: null, obs: "Reagendamento após recusa" },
];

export const mockRejections: Rejection[] = [
  { id: 1, idinspection: 3, prevision_date: "2026-03-10", construction_status: "EM ANDAMENTO", status: "CONCLUÍDO", created_at: "2026-02-26T10:00:00Z", updated_at: "2026-02-28T10:00:00Z", obs: "Problema na pintura da sala" },
  { id: 2, idinspection: 3, prevision_date: null, construction_status: "PENDENTE", status: "AGUARDANDO", created_at: "2026-02-26T10:00:00Z", updated_at: null, obs: "Piso com defeito no quarto" },
];

export const mockEligible: EligibleClient[] = [
  { id: 1, name: "Ana Costa", unit: "Apto 101", seller: "Maria Santos", identerprise: 1, nameenterprise: "Residencial Parque das Flores", status: "LIBERADA", type: "new", idrejection: null, created_at: "2026-01-16T15:00:00Z", updated_at: "2026-02-20T10:00:00Z" },
  { id: 5, name: "Fernanda Lima", unit: "Apto 505", seller: "Maria Santos", identerprise: 3, nameenterprise: "Condomínio Vista Verde", status: "LIBERADA", type: "new", idrejection: null, created_at: "2026-01-20T11:00:00Z", updated_at: "2026-02-22T10:00:00Z" },
  { id: 4, name: "Roberto Almeida", unit: "Apto 404", seller: "João Silva", identerprise: 2, nameenterprise: "Edifício Solar Premium", status: "LIBERADA", type: "again", idrejection: 1, created_at: "2026-01-19T09:00:00Z", updated_at: "2026-02-28T10:00:00Z" },
];
