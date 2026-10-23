export type ProviderId = 'claude' | 'codex' | 'antigravity';
export type ToolType = 'cli' | 'desktop';

export interface ProviderSlotStatus {
  id: ProviderId;
  name: string;
  family: 'Anthropic' | 'OpenAI' | 'Google';
  planTier: string;
  activeModel: string;
  detectedModels: string[];
  cliInstalled: boolean;
  desktopRunning: boolean;
  usedPercent: number; // 0 to 100
  resetAt: string | null; // ISO timestamp
  burnRatePerMin: number; // % per minute
  tteMinutes: number | null; // Time To Exhaustion
  isPaused: boolean;
  pauseReason?: string;
  drainUrgencyScore: number; // Higher means reset is close and slot has unused quota!
  lastActivity: string | null;
  detectedPath?: string;
}

export interface TaskItem {
  id: string;
  order: number;
  title: string;
  description: string;
  complexity: 'CRITICAL_ARCH' | 'STANDARD_DEV' | 'FAST_BOILERPLATE';
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED_PRE_LIMIT' | 'COMPLETED' | 'FAILED';
  assignedProvider?: ProviderId;
  assignedModel?: string;
  verifyCommand?: string;
  logs: string[];
  startedAt?: string;
  completedAt?: string;
}

export interface ClarifyingQuestion {
  id: string;
  category: 'architecture' | 'dependencies' | 'edge_cases' | 'verification' | 'autonomy';
  question: string;
  recommendedOption: string;
  options: string[];
  userAnswer?: string;
}

export interface SpecLockData {
  projectName: string;
  targetFolder: string;
  goalPrompt: string;
  questions: ClarifyingQuestion[];
  isLocked: boolean;
  lockedAt?: string;
}

export interface CycleAiSettings {
  prePauseThreshold: number; // default 90%
  autoResumeEnabled: boolean;
  enableMultiToolHandoff: boolean;
  preferFastModelsForBoilerplate: boolean;
  manualOverrides: Record<ProviderId, {
    forcedPlan?: string;
    forcedModel?: string;
  }>;
}

export interface ExecutionLogEvent {
  id: string;
  timestamp: string;
  providerId: ProviderId;
  model: string;
  type: 'INFO' | 'SUCCESS' | 'WARN' | 'PAUSE' | 'RESUME' | 'HANDOFF' | 'ERROR';
  message: string;
}

export interface CycleAiState {
  providers: Record<ProviderId, ProviderSlotStatus>;
  activeProject: SpecLockData | null;
  tasks: TaskItem[];
  currentRunningTaskId: string | null;
  isRunning: boolean;
  isHibernating: boolean;
  nextAutoResumeAt: string | null;
  executionLogs: ExecutionLogEvent[];
  settings: CycleAiSettings;
}
