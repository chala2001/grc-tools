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

import {
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Popover,
  Skeleton,
  TablePagination,
  TextField,
  Tooltip,
} from "@mui/material";
import { Box, ListingTable, Typography } from "@wso2/oxygen-ui";
import type { ListingTableSortDirection } from "@wso2/oxygen-ui";
import { AlertCircle, Filter, Search, X } from "@wso2/oxygen-ui-icons-react";
import { useState, type JSX } from "react";
import ControlStatusChip from "@modules/audit/components/ControlStatusChip";
import UserAvatar from "@modules/audit/components/UserAvatar";
import { formatAuditDate } from "@modules/audit/utils/format";
import { CONTROL_STATUS_LABELS } from "@modules/audit/utils/controlStatus";
import type { AuditControl, ControlStatus } from "@modules/audit/types/audit";

// ── Column filter dropdown ──────────────────────────────────────────────────

interface ColumnFilterProps {
  label: string;
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
}

function ColumnFilter({ label, options, selected, onChange, searchable = false }: ColumnFilterProps): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");

  const isActive = selected.length > 0;
  const open = Boolean(anchorEl);

  const visible = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  function handleClose() {
    setAnchorEl(null);
    setQuery("");
  }

  return (
    <>
      <IconButton
        size="small"
        aria-label={`Filter by ${label}`}
        onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
        sx={{
          ml: 0.25,
          p: 0.25,
          borderRadius: 0.75,
          color: isActive ? "primary.main" : "action.disabled",
          bgcolor: isActive ? "rgba(25,118,210,0.08)" : "transparent",
          "&:hover": {
            color: isActive ? "primary.main" : "text.secondary",
            bgcolor: isActive ? "rgba(25,118,210,0.12)" : "action.hover",
          },
        }}
      >
        <Filter size={12} />
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { width: 230, borderRadius: 2, mt: 0.5 } } }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ p: 1.25 }}>
          {searchable && (
            <TextField
              size="small"
              fullWidth
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              sx={{ mb: 0.75 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={14} />
                    </InputAdornment>
                  ),
                  endAdornment: query ? (
                    <InputAdornment position="end">
                      <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => setQuery("")}>
                        <X size={12} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
          )}

          {isActive && (
            <Button
              size="small"
              onClick={() => onChange([])}
              sx={{ textTransform: "none", fontSize: "0.72rem", py: 0.25, mb: 0.5, display: "block" }}
            >
              Clear ({selected.length} selected)
            </Button>
          )}

          <Box sx={{ maxHeight: 260, overflowY: "auto" }}>
            {visible.length === 0 ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 1, py: 1, display: "block" }}
              >
                No matches
              </Typography>
            ) : (
              visible.map((opt) => (
                <FormControlLabel
                  key={opt.value}
                  control={
                    <Checkbox
                      size="small"
                      checked={selected.includes(opt.value)}
                      onChange={() => toggle(opt.value)}
                      disableRipple
                      sx={{ p: 0.5 }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontSize: "0.82rem", lineHeight: 1.4 }}>
                      {opt.label}
                    </Typography>
                  }
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 0.5,
                    py: 0.1,
                    borderRadius: 1,
                    mx: 0,
                    width: "100%",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                />
              ))
            )}
          </Box>
        </Box>
      </Popover>
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const REQ_TYPE_LABELS: Record<string, string> = {
  DESIGN: "Design",
  OE: "OE",
};

const CTRL_TYPE_LABELS: Record<string, string> = {
  CONFIG: "Config",
  NON_CONFIG: "Non-Config",
};

const SCOPE_LABELS: Record<string, string> = {
  COMMON: "Common",
  PRODUCT_SPECIFIC: "Product Specific",
};

const REQ_TYPE_OPTIONS = [
  { label: "Design", value: "DESIGN" },
  { label: "OE", value: "OE" },
];

const CTRL_TYPE_OPTIONS = [
  { label: "Config", value: "CONFIG" },
  { label: "Non-Config", value: "NON_CONFIG" },
];

const SCOPE_OPTIONS = [
  { label: "Common", value: "COMMON" },
  { label: "Product Specific", value: "PRODUCT_SPECIFIC" },
];

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "Overdue", value: "OVERDUE" },
  ...(Object.keys(CONTROL_STATUS_LABELS) as ControlStatus[]).map((s) => ({
    label: CONTROL_STATUS_LABELS[s],
    value: s,
  })),
];

const HEADERS = [
  "Control No.",
  "Description",
  "Req. Type",
  "Control Type",
  "Status",
  "Auditor POC",
  "Process Owner",
  "Team",
  "Scope",
  "Due Date",
];

