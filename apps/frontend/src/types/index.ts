export interface ApiEnvelope<T> {
  code: string;
  message: string;
  response: T;
  errors: string[];
}

export enum ServiceStatus {
  OK = 'ok',
  DEGRADED = 'degraded'
}

export interface HealthReport {
  service: string;
  status: ServiceStatus;
  database: string;
}

export interface Board {
  importId: number;
  fileName: string;
  referenceDate: string;
}

export enum StageType {
  WATCHED = 'watched',
  PAUSED = 'paused',
  FINAL = 'final'
}

export interface Stage {
  name: string;
  type: StageType;
  thresholdDays: number | null;
  position: number;
  aliases: string[];
  actionCode: string;
  actionLabel: string;
  recipient: string;
}

export interface StageList {
  version: number;
  stages: Stage[];
}

export interface ImportSummary {
  id: number;
  fileName: string;
  fileSize: number;
  recordCount: number;
  createdAt: string;
}

export interface ImportList {
  data: ImportSummary[];
  offset: number;
  limit: number;
  total: number;
}

export interface PipelineView {
  import: ImportSummary;
  referenceDate: string;
}

export interface UploadResult extends PipelineView {
  alreadyImported: boolean;
}
