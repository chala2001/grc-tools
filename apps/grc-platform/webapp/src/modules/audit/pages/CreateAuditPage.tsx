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
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ChevronLeft,
  ClipboardList,
  Copy,
  FileUp,
  Plus,
  Trash2,
} from "@wso2/oxygen-ui-icons-react";
import { useState, useRef, useEffect, type JSX, type ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { useGetAudits } from "@modules/audit/api/useGetAudits";
import { useGetControls } from "@modules/audit/api/useGetControls";
import { useGetFrameworks } from "@modules/audit/api/useGetFrameworks";
import { useGetProducts } from "@modules/audit/api/useGetProducts";
import { useCreateAudit } from "@modules/audit/api/useCreateAudit";
import { useBulkAddControls } from "@modules/audit/api/useBulkAddControls";
import type {
  AddControlRequest,
  AuditControl,
  AuditFramework,
  AuditProduct,
  ControlScope,
  ControlType,
  RequirementType,
} from "@modules/audit/types/audit";

// ── Types ─────────────────────────────────────────────────────────────────────

type ControlSource = "empty" | "copy" | "csv";

let _localIdCounter = 0;
const nextLocalId = () => String(++_localIdCounter);

interface DraftControl {
  localId: string;
  controlNumber: string;
  description: string;
  requirementType: RequirementType;
  controlType: ControlType;
  scope: ControlScope;
  evidenceRequirement: string;
  dueDate: string;
}

function blankDraft(): DraftControl {
  return {
    localId: nextLocalId(),
    controlNumber: "",
    description: "",
    requirementType: "DESIGN",
    controlType: "NON_CONFIG",
    scope: "COMMON",
    evidenceRequirement: "",
    dueDate: "",
  };
}

function controlToDraft(c: AuditControl): DraftControl {
  return {
    localId: nextLocalId(),
    controlNumber: c.controlNumber,
    description: c.description,
    requirementType: c.requirementType,
    controlType: c.controlType,
    scope: c.scope,
    evidenceRequirement: c.evidenceRequirement ?? "",
    dueDate: c.dueDate ?? "",
  };
}

function draftToRequest(d: DraftControl): AddControlRequest {
  return {
    controlNumber: d.controlNumber.trim(),
    description: d.description.trim(),
    requirementType: d.requirementType,
    controlType: d.controlType,
    scope: d.scope,
    evidenceRequirement: d.evidenceRequirement.trim() || null,
    dueDate: d.dueDate || null,
    isManuallyAdded: true,
  };
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

const CSV_REQUIRED_COLS = ["control_number", "description", "requirement_type", "control_type", "scope"];

function parseCSV(text: string): DraftControl[] | string {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return "CSV must have a header row and at least one data row.";
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const missing = CSV_REQUIRED_COLS.filter((c) => !headers.includes(c));
  if (missing.length > 0) return `Missing columns: ${missing.join(", ")}`;

  const idx = (name: string) => headers.indexOf(name);
  const validReq = (v: string): v is RequirementType => v === "DESIGN" || v === "OE";
  const validCtl = (v: string): v is ControlType => v === "CONFIG" || v === "NON_CONFIG";
  const validScope = (v: string): v is ControlScope => v === "COMMON" || v === "PRODUCT_SPECIFIC";

  const drafts: DraftControl[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Simple split — fields with commas must be quoted. Basic unquoting only.
    const cells = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g)?.map((c) =>
      c.startsWith('"') ? c.slice(1, -1) : c.trim(),
    ) ?? line.split(",").map((c) => c.trim());

    const reqType = (cells[idx("requirement_type")] ?? "").toUpperCase();
    const ctlType = (cells[idx("control_type")] ?? "").toUpperCase();
    const scope = (cells[idx("scope")] ?? "").toUpperCase();

    if (!validReq(reqType)) return `Row ${i + 1}: requirement_type must be DESIGN or OE, got "${reqType}"`;
    if (!validCtl(ctlType)) return `Row ${i + 1}: control_type must be CONFIG or NON_CONFIG, got "${ctlType}"`;
    if (!validScope(scope)) return `Row ${i + 1}: scope must be COMMON or PRODUCT_SPECIFIC, got "${scope}"`;

    const cn = cells[idx("control_number")] ?? "";
    const desc = cells[idx("description")] ?? "";
    if (!cn || !desc) continue;

    drafts.push({
      localId: nextLocalId(),
      controlNumber: cn,
      description: desc,
      requirementType: reqType,
      controlType: ctlType,
      scope: scope,
      evidenceRequirement: cells[idx("evidence_requirement")] ?? "",
      dueDate: cells[idx("due_date")] ?? "",
    });
  }
  if (drafts.length === 0) return "No valid rows found in CSV.";
  return drafts;
}

// ── Editable controls table ───────────────────────────────────────────────────

interface EditableControlsTableProps {
  drafts: DraftControl[];
  onChange: (drafts: DraftControl[]) => void;
}

function EditableControlsTable({ drafts, onChange }: EditableControlsTableProps): JSX.Element {
  function update<K extends keyof DraftControl>(localId: string, key: K, val: DraftControl[K]) {
    onChange(drafts.map((d) => (d.localId === localId ? { ...d, [key]: val } : d)));
  }

  function remove(localId: string) {
    onChange(drafts.filter((d) => d.localId !== localId));
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
    <TableContainer sx={{ maxHeight: 360 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, minWidth: 110 }}>Control #</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Description</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 110 }}>Req. Type</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 130 }}>Control Type</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>Scope</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 130 }}>Due Date</TableCell>
            <TableCell sx={{ width: 40 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {drafts.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No controls yet — click "Add Row" to begin.
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {drafts.map((d) => (
            <TableRow key={d.localId}>
              <TableCell>
                <TextField
                  value={d.controlNumber}
                  onChange={(e) => update(d.localId, "controlNumber", e.target.value)}
                  size="small"
                  variant="standard"
                  placeholder="CA-01"
                  inputProps={{ style: { fontSize: "0.8rem" } }}
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={d.description}
                  onChange={(e) => update(d.localId, "description", e.target.value)}
                  size="small"
                  variant="standard"
                  placeholder="Description"
                  fullWidth
                  inputProps={{ style: { fontSize: "0.8rem" } }}
                />
              </TableCell>
              <TableCell>
                <Select
                  value={d.requirementType}
                  onChange={(e) => update(d.localId, "requirementType", e.target.value as RequirementType)}
                  size="small"
                  variant="standard"
                  sx={{ fontSize: "0.8rem" }}
                >
                  <MenuItem value="DESIGN">Design</MenuItem>
                  <MenuItem value="OE">OE</MenuItem>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={d.controlType}
                  onChange={(e) => update(d.localId, "controlType", e.target.value as ControlType)}
                  size="small"
                  variant="standard"
                  sx={{ fontSize: "0.8rem" }}
                >
                  <MenuItem value="CONFIG">Config</MenuItem>
                  <MenuItem value="NON_CONFIG">Non-Config</MenuItem>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={d.scope}
                  onChange={(e) => update(d.localId, "scope", e.target.value as ControlScope)}
                  size="small"
                  variant="standard"
                  sx={{ fontSize: "0.8rem" }}
                >
                  <MenuItem value="COMMON">Common</MenuItem>
                  <MenuItem value="PRODUCT_SPECIFIC">Product Specific</MenuItem>
                </Select>
              </TableCell>
              <TableCell>
                <TextField
                  value={d.dueDate}
                  onChange={(e) => update(d.localId, "dueDate", e.target.value)}
                  type="date"
                  size="small"
                  variant="standard"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ style: { fontSize: "0.8rem" } }}
                />
              </TableCell>
              <TableCell>
                <Tooltip title="Remove row">
                  <IconButton size="small" color="error" onClick={() => remove(d.localId)}>
                    <Trash2 size={14} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </Paper>
  );
}

// ── Source option card ────────────────────────────────────────────────────────

interface SourceCardProps {
  icon: JSX.Element;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function SourceCard({ icon, title, description, selected, onClick }: SourceCardProps): JSX.Element {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: selected ? "primary.main" : "divider",
        borderWidth: selected ? 2 : 1,
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: selected ? "0 0 0 3px rgba(25,118,210,0.15)" : "none",
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 0 }}>
        <CardContent sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: selected ? "primary.50" : "grey.100",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: selected ? "primary.main" : "text.secondary",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ── Step 1: Audit details ─────────────────────────────────────────────────────

interface Step1Props {
  name: string;
  framework: AuditFramework | null;
  product: AuditProduct | null;
  periodStart: string;
  periodEnd: string;
  scopeDescription: string;
  frameworks: AuditFramework[];
  products: AuditProduct[];
  loadingFrameworks: boolean;
  loadingProducts: boolean;
  onNameChange: (v: string) => void;
  onFrameworkChange: (v: AuditFramework | null) => void;
  onProductChange: (v: AuditProduct | null) => void;
  onPeriodStartChange: (v: string) => void;
  onPeriodEndChange: (v: string) => void;
  onScopeDescriptionChange: (v: string) => void;
}

function Step1Form({
  name,
  framework,
  product,
  periodStart,
  periodEnd,
  scopeDescription,
  frameworks,
  products,
  loadingFrameworks,
  loadingProducts,
  onNameChange,
  onFrameworkChange,
  onProductChange,
  onPeriodStartChange,
  onPeriodEndChange,
  onScopeDescriptionChange,
}: Step1Props): JSX.Element {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <TextField
        label="Audit Name"
        required
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        fullWidth
        placeholder="e.g. SOC 2 Type II – 2026"
      />

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <Autocomplete
          options={frameworks}
          loading={loadingFrameworks}
          getOptionLabel={(f) => (f.version ? `${f.name} (${f.version})` : f.name)}
          value={framework}
          onChange={(_e, val) => onFrameworkChange(val)}
          renderInput={(params) => <TextField {...params} label="Framework" required />}
        />
        <Autocomplete
          options={products}
          loading={loadingProducts}
          getOptionLabel={(p) => p.name}
          value={product}
          onChange={(_e, val) => onProductChange(val)}
          renderInput={(params) => <TextField {...params} label="Product / System" required />}
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <TextField
          label="Period Start"
          required
          type="date"
          value={periodStart}
          onChange={(e) => onPeriodStartChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Period End"
          required
          type="date"
          value={periodEnd}
          onChange={(e) => onPeriodEndChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      <TextField
        label="Scope Description"
        value={scopeDescription}
        onChange={(e) => onScopeDescriptionChange(e.target.value)}
        multiline
        rows={3}
        fullWidth
        placeholder="Optional — describe what systems, processes, or criteria are in scope."
      />
    </Box>
  );
}

// ── Step 2: Controls ──────────────────────────────────────────────────────────

interface Step2Props {
  source: ControlSource;
  onSourceChange: (s: ControlSource) => void;
  drafts: DraftControl[];
  onDraftsChange: (d: DraftControl[]) => void;
  copyAuditId: number | null;
  onCopyAuditIdChange: (id: number | null) => void;
  csvError: string | null;
  onCsvErrorChange: (e: string | null) => void;
}

function Step2Controls({
  source,
  onSourceChange,
  drafts,
  onDraftsChange,
  copyAuditId,
  onCopyAuditIdChange,
  csvError,
  onCsvErrorChange,
}: Step2Props): JSX.Element {
  const { data: auditsData } = useGetAudits();
  const { data: sourceControlsData, isLoading: sourceControlsLoading } = useGetControls(
    copyAuditId ?? 0,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When source controls load for "copy" option, populate drafts
  useEffect(() => {
    if (source !== "copy" || !sourceControlsData) return;
    onDraftsChange(sourceControlsData.items.map(controlToDraft));
  }, [source, sourceControlsData, onDraftsChange]);

  const allAudits = auditsData?.items ?? [];

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const result = parseCSV(text);
      if (typeof result === "string") {
        onCsvErrorChange(result);
        onDraftsChange([]);
      } else {
        onCsvErrorChange(null);
        onDraftsChange(result);
      }
    };
    reader.readAsText(file);
    // reset so the same file can be re-selected after fixing
    e.target.value = "";
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Source cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        <SourceCard
          icon={<ClipboardList size={22} />}
          title="Start Empty"
          description="Add controls manually via the table."
          selected={source === "empty"}
          onClick={() => {
            onSourceChange("empty");
            onDraftsChange([]);
          }}
        />
        <SourceCard
          icon={<Copy size={22} />}
          title="Copy from Previous"
          description="Import controls from an existing audit and edit before submitting."
          selected={source === "copy"}
          onClick={() => {
            onSourceChange("copy");
            onCopyAuditIdChange(null);
            onDraftsChange([]);
          }}
        />
        <SourceCard
          icon={<FileUp size={22} />}
          title="Upload CSV"
          description="Upload a CSV with columns: control_number, description, requirement_type, control_type, scope."
          selected={source === "csv"}
          onClick={() => {
            onSourceChange("csv");
            onDraftsChange([]);
            onCsvErrorChange(null);
          }}
        />
      </Box>

      {/* Copy — audit selector */}
      {source === "copy" && (
        <Box>
          <FormControl fullWidth>
            <InputLabel>Select source audit</InputLabel>
            <Select
              label="Select source audit"
              value={copyAuditId !== null ? String(copyAuditId) : ""}
              onChange={(e) => {
                const v = e.target.value as string;
                onCopyAuditIdChange(v === "" ? null : Number(v));
              }}
            >
              {allAudits.map((a) => (
                <MenuItem key={a.id} value={String(a.id)}>
                  {a.name} ({a.framework.name})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {copyAuditId && sourceControlsLoading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Loading controls…
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* CSV — file input */}
      {source === "csv" && (
        <Box>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <Button
            variant="outlined"
            startIcon={<FileUp size={16} />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ textTransform: "none" }}
          >
            Choose CSV File
          </Button>
          {csvError && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {csvError}
            </Alert>
          )}
        </Box>
      )}

      {/* Editable table — shown for empty source always, or once drafts are populated */}
      {(source === "empty" || drafts.length > 0) && !sourceControlsLoading && (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                Controls ({drafts.length})
              </Typography>
              {source !== "csv" && (
                <Button
                  size="small"
                  startIcon={<Plus size={14} />}
                  onClick={() => onDraftsChange([...drafts, blankDraft()])}
                  sx={{ textTransform: "none" }}
                >
                  Add Row
                </Button>
              )}
            </Box>
            <EditableControlsTable drafts={drafts} onChange={onDraftsChange} />
          </Box>
        )}
    </Box>
  );
}

// ── Step 3: Review ────────────────────────────────────────────────────────────

interface Step3Props {
  name: string;
  framework: AuditFramework | null;
  product: AuditProduct | null;
  periodStart: string;
  periodEnd: string;
  scopeDescription: string;
  drafts: DraftControl[];
}

function Step3Review({
  name,
  framework,
  product,
  periodStart,
  periodEnd,
  scopeDescription,
  drafts,
}: Step3Props): JSX.Element {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
          Audit Details
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Name
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {name}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Framework
            </Typography>
            <Typography variant="body2">
              {framework ? (framework.version ? `${framework.name} (${framework.version})` : framework.name) : "—"}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Product / System
            </Typography>
            <Typography variant="body2">{product?.name ?? "—"}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Audit Period
            </Typography>
            <Typography variant="body2">
              {periodStart} → {periodEnd}
            </Typography>
          </Box>
          {scopeDescription && (
            <Box sx={{ gridColumn: "span 2" }}>
              <Typography variant="caption" color="text.secondary">
                Scope Description
              </Typography>
              <Typography variant="body2">{scopeDescription}</Typography>
            </Box>
          )}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
          Controls to add ({drafts.length})
        </Typography>
        {drafts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No controls — you can add them later via the Control Settings panel.
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 280 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Req. Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Scope</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drafts.map((d) => (
                  <TableRow key={d.localId}>
                    <TableCell>{d.controlNumber || "—"}</TableCell>
                    <TableCell>{d.description || "—"}</TableCell>
                    <TableCell>{d.requirementType}</TableCell>
                    <TableCell>{d.scope === "COMMON" ? "Common" : "Product Specific"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}

// ── CreateAuditPage ───────────────────────────────────────────────────────────

const STEPS = ["Audit Details", "Add Controls", "Review & Submit"];

export default function CreateAuditPage(): JSX.Element {
  const navigate = useNavigate();

  const { data: frameworksData, isLoading: loadingFrameworks } = useGetFrameworks();
  const { data: productsData, isLoading: loadingProducts } = useGetProducts();

  const createAudit = useCreateAudit();
  const bulkAdd = useBulkAddControls();

  // Step 1 state
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [framework, setFramework] = useState<AuditFramework | null>(null);
  const [product, setProduct] = useState<AuditProduct | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [scopeDescription, setScopeDescription] = useState("");

  // Step 2 state
  const [source, setSource] = useState<ControlSource>("empty");
  const [copyAuditId, setCopyAuditId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<DraftControl[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Submit state
  const [submitError, setSubmitError] = useState<string | null>(null);

  const frameworks = frameworksData ?? [];
  const products = productsData ?? [];

  const step1Valid =
    name.trim().length > 0 &&
    framework !== null &&
    product !== null &&
    periodStart.length > 0 &&
    periodEnd.length > 0;

  async function handleSubmit() {
    if (!framework || !product) return;
    setSubmitError(null);

    try {
      const audit = await createAudit.mutateAsync({
        name: name.trim(),
        frameworkId: framework.id,
        productId: product.id,
        periodStart,
        periodEnd,
        scopeDescription: scopeDescription.trim() || null,
      });

      const validDrafts = drafts.filter((d) => d.controlNumber.trim() && d.description.trim());
      if (validDrafts.length > 0) {
        await bulkAdd.mutateAsync({
          auditId: audit.id,
          controls: validDrafts.map(draftToRequest),
        });
      }

      void navigate(`/audit/audits/${audit.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create audit. Please try again.");
    }
  }

  const isSubmitting = createAudit.isPending || bulkAdd.isPending;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 860, mx: "auto" }}>
      {/* Back */}
      <Button
        startIcon={<ChevronLeft size={16} />}
        onClick={() => void navigate("/audit/audits")}
        sx={{ mb: 2, textTransform: "none", color: "text.secondary", pl: 0 }}
      >
        Audits
      </Button>

      <Typography variant="h5" fontWeight={700} mb={3}>
        Create New Audit
      </Typography>

      {/* Stepper */}
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step content */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        {step === 0 && (
          <Step1Form
            name={name}
            framework={framework}
            product={product}
            periodStart={periodStart}
            periodEnd={periodEnd}
            scopeDescription={scopeDescription}
            frameworks={frameworks}
            products={products}
            loadingFrameworks={loadingFrameworks}
            loadingProducts={loadingProducts}
            onNameChange={setName}
            onFrameworkChange={setFramework}
            onProductChange={setProduct}
            onPeriodStartChange={setPeriodStart}
            onPeriodEndChange={setPeriodEnd}
            onScopeDescriptionChange={setScopeDescription}
          />
        )}

        {step === 1 && (
          <Step2Controls
            source={source}
            onSourceChange={setSource}
            drafts={drafts}
            onDraftsChange={setDrafts}
            copyAuditId={copyAuditId}
            onCopyAuditIdChange={setCopyAuditId}
            csvError={csvError}
            onCsvErrorChange={setCsvError}
          />
        )}

        {step === 2 && (
          <Step3Review
            name={name}
            framework={framework}
            product={product}
            periodStart={periodStart}
            periodEnd={periodEnd}
            scopeDescription={scopeDescription}
            drafts={drafts}
          />
        )}
      </Paper>

      {/* Submit error */}
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      {/* Navigation */}
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button
          variant="outlined"
          onClick={() => (step === 0 ? void navigate("/audit/audits") : setStep(step - 1))}
          disabled={isSubmitting}
          sx={{ textTransform: "none" }}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>

        {step < 2 ? (
          <Button
            variant="contained"
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && !step1Valid}
            sx={{ textTransform: "none" }}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
            sx={{ textTransform: "none" }}
          >
            {isSubmitting ? "Creating…" : "Create Audit"}
          </Button>
        )}
      </Box>
    </Box>
  );
}
