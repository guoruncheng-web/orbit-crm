import { Status } from "./api";

export const STATUSES: Status[] = ["ACTIVE", "LEAD", "AT_RISK"];

export const STATUS_LABEL: Record<Status, string> = {
  ACTIVE: "合作中",
  LEAD: "潜在客户",
  AT_RISK: "需关注",
};
