export interface ActivityLogEntry {
  message: string;
  type: "info" | "success" | "error" | "warning";
  timestamp: string;
}