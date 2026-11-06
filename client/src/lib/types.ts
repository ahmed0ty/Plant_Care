export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export type TaskType = "water" | "fertilize" | "prune";

export interface TaskDto {
  id: string;
  type: TaskType;
  status: "pending" | "completed";
  dueAt: string;
  completedAt: string | null;
  plant: { id: string; nickname: string; imageUrl: string | null } | null;
}

export interface DashboardDto {
  counts: { plants: number; overdue: number; today: number };
  overdue: TaskDto[];
  today: TaskDto[];
  recent: TaskDto[];
}

export interface PlantDto {
  id: string;
  nickname: string;
  species: string | null;
  imageUrl: string | null;
  addedAt: string;
  pendingTasks: number;
  nextDueAt: string | null;
    taskSummary: {
    pending: number;
    nextDueAt: string | null;
    nextType: TaskType | null;
  };
  care: {
    wateringEveryDays: number | null;
    fertilizingEveryDays: number | null;
    pruningEveryDays: number | null;
    light: string | null;
    notes: string | null;
  };
}

export interface PlantTaskSummary {
  pending: number;
  nextDueAt: string | null;
  nextType: TaskType | null;
}

export interface PlantListItem extends PlantDto {
  taskSummary: PlantTaskSummary;
}


export interface PlantsPage {
  plants: PlantListItem[];
  nextCursor: string | null;
}

export interface CareSuggestion {
  species: string;
  commonNames: string[];
  confidence: number;
  care: {
    wateringEveryDays: number;
    fertilizingEveryDays: number | null;
    pruningEveryDays: number | null;
    light: string;
    notes: string;
  };
}

export interface IdentifyResponse {
  imageUrl: string;
  identification: { suggestions: CareSuggestion[]; needsBetterPhoto: boolean } | null;
  provider: string | null;
}

export interface PlantDetailDto {
  plant: PlantDto;
  tasks: TaskDto[];
}

export interface GrowthLogDto {
  id: string;
  imageUrl: string;
  takenAt: string;
  healthNote: string | null;
  healthStatus: "healthy" | "needs_attention" | "unclear" | null;
}
export interface CareLogDto {
  summary: Record<TaskType, { lastAt: string | null; count: number }>;
  entries: { id: string; type: TaskType; completedAt: string }[];
}
export interface StatsDto {
  days: { date: string; count: number }[];
  total30: number;
  byType: Record<TaskType, number>;
  streak: number;
  bestStreak: number;
  activeToday: boolean;
  topPlants: { id: string; nickname: string; imageUrl: string | null; count: number }[];
}

export interface GalleryPhotoDto {
  id: string;
  imageUrl: string;
  takenAt: string;
  healthNote: string | null;
  healthStatus: "healthy" | "needs_attention" | "unclear" | null;
  plant: { id: string; nickname: string } | null;
}

export interface SettingsDto {
  name: string;
  email: string;
  timezone: string;
  avatarUrl: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
export interface CompleteResult {
  task: TaskDto;
  next: TaskDto | null;
}