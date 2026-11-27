import { expect, test } from "bun:test";
import createClient from "openapi-fetch";
import { renderToStaticMarkup } from "react-dom/server";
import type { paths } from "../src/api/schema";
import {
  extractApiErrorMessage,
  filterUsers,
  loadPermissionDiff,
  loadPermissionUsers,
  searchObjectAccess,
  type PermissionDiffResponse,
  type PermissionUsersResponse,
} from "../src/features/permission-analyzer/api";
import { DiffTab } from "../src/features/permission-analyzer/DiffTab";
import { ObjectSearchTab } from "../src/features/permission-analyzer/ObjectSearchTab";
import { PermissionAnalyzerPage } from "../src/features/permission-analyzer/PermissionAnalyzerPage";
import { PermissionStrip, UserStateBadge } from "../src/features/permission-analyzer/PermissionBadges";
import { WorkspaceLayout } from "../src/layouts/WorkspaceLayout";

const sampleUsersResponse: PermissionUsersResponse = {
  users: [
    {
      userSecurityId: "u-1",
      userName: "ALICE",
      fullName: "Alice Pratama",
      state: "Enabled",
      licenseType: "Full User",
      applicationId: null,
      principalType: "user",
      isSuper: true,
      assignments: [
        {
          roleId: "SUPER",
          roleName: "Super User",
          company: "",
          scope: "System",
          type: "User",
          securityGroupCode: "",
          appId: null,
          appName: "",
        },
      ],
    },
    {
      userSecurityId: "a-1",
      userName: "ENTRA-AUTO",
      fullName: "Automation Entra App",
      state: "Enabled",
      licenseType: "Application",
      applicationId: "00000000-0000-4000-8000-000000000099",
      principalType: "application",
      isSuper: false,
      assignments: [
        {
          roleId: "D365 AUTOMATION",
          roleName: "Dynamics 365 Automation",
          company: "DEMO COMPANY",
          scope: "Tenant",
          type: "SecurityGroup",
          securityGroupCode: "SG-AUTO",
          appId: null,
          appName: "",
        },
      ],
    },
  ],
  permissionSets: [
    { id: "SUPER", displayName: "Super User", scope: "System", appId: null, extensionName: "" },
    {
      id: "D365 AUTOMATION",
      displayName: "Dynamics 365 Automation",
      scope: "Tenant",
      appId: null,
      extensionName: "",
    },
  ],
  companies: ["DEMO COMPANY"],
};

const sampleDiffResponse: PermissionDiffResponse = {
  kind: "user",
  leftLabel: "Alice Pratama",
  rightLabel: "Automation Entra App",
  roleDiff: {
    onlyLeft: [
      {
        roleId: "SUPER",
        roleName: "Super User",
        company: "",
        scope: "System",
        type: "User",
        securityGroupCode: "",
        isSensitive: true,
      },
    ],
    onlyRight: [
      {
        roleId: "D365 AUTOMATION",
        roleName: "Dynamics 365 Automation",
        company: "DEMO COMPANY",
        scope: "Tenant",
        type: "SecurityGroup",
        securityGroupCode: "SG-AUTO",
        isSensitive: false,
      },
    ],
    same: [],
  },
  objectDiff: {
    onlyLeft: [
      {
        objectType: "TableData",
        objectId: 18,
        objectName: "Customer",
        readPermission: "Yes",
        insertPermission: "Yes",
        modifyPermission: "Yes",
        deletePermission: "Yes",
        executePermission: "None",
        isSensitive: true,
      },
    ],
    onlyRight: [],
    same: [
      {
        objectType: "Page",
        objectId: 21,
        objectName: "Customer Card",
        readPermission: "Yes",
        insertPermission: "None",
        modifyPermission: "None",
        deletePermission: "None",
        executePermission: "Yes",
        isSensitive: false,
      },
    ],
  },
};

function mockClient(handler: (request: Request, url: URL) => Promise<Response> | Response) {
  return createClient<paths>({
    baseUrl: "http://localhost",
    fetch: async request => {
      expect(request.method).toBe("GET");
      return handler(request, new URL(request.url));
    },
  });
}

