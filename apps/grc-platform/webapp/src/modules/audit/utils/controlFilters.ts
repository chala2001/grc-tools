// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import type { AuditControl } from "@modules/audit/types/audit";

export const EMPTY_CONTROL_FILTERS: Record<string, string[]> = {
  status: [],
  requirementType: [],
  controlType: [],
  scope: [],
  teamName: [],
  auditorName: [],
  ownerName: [],
};

/** Returns the number of filter fields that have at least one value selected. */
export function activeFilterCount(filters: Record<string, string[]>): number {
  return Object.values(filters).filter((arr) => arr.length > 0).length;
}

/**
 * Filters controls by all active fields (AND across fields, OR within each field)
 * and an optional free-text search against control number and description.
 */
export function applyControlFilters(
  controls: AuditControl[],
  filters: Record<string, string[]>,
  search = "",
): AuditControl[] {
  const q = search.trim().toLowerCase();
  return controls.filter((c) => {
    if (q) {
      const matchesNumber = c.controlNumber.toLowerCase().includes(q);
      const matchesDesc = c.description.toLowerCase().includes(q);
      if (!matchesNumber && !matchesDesc) return false;
    }
    if (filters.status?.length) {
      const includeOverdue = filters.status.includes("OVERDUE");
      const statusValues = filters.status.filter((s) => s !== "OVERDUE");
      const matchesStatus = statusValues.length > 0 && statusValues.includes(c.status);
      const matchesOverdue = includeOverdue && c.isOverdue;
      if (!matchesStatus && !matchesOverdue) return false;
    }
    if (filters.requirementType?.length && !filters.requirementType.includes(c.requirementType)) return false;
    if (filters.controlType?.length && !filters.controlType.includes(c.controlType)) return false;
    if (filters.scope?.length && !filters.scope.includes(c.scope)) return false;
    if (filters.teamName?.length && !filters.teamName.includes(c.teamName ?? "")) return false;
    if (filters.auditorName?.length && !filters.auditorName.includes(c.auditorName ?? "")) return false;
    if (filters.ownerName?.length && !filters.ownerName.includes(c.ownerName ?? "")) return false;
    return true;
  });
}
