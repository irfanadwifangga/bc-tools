import type { SchemaSnapshot, SnapshotEndpoint, SnapshotField, SnapshotSource } from "./api";

export type ChangeSeverity = "breaking" | "non_breaking";
export type EndpointChangeKind = "removed" | "added" | "changed";
export type FieldChangeKind = "removed" | "type_changed" | "added";

export interface FieldChange {
  name: string;
  kind: FieldChangeKind;
  severity: ChangeSeverity;
  oldType?: string;
  newType?: string;
}

export interface EndpointChange {
  key: string;
  source: SnapshotSource;
  name: string;
  kind: EndpointChangeKind;
  severity: ChangeSeverity;
  baselineEntityType?: string;
  targetEntityType?: string;
  entityTypeChanged: boolean;
  fieldChanges: FieldChange[];
}

export interface DiffSummary {
  totalBaseline: number;
  totalTarget: number;
  breakingCount: number;
  nonBreakingCount: number;
  unchangedCount: number;
  endpointsRemoved: number;
  endpointsAdded: number;
  endpointsChanged: number;
  fieldsRemoved: number;
  fieldsTypeChanged: number;
  fieldsAdded: number;
}

export interface SchemaDiffResult {
  summary: DiffSummary;
  changes: EndpointChange[];
}

const VALID_SOURCES = new Set<SnapshotSource>(["standard", "custom", "automation"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseFields(rawFields: unknown, endpointName: string): SnapshotField[] {
  if (!Array.isArray(rawFields)) {
    throw new Error(`Daftar field pada endpoint "${endpointName}" harus berupa array.`);
  }
  return rawFields.map((item, idx) => {
    if (!isRecord(item) || typeof item.name !== "string" || typeof item.type !== "string") {
      throw new Error(`Field #${idx + 1} pada endpoint "${endpointName}" harus memiliki name dan type.`);
    }
    return { name: item.name, type: item.type };
  });
}

export function parseSnapshotJson(raw: string): SchemaSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Format JSON snapshot tidak valid.");
  }
  if (!isRecord(parsed)) {
    throw new Error("Isi snapshot harus berupa objek JSON.");
  }
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.endpoints)) {
    throw new Error("Snapshot harus memiliki schemaVersion: 1 dan array endpoints.");
  }

  const endpoints: SnapshotEndpoint[] = parsed.endpoints.map((entry, idx) => {
    if (!isRecord(entry)) {
      throw new Error(`Endpoint #${idx + 1} pada snapshot tidak valid.`);
    }
    if (typeof entry.source !== "string" || !VALID_SOURCES.has(entry.source as SnapshotSource)) {
      throw new Error(`Source endpoint #${idx + 1} harus standard, custom, atau automation.`);
    }
    if (typeof entry.name !== "string" || !entry.name.trim()) {
      throw new Error(`Nama endpoint #${idx + 1} wajib berupa teks.`);
    }
    if (typeof entry.entityType !== "string") {
      throw new Error(`entityType pada endpoint "${entry.name}" wajib berupa teks.`);
    }
    return {
      source: entry.source as SnapshotSource,
      name: entry.name,
      entityType: entry.entityType,
      fields: parseFields(entry.fields ?? [], entry.name),
    };
  });

  const sources = Array.isArray(parsed.sources)
    ? (parsed.sources.filter(
        item => typeof item === "string" && VALID_SOURCES.has(item as SnapshotSource),
      ) as SnapshotSource[])
    : Array.from(new Set(endpoints.map(item => item.source)));

  return {
    schemaVersion: 1,
    capturedAt: typeof parsed.capturedAt === "string" ? parsed.capturedAt : "",
    environment: typeof parsed.environment === "string" ? parsed.environment : "Sandbox",
    customApiRoute: typeof parsed.customApiRoute === "string" ? parsed.customApiRoute : null,
    sources,
    endpoints,
  };
}

function endpointKey(item: Pick<SnapshotEndpoint, "source" | "name">): string {
  return `${item.source}::${item.name}`;
}

