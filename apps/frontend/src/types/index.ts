export interface ApiEnvelope<T> {
  code: string;
  message: string;
  response: T;
  errors: string[];
}

export interface HealthReport {
  service: string;
  status: string;
  database: string;
}

export interface Board {
  importId: string;
  fileName: string;
  referenceDate: string;
}

export enum StageType {
  WATCHED = 'watched',
  PAUSED = 'paused',
  FINAL = 'final'
}

export interface StageInput {
  name: string;
  type: StageType;
  thresholdDays: number | null;
  aliases: string[];
  actionCode: string | null;
}

export interface Stage extends StageInput {
  position: number;
  actionLabel: string | null;
  recipient: Recipient | null;
}

export interface StageAction {
  code: string;
  label: string;
  recipient: Recipient;
}

export interface StageList {
  version: number;
  stages: Stage[];
  actions: StageAction[];
}

export interface ImportSummary {
  // The public UUID of the import
  id: string;
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

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PipelineCounts {
  total: number;
  valid: number;
  invalid: number;
  terminal: number;
  onHold: number;
  stalled: number;
  notStalled: number;
}

export enum BottleneckType {
  STAGE = 'stage',
  RECRUITER = 'recruiter'
}

export interface Bottleneck {
  type: BottleneckType;
  key: string;
  stalled: number;
}

export interface StageThreshold {
  name: string;
  thresholdDays: number;
  stalled: number;
}

export enum TimerSource {
  STAGE_ENTERED = 'stage_entered_at',
  LAST_ACTIVITY = 'last_activity_at'
}

export enum Recipient {
  HIRING_MANAGER = 'hiring_manager',
  CANDIDATE = 'candidate',
  INTERVIEW_PANEL = 'interview_panel',
  ASSESSMENT_REVIEWER = 'assessment_reviewer'
}

export interface QueueItem {
  rank: number;
  recordNumber: number;
  candidateId: string;
  name: string;
  firstName: string;
  role: string;
  stage: string;
  stageStep: number;
  stageSteps: number;
  actionCode: string;
  recruiter: string;
  timerFrom: string;
  timerSource: TimerSource;
  daysInStage: number;
  stageThreshold: number;
  overdueDays: number;
  actionLabel: string;
  recipient: Recipient;
  daysSinceContact: number | null;
  reason: string;
  templateMessage: string;
}

export interface PipelineView {
  import: ImportSummary;
  referenceDate: string;
  counts: PipelineCounts;
  bottlenecks: Bottleneck[];
  stageThresholds: StageThreshold[];
  filterOptions: { stages: string[]; recruiters: string[] };
  queue: Page<QueueItem>;
}

export interface QueueQuery {
  referenceDate: string;
  page: number;
  stage: string;
  recruiter: string;
  search: string;
}

export enum RowErrorCode {
  FIELD_COUNT = 'FIELD_COUNT',
  MISSING_VALUE = 'MISSING_VALUE',
  INVALID_DATE = 'INVALID_DATE',
  FUTURE_DATE = 'FUTURE_DATE',
  UNKNOWN_STAGE = 'UNKNOWN_STAGE',
  DUPLICATE_ID = 'DUPLICATE_ID'
}

export interface FieldError {
  field: string;
  code: RowErrorCode;
  problem: string;
}

export interface RowError {
  recordNumber: number;
  candidateId: string;
  errors: FieldError[];
}

export interface UploadResult extends PipelineView {
  alreadyImported: boolean;
}

export enum AiStatus {
  AI_DRAFT = 'ai_draft',
  DISABLED = 'disabled',
  NOT_CONFIGURED = 'not_configured',
  FAILED = 'failed',
  NOTHING_STALLED = 'nothing_stalled'
}

export enum AiErrorCode {
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  AUTH_FAILED = 'AUTH_FAILED',
  NO_CREDITS = 'NO_CREDITS',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  REFUSED = 'REFUSED',
  INVALID_JSON = 'INVALID_JSON',
  INVALID_OUTPUT = 'INVALID_OUTPUT'
}

export enum MessageSource {
  AI_DRAFT = 'ai_draft',
  TEMPLATE = 'template'
}

// One AI message per follow-up action, with blanks such as {{first_name}} that each row fills in
export interface ActionMessage {
  actionCode: string;
  text: string;
}

export interface BottleneckNote extends Bottleneck {
  text: string;
  source: MessageSource;
}

export interface InsightsView {
  referenceDate: string;
  aiStatus: AiStatus;
  errorCode: AiErrorCode | null;
  model: string | null;
  cached: boolean;
  topN: number;
  briefing: { text: string; source: MessageSource };
  bottleneckNotes: BottleneckNote[];
  actionMessages: ActionMessage[];
}

export interface CsvFile {
  fileName: string;
  bytes: ArrayBuffer;
  text: string;
}

// AI on/off for the team: 1 = active, 0 = inactive
export enum SettingStatus {
  INACTIVE = 0,
  ACTIVE = 1
}

export interface Settings {
  status: SettingStatus;
  aiConfigured: boolean;
  aiModel: string;
  stagesVersion: number;
}

export interface AiModel {
  modelId: string;
  name: string;
  contextLength: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
}
