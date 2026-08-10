import { Status } from "./api";

export const STATUSES: Status[] = ["ACTIVE", "LEAD", "AT_RISK"];

export const STATUS_LABEL: Record<Status, string> = {
  ACTIVE: "Active",
  LEAD: "Lead",
  AT_RISK: "At risk",
};