test("filterUsers filters by search text, principalType, company, and onlySuper", () => {
  const { users } = sampleUsersResponse;
  expect(
    filterUsers(users, { search: "", principalType: "all", company: "", onlySuper: false }),
  ).toHaveLength(2);
  expect(
    filterUsers(users, {
      search: "automation",
      principalType: "all",
      company: "",
      onlySuper: false,
    }).map(u => u.userSecurityId),
  ).toEqual(["a-1"]);
  expect(
    filterUsers(users, {
      search: "",
      principalType: "application",
      company: "",
      onlySuper: false,
    }).map(u => u.userSecurityId),
  ).toEqual(["a-1"]);
  expect(
    filterUsers(users, {
      search: "",
      principalType: "all",
      company: "DEMO COMPANY",
      onlySuper: false,
    }).map(u => u.userSecurityId),
  ).toEqual(["a-1"]);
  expect(
    filterUsers(users, { search: "", principalType: "all", company: "", onlySuper: true }).map(
      u => u.userSecurityId,
    ),
  ).toEqual(["u-1"]);
});

test("extractApiErrorMessage and OpenAPI client helpers handle GET queries and errors", async () => {
  expect(
    extractApiErrorMessage(
      { error: { code: "INVALID_QUERY", message: "Query wajib diisi" } },
      "Fallback",
    ),
  ).toBe("Query wajib diisi (INVALID_QUERY)");
  expect(extractApiErrorMessage(null, "Fallback")).toBe("Fallback");

  const client = mockClient((_, url) => {
    if (url.pathname === "/api/v1/permission-analyzer/users") {
      return Response.json(sampleUsersResponse);
    }
    if (url.pathname === "/api/v1/permission-analyzer/objects") {
      expect(url.searchParams.get("query")).toBe("Customer");
      expect(url.searchParams.get("object_type")).toBe("TableData");
      expect(url.searchParams.get("access")).toBe("write");
      expect(url.searchParams.get("company")).toBe("DEMO COMPANY");
      return Response.json({ totalMatches: 0, truncated: false, matches: [] });
    }
    if (url.pathname === "/api/v1/permission-analyzer/diff") {
      return Response.json(
        { error: { code: "BC_NOT_FOUND", message: "User tidak ditemukan" } },
        { status: 404 },
      );
    }
    throw new Error(`Unexpected path: ${url.pathname}`);
  });

  const users = await loadPermissionUsers(new AbortController().signal, client);
  expect(users.users).toHaveLength(2);

  const searchResult = await searchObjectAccess(
    { query: "Customer", objectType: "TableData", access: "write", company: "DEMO COMPANY" },
    new AbortController().signal,
    client,
  );
  expect(searchResult.totalMatches).toBe(0);

  await expect(
    loadPermissionDiff({ kind: "user", left: "u-1", right: "missing" }, new AbortController().signal, client),
  ).rejects.toThrow("User tidak ditemukan (BC_NOT_FOUND)");
});

test("PermissionAnalyzerPage renders loading, error, and 3 main tabs with user details", () => {
  const loadingHtml = renderToStaticMarkup(<PermissionAnalyzerPage />);
  expect(loadingHtml).toContain("Permission Analyzer");
  expect(loadingHtml).toContain("Memuat data user dan permission set Sandbox");

  const errorHtml = renderToStaticMarkup(
    <PermissionAnalyzerPage
      initialUsersState={{ status: "error", message: "Koneksi BC gagal (BC_SERVER_ERROR)" }}
    />,
  );
  expect(errorHtml).toContain("Koneksi BC gagal (BC_SERVER_ERROR)");
  expect(errorHtml).toContain("Coba lagi");

  const readyHtml = renderToStaticMarkup(
    <PermissionAnalyzerPage
      initialUsersState={{ status: "ready", data: sampleUsersResponse }}
      defaultExpandUsers
    />,
  );
  expect(readyHtml).toContain("User &amp; Aplikasi");
  expect(readyHtml).toContain("Cari Akses Objek");
  expect(readyHtml).toContain("Bandingkan (Diff)");
  expect(readyHtml).toContain("Alice Pratama");
  expect(readyHtml).toContain("Automation Entra App");
  expect(readyHtml).toContain("Aplikasi Entra");
  expect(readyHtml).toContain("SUPER");
  expect(readyHtml).toContain("D365 AUTOMATION");
  expect(readyHtml).toContain("SG-AUTO");
  expect(readyHtml).toContain("DEMO COMPANY");
});

