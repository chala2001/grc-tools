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

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthApiClient } from "@hooks/useAuthApiClient";
import { BACKEND_BASE_URL } from "@config/apiConfig";
import { controlsQueryKey } from "@modules/audit/api/useGetControls";
import type { AddControlRequest, AuditControl } from "@modules/audit/types/audit";

interface AddControlPayload {
  auditId: number;
  req: AddControlRequest;
}

/** Adds a single control to an existing audit. */
export function useAddControl() {
  const authFetch = useAuthApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ auditId, req }: AddControlPayload): Promise<AuditControl> => {
      if (!BACKEND_BASE_URL) {
        // Mock: return a minimal control shape so callers don't crash
        return {
          id: Date.now(),
          auditId,
          ownerId: req.ownerId ?? null,
          ownerName: null,
          teamId: req.teamId ?? null,
          teamName: null,
          auditorId: req.auditorId ?? null,
          auditorName: null,
          controlNumber: req.controlNumber,
          description: req.description,
          evidenceRequirement: req.evidenceRequirement ?? null,
          requirementType: req.requirementType,
          controlType: req.controlType,
          scope: req.scope,
          dueDate: req.dueDate ?? null,
          status: req.requirementType === "OE" ? "POPULATION_PENDING" : "EVIDENCE_PENDING",
          sampleReference: null,
          sampleFileUrl: null,
          sampleFileName: null,
          comments: null,
          isManuallyAdded: req.isManuallyAdded,
          isOverdue: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      const res = await authFetch(
        `${BACKEND_BASE_URL}/api/v1/audits/${auditId}/controls`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        },
      );
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Failed to add control (${res.status})`);
      }
      return res.json() as Promise<AuditControl>;
    },

    onSuccess: (_data, { auditId }) => {
      void queryClient.invalidateQueries({ queryKey: controlsQueryKey(auditId) });
    },
  });
}
