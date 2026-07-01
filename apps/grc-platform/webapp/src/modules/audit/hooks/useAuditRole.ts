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

import { useState, useEffect } from "react";
import { useAsgardeo } from "@asgardeo/react";

export type AuditRole =
  | "compliance_admin"
  | "compliance_team"
  | "internal_team"
  | "external_auditor"
  | "management"
  | "unknown";

// Priority order: highest-privilege role wins when a user has multiple groups.
const ROLE_PRIORITY: AuditRole[] = [
  "compliance_admin",
  "compliance_team",
  "external_auditor",
  "internal_team",
  "management",
];

const isMockAuth = window.config?.GRC_PLATFORM_MOCK_AUTH === true;

export function useAuditRole(): AuditRole {
  const { getDecodedIdToken, isSignedIn } = useAsgardeo();
  const [role, setRole] = useState<AuditRole>(isMockAuth ? "compliance_admin" : "unknown");

  useEffect(() => {
    if (isMockAuth || !isSignedIn) return;
    getDecodedIdToken()
      .then((token) => {
        const groups: string[] = (token as Record<string, unknown>)?.groups as string[] ?? [];
        const found = ROLE_PRIORITY.find((r) => groups.includes(r));
        setRole(found ?? "unknown");
      })
      .catch(() => setRole("unknown"));
  }, [isSignedIn, getDecodedIdToken]);

  return role;
}