test("ObjectSearchTab renders results with R/I/M/D/E, sensitive tag, and holders", () => {
  const html = renderToStaticMarkup(
    <ObjectSearchTab
      companies={["DEMO COMPANY"]}
      initialState={{
        status: "ready",
        data: {
          totalMatches: 1,
          truncated: false,
          matches: [
            {
              objectType: "TableData",
              objectId: 18,
              objectName: "Customer",
              alObjectName: "Customer",
              roleId: "D365 CUSTOMER",
              roleName: "Customer Edit",
              scope: "Tenant",
              appName: "Base Application",
              readPermission: "Yes",
              insertPermission: "Yes",
              modifyPermission: "Indirect",
              deletePermission: "None",
              executePermission: "None",
              isSensitive: true,
              holders: [
                {
                  userSecurityId: "a-1",
                  userName: "ENTRA-AUTO",
                  fullName: "Automation Entra App",
                  principalType: "application",
                  state: "Enabled",
                  company: "DEMO COMPANY",
                  scope: "Tenant",
                  type: "SecurityGroup",
                  securityGroupCode: "SG-AUTO",
                },
              ],
            },
          ],
        },
      }}
    />,
  );
  expect(html).toContain("TableData");
  expect(html).toContain("18");
  expect(html).toContain("Customer");
  expect(html).toContain("D365 CUSTOMER");
  expect(html).toContain("Sensitif");
  expect(html).toContain("M (Indirect)");
  expect(html).toContain("Automation Entra App (DEMO COMPANY)");
});

test("DiffTab renders Hanya di A, Hanya di B, and Sama sections with role and object diffs", () => {
  const html = renderToStaticMarkup(
    <DiffTab
      users={sampleUsersResponse.users}
      permissionSets={sampleUsersResponse.permissionSets}
      initialState={{ status: "ready", data: sampleDiffResponse }}
    />,
  );
  expect(html).toContain("Alice Pratama");
  expect(html).toContain("Automation Entra App");
  expect(html).toContain("Hanya di A (2)");
  expect(html).toContain("Hanya di B (1)");
  expect(html).toContain("Sama (1)");
  expect(html).toContain("SUPER");
  expect(html).toContain("Customer");
});

test("WorkspaceLayout includes Permission Analyzer navigation link", () => {
  const prevWindow = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = {
    location: { hash: "" },
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  };
  try {
    const html = renderToStaticMarkup(
      <WorkspaceLayout choice="system" onThemeChange={() => {}} />,
    );
    expect(html).toContain('href="#permission-analyzer"');
    expect(html).toContain("Permission Analyzer");
  } finally {
    (globalThis as { window?: unknown }).window = prevWindow;
  }
});

test("ObjectSearchTab renders error, truncated banner, and empty states", () => {
  const errorHtml = renderToStaticMarkup(
    <ObjectSearchTab
      companies={["DEMO COMPANY"]}
      initialState={{ status: "error", message: "Backend tidak terjangkau." }}
    />,
  );
  expect(errorHtml).toContain("Backend tidak terjangkau.");

  const truncatedHtml = renderToStaticMarkup(
    <ObjectSearchTab
      companies={["DEMO COMPANY"]}
      initialState={{
        status: "ready",
        data: { totalMatches: 250, truncated: true, matches: [] },
      }}
    />,
  );
  expect(truncatedHtml).toContain("dibatasi maksimal 200 baris");
  expect(truncatedHtml).toContain("250 total kecocokan");
  expect(truncatedHtml).toContain("Tidak ada izin objek yang cocok dengan kriteria pencarian.");
});

test("DiffTab renders role mode and empty diff buckets", () => {
  const html = renderToStaticMarkup(
    <DiffTab
      users={sampleUsersResponse.users}
      permissionSets={sampleUsersResponse.permissionSets}
      initialState={{
        status: "ready",
        data: {
          kind: "role",
          leftLabel: "SUPER",
          rightLabel: "D365 AUTOMATION",
          roleDiff: { onlyLeft: [], onlyRight: [], same: [] },
          objectDiff: { onlyLeft: [], onlyRight: [], same: [] },
        },
      }}
    />,
  );
  expect(html).toContain("Hanya di A (0)");
  expect(html).toContain("Hanya di B (0)");
  expect(html).toContain("Sama (0)");
  expect(html).toContain("Tidak ada izin yang hanya dimiliki A.");
  expect(html).not.toContain("Permission Set (0)");
});

test("PermissionBadges renders None permissions and Disabled/unknown user state", () => {
  const noneHtml = renderToStaticMarkup(
    <PermissionStrip
      item={{
        readPermission: "None",
        insertPermission: "None",
        modifyPermission: "None",
        deletePermission: "None",
        executePermission: "None",
      }}
    />,
  );
  expect(noneHtml).toContain(">None<");

  const disabledHtml = renderToStaticMarkup(<UserStateBadge state="Disabled" />);
  expect(disabledHtml).toContain("ant-badge-status-error");
  expect(disabledHtml).toContain("Disabled");

  const unknownHtml = renderToStaticMarkup(<UserStateBadge state={null} />);
  expect(unknownHtml).toContain("Tidak diketahui");
});