export function diffSnapshots(baseline: SchemaSnapshot, target: SchemaSnapshot): SchemaDiffResult {
  const baselineMap = new Map<string, SnapshotEndpoint>();
  for (const item of baseline.endpoints) {
    baselineMap.set(endpointKey(item), item);
  }

  const targetMap = new Map<string, SnapshotEndpoint>();
  for (const item of target.endpoints) {
    targetMap.set(endpointKey(item), item);
  }

  const changes: EndpointChange[] = [];
  let unchangedCount = 0;
  let endpointsRemoved = 0;
  let endpointsAdded = 0;
  let endpointsChanged = 0;
  let fieldsRemoved = 0;
  let fieldsTypeChanged = 0;
  let fieldsAdded = 0;

  for (const [key, oldItem] of baselineMap) {
    const newItem = targetMap.get(key);
    if (!newItem) {
      endpointsRemoved += 1;
      fieldsRemoved += oldItem.fields.length;
      changes.push({
        key,
        source: oldItem.source,
        name: oldItem.name,
        kind: "removed",
        severity: "breaking",
        baselineEntityType: oldItem.entityType,
        entityTypeChanged: false,
        fieldChanges: oldItem.fields.map(field => ({
          name: field.name,
          kind: "removed",
          severity: "breaking",
          oldType: field.type,
        })),
      });
      continue;
    }

    const oldFields = new Map(oldItem.fields.map(field => [field.name, field.type]));
    const newFields = new Map(newItem.fields.map(field => [field.name, field.type]));
    const fieldChanges: FieldChange[] = [];

    for (const [fieldName, oldType] of oldFields) {
      const newType = newFields.get(fieldName);
      if (newType === undefined) {
        fieldsRemoved += 1;
        fieldChanges.push({ name: fieldName, kind: "removed", severity: "breaking", oldType });
      } else if (newType !== oldType) {
        fieldsTypeChanged += 1;
        fieldChanges.push({
          name: fieldName,
          kind: "type_changed",
          severity: "breaking",
          oldType,
          newType,
        });
      }
    }

    for (const [fieldName, newType] of newFields) {
      if (!oldFields.has(fieldName)) {
        fieldsAdded += 1;
        fieldChanges.push({ name: fieldName, kind: "added", severity: "non_breaking", newType });
      }
    }

    const entityTypeChanged = oldItem.entityType !== newItem.entityType;
    if (!entityTypeChanged && fieldChanges.length === 0) {
      unchangedCount += 1;
      continue;
    }

    endpointsChanged += 1;
    fieldChanges.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "breaking" ? -1 : 1;
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });

    const hasBreakingField = fieldChanges.some(item => item.severity === "breaking");
    changes.push({
      key,
      source: newItem.source,
      name: newItem.name,
      kind: "changed",
      severity: entityTypeChanged || hasBreakingField ? "breaking" : "non_breaking",
      baselineEntityType: oldItem.entityType,
      targetEntityType: newItem.entityType,
      entityTypeChanged,
      fieldChanges,
    });
  }

  for (const [key, newItem] of targetMap) {
    if (baselineMap.has(key)) continue;
    endpointsAdded += 1;
    fieldsAdded += newItem.fields.length;
    changes.push({
      key,
      source: newItem.source,
      name: newItem.name,
      kind: "added",
      severity: "non_breaking",
      targetEntityType: newItem.entityType,
      entityTypeChanged: false,
      fieldChanges: newItem.fields.map(field => ({
        name: field.name,
        kind: "added",
        severity: "non_breaking",
        newType: field.type,
      })),
    });
  }

  changes.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "breaking" ? -1 : 1;
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  });

  const breakingCount = changes.filter(item => item.severity === "breaking").length;
  return {
    summary: {
      totalBaseline: baselineMap.size,
      totalTarget: targetMap.size,
      breakingCount,
      nonBreakingCount: changes.length - breakingCount,
      unchangedCount,
      endpointsRemoved,
      endpointsAdded,
      endpointsChanged,
      fieldsRemoved,
      fieldsTypeChanged,
      fieldsAdded,
    },
    changes,
  };
}

export function formatDiffMarkdown(
  diff: SchemaDiffResult,
  baselineLabel: string,
  targetLabel: string,
): string {
  const { summary, changes } = diff;
  const lines = [
    `# Change Analyzer — Ringkasan Dampak API`,
    ``,
    `- Baseline: ${baselineLabel}`,
    `- Target: ${targetLabel}`,
    `- Breaking endpoints: ${summary.breakingCount}`,
    `- Non-breaking additions: ${summary.nonBreakingCount}`,
    `- Unchanged endpoints: ${summary.unchangedCount}`,
    ``,
  ];
  if (changes.length === 0) {
    lines.push("Tidak ada perubahan skema API.");
    return lines.join("\n");
  }
  for (const item of changes) {
    const tag = item.severity === "breaking" ? "BREAKING" : "NON-BREAKING";
    lines.push(`## [${tag}] \`${item.source}/${item.name}\` (${item.kind})`);
    if (item.entityTypeChanged) {
      lines.push(`- entityType: \`${item.baselineEntityType}\` -> \`${item.targetEntityType}\``);
    }
    for (const field of item.fieldChanges) {
      if (field.kind === "removed") {
        lines.push(`- field dihapus: \`${field.name}\` (\`${field.oldType}\`)`);
      } else if (field.kind === "type_changed") {
        lines.push(`- tipe berubah: \`${field.name}\` (\`${field.oldType}\` -> \`${field.newType}\`)`);
      } else {
        lines.push(`- field baru: \`${field.name}\` (\`${field.newType}\`)`);
      }
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
