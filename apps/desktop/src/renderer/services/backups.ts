import { apiRequest } from "./http";

export interface BackupInfo {
  name: string;
  createdAt: string;
  trigger: "MANUAL" | "AUTO" | "UNKNOWN";
  databaseBytes: number;
  uploadFiles: number;
  uploadBytes: number;
  integrity: string;
  secondary: { configured: boolean; ok: boolean; error?: string };
}

export interface BackupStatus {
  backupDir: string;
  secondaryDir: string | null;
  secondaryConfigured: boolean;
  databasePath: string;
  keepCount: number;
  intervalHours: number;
  lastBackupAt: string | null;
  hoursSinceLast: number | null;
  isStale: boolean;
  backups: BackupInfo[];
}

export const backupsApi = {
  status(): Promise<BackupStatus> {
    return apiRequest<BackupStatus>("/backups");
  },
  async create(): Promise<BackupInfo> {
    const res = await apiRequest<{ backup: BackupInfo }>("/backups", { method: "POST" });
    return res.backup;
  },
};