function applySorting(
  controls: AuditControl[],
  field: string,
  direction: ListingTableSortDirection,
): AuditControl[] {
  return [...controls].sort((a, b) => {
    const aVal = String((a as Record<string, unknown>)[field] ?? "");
    const bVal = String((b as Record<string, unknown>)[field] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return direction === "asc" ? cmp : -cmp;
  });
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ControlsTableProps {
  controls: AuditControl[];
  allControls: AuditControl[];
  filters: Record<string, string[]>;
  onFiltersChange: (f: Record<string, string[]>) => void;
  isLoading: boolean;
  onRowClick: (control: AuditControl) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ControlsTable({
  controls,
  allControls,
  filters,
  onFiltersChange,
  isLoading,
  onRowClick,
}: ControlsTableProps): JSX.Element {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<ListingTableSortDirection>("asc");

  // Derive unique options for dynamic columns from the full (unfiltered) list
  const auditorOptions = [
    ...new Set(allControls.map((c) => c.auditorName).filter((n): n is string => n !== null)),
  ].sort().map((n) => ({ label: n, value: n }));

  const ownerOptions = [
    ...new Set(allControls.map((c) => c.ownerName).filter((n): n is string => n !== null)),
  ].sort().map((n) => ({ label: n, value: n }));

  const teamOptions = [
    ...new Set(allControls.map((c) => c.teamName).filter((n): n is string => n !== null)),
  ].sort().map((n) => ({ label: n, value: n }));

  const sorted = sortField ? applySorting(controls, sortField, sortDirection) : controls;
  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const safePage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
  if (safePage !== page) setPage(safePage);
  const displayed = sorted.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage);

  function handleSortChange(field: string, direction: ListingTableSortDirection) {
    setSortField(field);
    setSortDirection(direction);
  }

  function setFilter(key: string, values: string[]) {
    onFiltersChange({ ...filters, [key]: values });
  }

  // ── Loading skeleton ──

  if (isLoading) {
    return (
      <ListingTable.Container>
        <ListingTable size="small">
          <ListingTable.Head>
            <ListingTable.Row>
              {HEADERS.map((h) => (
                <ListingTable.Cell key={h} sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                  {h}
                </ListingTable.Cell>
              ))}
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {Array.from({ length: 5 }).map((_, i) => (
              <ListingTable.Row key={i}>
                {HEADERS.map((h) => (
                  <ListingTable.Cell key={h}>
                    <Skeleton variant="text" width={h === "Description" ? 200 : 80} />
                  </ListingTable.Cell>
                ))}
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
    );
  }

  // ── Table ──

  return (
    <ListingTable.Provider
      sortField={sortField ?? ""}
      sortDirection={sortDirection}
      onSortChange={handleSortChange}
    >
      <ListingTable.Container>
        <ListingTable size="small" stickyHeader>
          <ListingTable.Head>
            <ListingTable.Row>

              <ListingTable.Cell sx={{ fontWeight: 600, whiteSpace: "nowrap", minWidth: 90 }}>
                <ListingTable.SortLabel field="controlNumber">Control No.</ListingTable.SortLabel>
              </ListingTable.Cell>

              <ListingTable.Cell sx={{ fontWeight: 600, minWidth: 240 }}>
                <ListingTable.SortLabel field="description">Description</ListingTable.SortLabel>
              </ListingTable.Cell>

              <ListingTable.Cell sx={{ fontWeight: 600, whiteSpace: "nowrap", minWidth: 110 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <ListingTable.SortLabel field="requirementType">Req. Type</ListingTable.SortLabel>
                  <ColumnFilter
                    label="Req. Type"
                    options={REQ_TYPE_OPTIONS}
                    selected={filters.requirementType ?? []}
                    onChange={(v) => setFilter("requirementType", v)}
                  />
                </Box>
              </ListingTable.Cell>

              <ListingTable.Cell sx={{ fontWeight: 600, whiteSpace: "nowrap", minWidth: 130 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <ListingTable.SortLabel field="controlType">Control Type</ListingTable.SortLabel>
                  <ColumnFilter
                    label="Control Type"
                    options={CTRL_TYPE_OPTIONS}
                    selected={filters.controlType ?? []}
                    onChange={(v) => setFilter("controlType", v)}
                  />
                </Box>
              </ListingTable.Cell>

              <ListingTable.Cell sx={{ fontWeight: 600, whiteSpace: "nowrap", minWidth: 185 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <ListingTable.SortLabel field="status">Status</ListingTable.SortLabel>
                  <ColumnFilter
                    label="Status"
                    options={STATUS_FILTER_OPTIONS}
                    selected={filters.status ?? []}
                    onChange={(v) => setFilter("status", v)}
                    searchable
                  />
                </Box>
              </ListingTable.Cell>

              <ListingTable.Cell sx={{ fontWeight: 600, whiteSpace: "nowrap", minWidth: 140 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <ListingTable.SortLabel field="auditorName">Auditor POC</ListingTable.SortLabel>
                  <ColumnFilter
                    label="Auditor POC"
                    options={auditorOptions}
                    selected={filters.auditorName ?? []}
                    onChange={(v) => setFilter("auditorName", v)}
                    searchable
                  />
                </Box>
              </ListingTable.Cell>

              <ListingTable.Cell sx={{ fontWeight: 600, whiteSpace: "nowrap", minWidth: 150 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <ListingTable.SortLabel field="ownerName">Process Owner</ListingTable.SortLabel>
                  <ColumnFilter
                    label="Process Owner"
                    options={ownerOptions}
                    selected={filters.ownerName ?? []}
                    onChange={(v) => setFilter("ownerName", v)}
                    searchable
                  />
                </Box>
              </ListingTable.Cell>

              <ListingTable.Cell sx={{ fontWeight: 600, whiteSpace: "nowrap", minWidth: 130 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <ListingTable.SortLabel field="teamName">Team</ListingTable.SortLabel>
                  <ColumnFilter
                    label="Team"
                    options={teamOptions}
                    selected={filters.teamName ?? []}
                    onChange={(v) => setFilter("teamName", v)}
                    searchable
                  />
                </Box>
              </ListingTable.Cell>

              <ListingTable.Cell sx={{ fontWeight: 600, whiteSpace: "nowrap", minWidth: 130 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <ListingTable.SortLabel field="scope">Scope</ListingTable.SortLabel>
                  <ColumnFilter
                    label="Scope"
                    options={SCOPE_OPTIONS}
                    selected={filters.scope ?? []}
                    onChange={(v) => setFilter("scope", v)}
                  />
                </Box>
              </ListingTable.Cell>

              <ListingTable.Cell sx={{ fontWeight: 600, whiteSpace: "nowrap", minWidth: 110 }}>
                <ListingTable.SortLabel field="dueDate">Due Date</ListingTable.SortLabel>
              </ListingTable.Cell>

            </ListingTable.Row>
          </ListingTable.Head>

          <ListingTable.Body>
            {displayed.length === 0 ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={10}>
                  <ListingTable.EmptyState
                    title="No controls match the selected filter."
                    minHeight={180}
                  />
                </ListingTable.Cell>
              </ListingTable.Row>
            ) : (
              displayed.map((control) => (
                <ListingTable.Row
                  key={control.id}
                  onClick={() => onRowClick(control)}
                  sx={{ cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                >
                  <ListingTable.Cell>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {control.controlNumber}
                    </Typography>
                  </ListingTable.Cell>

                  <ListingTable.Cell>
                    <Typography
                      variant="body2"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        maxWidth: 340,
                      }}
                    >
                      {control.description}
                    </Typography>
                  </ListingTable.Cell>

                  <ListingTable.Cell>
                    <Typography variant="body2" noWrap>
                      {REQ_TYPE_LABELS[control.requirementType]}
                    </Typography>
                  </ListingTable.Cell>

                  <ListingTable.Cell>
                    <Typography variant="body2" noWrap>
                      {CTRL_TYPE_LABELS[control.controlType]}
                    </Typography>
                  </ListingTable.Cell>

                  <ListingTable.Cell>
                    <ControlStatusChip status={control.status} />
                  </ListingTable.Cell>

                  <ListingTable.Cell>
                    {control.auditorName ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <UserAvatar name={control.auditorName} size={26} />
                        <Typography variant="body2" noWrap>{control.auditorName}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </ListingTable.Cell>

                  <ListingTable.Cell>
                    {control.ownerName ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <UserAvatar name={control.ownerName} size={26} />
                        <Typography variant="body2" noWrap>{control.ownerName}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </ListingTable.Cell>

                  <ListingTable.Cell>
                    <Typography variant="body2" noWrap>
                      {control.teamName ?? "—"}
                    </Typography>
                  </ListingTable.Cell>

                  <ListingTable.Cell>
                    <Typography variant="body2" noWrap>
                      {SCOPE_LABELS[control.scope]}
                    </Typography>
                  </ListingTable.Cell>

                  <ListingTable.Cell>
                    {control.dueDate ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          color={control.isOverdue ? "error.main" : "text.primary"}
                          fontWeight={control.isOverdue ? 600 : 400}
                        >
                          {formatAuditDate(control.dueDate)}
                        </Typography>
                        {control.isOverdue && (
                          <Tooltip title="Overdue">
                            <AlertCircle size={14} color="var(--mui-palette-error-main, #d32f2f)" />
                          </Tooltip>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </ListingTable.Cell>
                </ListingTable.Row>
              ))
            )}
          </ListingTable.Body>

          <ListingTable.Footer>
            <ListingTable.Row>
              <TablePagination
                count={sorted.length}
                page={safePage}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[25, 50, 100]}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </ListingTable.Row>
          </ListingTable.Footer>
        </ListingTable>
      </ListingTable.Container>
    </ListingTable.Provider>
  );
}
