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
