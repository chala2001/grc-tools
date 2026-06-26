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

import { IconButton, InputAdornment, TextField } from "@mui/material";
import { Search, X } from "@wso2/oxygen-ui-icons-react";
import type { JSX } from "react";

interface FilterPanelProps {
  search: string;
  onSearchChange: (search: string) => void;
  searchPlaceholder?: string;
}

export default function FilterPanel({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
}: FilterPanelProps): JSX.Element {
  return (
    <TextField
      size="small"
      fullWidth
      placeholder={searchPlaceholder}
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search size={16} />
            </InputAdornment>
          ),
          endAdornment: search ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
              >
                <X size={14} />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
    />
  );
}
