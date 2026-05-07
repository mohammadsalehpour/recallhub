import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'RecallHub_Control_Plane.json');
const SNAP_COLUMNS = 64;
const CANVAS_WIDTH_PX = 1280;
const COLUMN_WIDTH_PX = CANVAS_WIDTH_PX / SNAP_COLUMNS;

let seq = 0;
const id = (prefix) => `${prefix}_${(++seq).toString(36).padStart(4, '0')}`;

const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const readText = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const queryGroups = {
  projects: readJson('queries/projects.json'),
  memory: readJson('queries/memory.json'),
  workItems: readJson('queries/work_items.json'),
  workflows: readJson('queries/workflows.json'),
  stability: readJson('queries/stability.json'),
  audit: readJson('queries/audit.json'),
};

const queryByName = Object.values(queryGroups).flat().reduce((acc, query) => {
  if (query.method) acc[query.name] = query;
  return acc;
}, {});

const pageDefs = [
  { name: 'P01_Login', slug: 'p01-login', isDefault: true },
  { name: 'P10_Project_Setup_Wizard', slug: 'p10-project-setup-wizard' },
  { name: 'P20_Project_Memory', slug: 'p20-project-memory' },
  { name: 'P30_Work_Items', slug: 'p30-work-items' },
  { name: 'P40_Workflow_Runs_Monitor', slug: 'p40-workflow-runs-monitor' },
  { name: 'P50_Stability_Dashboard', slug: 'p50-stability-dashboard' },
  { name: 'P60_Audit_Timeline', slug: 'p60-audit-timeline' },
];

const pages = Object.fromEntries(pageDefs.map((page) => [page.name, page]));

const common = {
  parentRowSpace: 10,
  parentColumnSpace: COLUMN_WIDTH_PX,
  renderMode: 'CANVAS',
  animateLoading: true,
  isDeprecated: false,
  isLoading: false,
  borderRadius: '{{appsmith.theme.borderRadius.appBorderRadius}}',
};

function dynKeys(...keys) {
  return keys.filter(Boolean).map((key) => ({ key }));
}

function baseWidget(type, widgetName, row, col, width, height, parentId = '0') {
  return {
    ...common,
    type,
    widgetName,
    widgetId: id(widgetName),
    key: id('key'),
    topRow: row,
    bottomRow: row + height,
    leftColumn: col,
    rightColumn: col + width,
    parentId,
    isVisible: true,
    dynamicBindingPathList: dynKeys('borderRadius'),
    dynamicTriggerPathList: [],
    version: 1,
  };
}

function text(name, value, row, col, width, height = 4, opts = {}) {
  const widget = {
    ...baseWidget('TEXT_WIDGET', name, row, col, width, height),
    displayName: 'Text',
    text: value,
    fontSize: opts.fontSize || '1rem',
    fontStyle: opts.bold ? 'BOLD' : '',
    textColor: opts.color || '#1F2937',
    textAlign: opts.align || 'LEFT',
    overflow: 'NONE',
    dynamicHeight: 'FIXED',
    shouldTruncate: false,
  };
  if (String(value).includes('{{')) widget.dynamicBindingPathList.push({ key: 'text' });
  return widget;
}

function input(name, label, row, col, width, opts = {}) {
  const widget = {
    ...baseWidget('INPUT_WIDGET_V2', name, row, col, width, opts.height || 7),
    displayName: 'Input',
    label,
    labelPosition: 'Top',
    labelAlignment: 'left',
    labelWidth: 5,
    inputType: opts.inputType || 'TEXT',
    placeholderText: opts.placeholder || '',
    defaultText: opts.defaultText || '',
    isRequired: Boolean(opts.required),
    isDisabled: Boolean(opts.disabled),
    resetOnSubmit: false,
    dynamicHeight: opts.multiline ? 'AUTO_HEIGHT' : 'FIXED',
    minDynamicHeight: opts.multiline ? 8 : 4,
    maxDynamicHeight: 9000,
  };
  if (opts.multiline) widget.inputType = 'MULTI_LINE_TEXT';
  if (String(widget.defaultText).includes('{{')) widget.dynamicBindingPathList.push({ key: 'defaultText' });
  if (String(widget.isDisabled).includes('{{')) widget.dynamicBindingPathList.push({ key: 'isDisabled' });
  return widget;
}

function select(name, label, row, col, width, options, opts = {}) {
  const sourceData = typeof options === 'string'
    ? options
    : JSON.stringify(options.map((option) => ({ label: option, value: option })), null, 2);
  const widget = {
    ...baseWidget('SELECT_WIDGET', name, row, col, width, 7),
    displayName: 'Select',
    labelText: label,
    labelPosition: 'Top',
    labelAlignment: 'left',
    labelWidth: 5,
    sourceData,
    optionLabel: 'label',
    optionValue: 'value',
    defaultOptionValue: opts.defaultValue || '',
    isRequired: Boolean(opts.required),
    isDisabled: Boolean(opts.disabled),
    isFilterable: true,
    serverSideFiltering: false,
    placeholderText: 'Select option',
    dynamicPropertyPathList: dynKeys(typeof options === 'string' ? 'sourceData' : undefined),
  };
  if (typeof options === 'string') widget.dynamicBindingPathList.push({ key: 'sourceData' });
  if (String(widget.defaultOptionValue).includes('{{')) widget.dynamicBindingPathList.push({ key: 'defaultOptionValue' });
  if (String(widget.isDisabled).includes('{{')) widget.dynamicBindingPathList.push({ key: 'isDisabled' });
  return widget;
}

function button(name, label, row, col, width, onClick, opts = {}) {
  const widget = {
    ...baseWidget(opts.icon ? 'ICON_BUTTON_WIDGET' : 'BUTTON_WIDGET', name, row, col, width, opts.height || 5),
    displayName: opts.icon ? 'Icon button' : 'Button',
    text: label,
    iconName: opts.icon,
    iconSize: 20,
    buttonVariant: opts.variant || 'PRIMARY',
    buttonColor: opts.color || '{{appsmith.theme.colors.primaryColor}}',
    onClick: `{{${onClick};}}`,
    isDisabled: opts.disabled || false,
    tooltip: opts.tooltip || '',
    isDefaultClickDisabled: true,
    resetFormOnClick: false,
    placement: 'CENTER',
    dynamicBindingPathList: dynKeys('buttonColor', 'borderRadius'),
    dynamicTriggerPathList: dynKeys('onClick'),
  };
  if (String(widget.isDisabled).includes('{{')) widget.dynamicBindingPathList.push({ key: 'isDisabled' });
  if (String(widget.tooltip).includes('{{')) widget.dynamicBindingPathList.push({ key: 'tooltip' });
  return widget;
}

function table(name, row, col, width, height, tableData, opts = {}) {
  const widget = {
    ...baseWidget('TABLE_WIDGET_V2', name, row, col, width, height),
    displayName: 'Table',
    tableData,
    defaultSelectedRowIndex: 0,
    defaultSelectedRowIndices: [0],
    allowAddNewRow: Boolean(opts.editable),
    enableClientSideSearch: true,
    isSortable: true,
    isVisiblePagination: true,
    isVisibleSearch: true,
    isVisibleFilters: true,
    isVisibleDownload: true,
    canFreezeColumn: true,
    columnOrder: opts.columns || [],
    primaryColumns: {},
    textSize: '0.875rem',
    onRowSelected: opts.onRowSelected ? `{{${opts.onRowSelected};}}` : '',
    dynamicBindingPathList: dynKeys('borderRadius', 'tableData'),
    dynamicTriggerPathList: dynKeys(opts.onRowSelected ? 'onRowSelected' : undefined),
  };
  return widget;
}

function checkbox(name, label, row, col, width) {
  return {
    ...baseWidget('CHECKBOX_WIDGET', name, row, col, width, 4),
    displayName: 'Checkbox',
    label,
    defaultCheckedState: false,
    isChecked: false,
    alignWidget: 'LEFT',
  };
}

function sectionTitle(name, value, row) {
  return text(name, value, row, 1, 62, 3, { bold: true, fontSize: '1rem', color: '#111827' });
}

function nav(row = 6) {
  const buttons = [
    ['navLogin', 'Login', 'P01_Login'],
    ['navProject', 'Project', 'P10_Project_Setup_Wizard'],
    ['navMemory', 'Memory', 'P20_Project_Memory'],
    ['navWork', 'Work', 'P30_Work_Items'],
    ['navRuns', 'Runs', 'P40_Workflow_Runs_Monitor'],
    ['navStability', 'Stability', 'P50_Stability_Dashboard'],
    ['navAudit', 'Audit', 'P60_Audit_Timeline'],
  ];
  return buttons.map(([name, label, page], idx) =>
    button(name, label, row, 1 + idx * 9, 8, `navigateTo('${page}')`, {
      variant: 'TERTIARY',
      height: 3,
      color: '#374151',
    }),
  );
}

function makePage(name, widgets, opts = {}) {
  const bottomRow = Math.max(80, ...widgets.map((widget) => widget.bottomRow || 0)) + 4;
  const dsl = {
    backgroundColor: '#F9FAFB',
    bottomRow,
    canExtend: true,
    children: widgets,
    containerStyle: 'none',
    detachFromLayout: true,
    dynamicBindingPathList: [],
    dynamicTriggerPathList: [],
    leftColumn: 0,
    minHeight: bottomRow * 10,
    parentColumnSpace: 1,
    parentRowSpace: 1,
    rightColumn: CANVAS_WIDTH_PX,
    snapColumns: SNAP_COLUMNS,
    snapRows: bottomRow,
    topRow: 0,
    type: 'CANVAS_WIDGET',
    version: 1,
    widgetId: '0',
    widgetName: 'MainContainer',
  };
  return {
    unpublishedPage: {
      name,
      slug: pages[name].slug,
      isHidden: false,
      layouts: [
        {
          dsl,
          layoutOnLoadActions: opts.onLoadActions || [],
          layoutOnLoadActionErrors: [],
        },
      ],
      policyMap: {},
      userPermissions: [],
    },
    publishedPage: {
      name,
      slug: pages[name].slug,
      isHidden: false,
      layouts: [
        {
          dsl,
          layoutOnLoadActions: opts.onLoadActions || [],
          layoutOnLoadActionErrors: [],
        },
      ],
      policyMap: {},
      userPermissions: [],
    },
    gitSyncId: id('git'),
    deleted: false,
  };
}

function header(title, subtitle) {
  return [
    text('txtAppTitle', 'RecallHub Control Plane', 1, 1, 24, 3, { bold: true, fontSize: '1.25rem' }),
    text('txtPageTitle', title, 1, 27, 36, 3, { bold: true, fontSize: '1rem', color: '#2563EB' }),
    text('txtPageHint', subtitle, 4, 1, 62, 3, { color: '#4B5563' }),
    ...nav(7),
  ];
}

const pageWidgets = {
  P01_Login: [
    ...header('Login', 'Store the API token, API base URL, role, and actor id used by the NestJS API.'),
    input('inpToken', 'API Token', 15, 2, 28, { required: true, inputType: 'PASSWORD' }),
    input('inpApiBaseUrl', 'API Base URL', 15, 32, 28, { placeholder: 'http://api:3000/api/v1' }),
    select('selActiveRole', 'Role', 24, 2, 18, ['operator', 'admin', 'owner', 'ops'], { defaultValue: 'operator' }),
    input('inpActiveUserId', 'Actor UUID', 24, 22, 28),
    button('btnSaveToken', 'Save token', 35, 2, 14, 'JS_AppShell.saveToken()'),
    button('btnSaveApiBaseUrl', 'Save URL', 35, 18, 14, 'JS_AppShell.saveApiBaseUrl()', { variant: 'SECONDARY' }),
    button('btnSaveUserId', 'Save actor', 35, 34, 14, 'JS_AppShell.setActiveUserId()', { variant: 'SECONDARY' }),
    button('btnLogout', 'Logout', 35, 50, 10, 'JS_AppShell.logout()', { variant: 'TERTIARY' }),
  ],

  P10_Project_Setup_Wizard: [
    ...header('Project Setup Wizard', 'Create the explicit project profile, repository, paths, config files, then validate and sync.'),
    sectionTitle('secProject', 'Project', 14),
    table('tblProjects', 18, 1, 28, 22, '{{JS_AppShell.projectRows()}}', {
      onRowSelected: 'JS_ProjectFlow.selectProject(tblProjects.selectedRow)',
    }),
    input('inpProjectCode', 'Project Code', 18, 31, 14, { required: true }),
    input('inpProjectName', 'Name', 18, 47, 16, { required: true }),
    input('inpProjectDescription', 'Description', 27, 31, 32, { required: true, multiline: true, height: 12 }),
    select('selBusinessDomain', 'Business Domain', 41, 31, 15, ['ERP', 'CRM', 'ecommerce', 'internal-tool', 'other']),
    input('inpFrameworkName', 'Framework Name', 41, 48, 15, { required: true }),
    input('inpFrameworkVersion', 'Framework Version', 50, 31, 15, { required: true }),
    table('tblTechStack', 50, 48, 15, 16, JSON.stringify([{ category: 'framework', name: '', version: '', source: 'declared', notes: '' }]), {
      editable: true,
      columns: ['category', 'name', 'version', 'source', 'notes'],
    }),
    button('btnCreateProject', 'Create project', 68, 49, 14, 'JS_ProjectFlow.createProjectWizardFlow()'),

    sectionTitle('secRepository', 'Repository', 77),
    table('tblRepositories', 81, 1, 28, 18, '{{JS_AppShell.dataRows(qRepositoryList.data)}}', {
      onRowSelected: 'JS_ProjectFlow.selectRepository(tblRepositories.selectedRow)',
    }),
    input('inpRepoName', 'Repository Name', 81, 31, 15, { required: true }),
    select('selRepoLocatorType', 'Locator Type', 81, 48, 15, ['local_path'], { required: true, defaultValue: 'local_path' }),
    input('inpRepoRoot', 'Repo Root', 90, 31, 32, { required: true }),
    input('inpDefaultBranch', 'Default Branch', 99, 31, 15),
    button('btnCreateRepository', 'Create repository', 100, 48, 15, 'JS_ProjectFlow.createRepository()'),
    button('btnValidateRepository', 'Validate repo', 107, 48, 15, 'JS_ProjectFlow.validateRepository()', {
      variant: 'SECONDARY',
      disabled: '{{!appsmith.store.activeRepositoryId}}',
    }),

    sectionTitle('secPaths', 'Paths', 116),
    table('tblPaths', 120, 1, 28, 18, '{{JS_AppShell.dataRows(qPathList.data)}}'),
    input('inpPath', 'Path', 120, 31, 32, { required: true }),
    input('inpPathLabel', 'Label', 129, 31, 15),
    checkbox('chkPathRequired', 'Required', 131, 48, 15),
    select('selPathType', 'Path Type', 138, 31, 15, ['framework_core', 'official_addons', 'custom_addons', 'owned_apps', 'third_party_apps', 'config', 'docs', 'tests', 'scripts', 'generated', 'ignore'], { required: true }),
    select('selScanPolicy', 'Scan Policy', 138, 48, 15, ['include', 'exclude', 'metadata_only'], { required: true }),
    select('selOwnership', 'Ownership', 147, 31, 15, ['framework', 'vendor', 'team_owned', 'generated', 'unknown'], { required: true }),
    button('btnCreatePath', 'Create path', 149, 48, 15, 'JS_ProjectFlow.createPath()', {
      disabled: '{{!appsmith.store.activeRepositoryId}}',
    }),

    sectionTitle('secConfigFiles', 'Config Files', 158),
    table('tblConfigFiles', 162, 1, 28, 18, '{{JS_AppShell.dataRows(qConfigList.data)}}'),
    input('inpConfigRelativePath', 'Relative Path', 162, 31, 32, { required: true }),
    input('inpConfigType', 'Config Type', 171, 31, 15, { required: true }),
    checkbox('chkConfigRequired', 'Required', 173, 48, 15),
    select('selContainsSecrets', 'Contains Secrets', 180, 31, 15, ['true', 'false', 'unknown'], { required: true, defaultValue: 'unknown' }),
    select('selConfigScanPolicy', 'Config Scan Policy', 180, 48, 15, ['metadata_only', 'parse_safe', 'exclude'], { required: true }),
    button('btnCreateConfigFile', 'Create config', 189, 48, 15, 'JS_ProjectFlow.createConfigFile()', {
      disabled: '{{!appsmith.store.activeRepositoryId}}',
    }),
    button('btnValidateAndSync', 'Validate and sync', 199, 48, 15, 'JS_ProjectFlow.validateRepositoryAndSync()', {
      disabled: '{{!appsmith.store.activeProjectCode}}',
    }),
  ],

  P20_Project_Memory: [
    ...header('Project Memory', 'Read-only modules, files, chunks, events, and commits from NestJS.'),
    button('btnRefreshMemory', 'Refresh', 14, 52, 10, 'Promise.all([qMemoryModules.run(), qMemoryFiles.run(), qMemoryChunks.run(), qMemoryEvents.run(), qMemoryCommits.run()])', { variant: 'SECONDARY' }),
    sectionTitle('secModules', 'Modules', 17),
    table('tblMemoryModules', 21, 1, 62, 18, '{{JS_AppShell.dataRows(qMemoryModules.data)}}'),
    sectionTitle('secFiles', 'Files', 43),
    table('tblMemoryFiles', 47, 1, 62, 18, '{{JS_AppShell.dataRows(qMemoryFiles.data)}}'),
    sectionTitle('secChunks', 'Chunks', 69),
    table('tblMemoryChunks', 73, 1, 62, 18, '{{JS_AppShell.dataRows(qMemoryChunks.data)}}'),
    sectionTitle('secEvents', 'Events', 95),
    table('tblMemoryEvents', 99, 1, 62, 18, '{{JS_AppShell.dataRows(qMemoryEvents.data)}}'),
    sectionTitle('secCommits', 'Commits', 121),
    table('tblMemoryCommits', 125, 1, 62, 18, '{{JS_AppShell.dataRows(qMemoryCommits.data)}}'),
  ],

  P30_Work_Items: [
    ...header('Work Items', 'Create work items and execute only backend-owned status transitions.'),
    sectionTitle('secCreateWorkItem', 'Create', 14),
    input('inpWorkItemTitle', 'Title', 18, 1, 20, { required: true }),
    input('inpWorkItemRequest', 'Original Request', 18, 23, 40, { required: true, multiline: true, height: 13 }),
    select('selRequestType', 'Request Type', 33, 1, 14, ['bugfix', 'feature', 'research', 'refactor', 'ops', 'documentation'], { required: true }),
    select('selRiskLevel', 'Risk Level', 33, 17, 14, ['low', 'medium', 'high', 'critical'], { defaultValue: 'medium' }),
    select('selPriority', 'Priority', 33, 33, 14, ['low', 'normal', 'high', 'urgent'], { defaultValue: 'normal' }),
    table('tblOpenQuestions', 42, 1, 30, 14, JSON.stringify([{ question: '' }]), { editable: true, columns: ['question'] }),
    button('btnCreateWorkItem', 'Create work item', 51, 49, 14, 'JS_WorkItemFlow.createWorkItem()'),
    sectionTitle('secWorkItemList', 'List and Context', 60),
    table('tblWorkItems', 64, 1, 30, 24, '{{JS_AppShell.dataRows(qWorkItemList.data)}}', {
      onRowSelected: 'JS_WorkItemFlow.selectWorkItem(tblWorkItems.selectedRow)',
    }),
    input('jsonContextPacket', 'Context Packet', 64, 33, 30, { multiline: true, height: 24, disabled: true, defaultText: '{{JSON.stringify(qWorkItemContext.data || {}, null, 2)}}' }),
    sectionTitle('secActions', 'Actions', 92),
    button('btnStartResearch', 'Start research', 97, 1, 14, 'JS_WorkItemFlow.startResearch()', {
      disabled: "{{!JS_WorkItemFlow.can('research')}}",
      tooltip: "{{JS_WorkItemFlow.actionTooltip('research')}}",
    }),
    button('btnStartSpec', 'Start spec', 97, 17, 14, 'JS_WorkItemFlow.startSpec()', {
      disabled: "{{!JS_WorkItemFlow.can('spec')}}",
      tooltip: "{{JS_WorkItemFlow.actionTooltip('spec')}}",
    }),
    select('selApprovalDecision', 'Decision', 96, 34, 12, ['approve', 'approve_with_waiver', 'reject'], { defaultValue: 'approve' }),
    input('inpApprovalReason', 'Approval Reason', 96, 48, 15, { multiline: true, height: 9 }),
    button('btnApprove', 'Approve', 107, 34, 12, "JS_WorkItemFlow.submitApproval('approve')", {
      disabled: "{{!JS_WorkItemFlow.can('approval')}}",
      tooltip: "{{JS_WorkItemFlow.actionTooltip('approval')}}",
    }),
    button('btnApproveWaiver', 'Approve waiver', 107, 48, 14, "JS_WorkItemFlow.submitApproval('approve_with_waiver')", {
      disabled: "{{!JS_WorkItemFlow.can('approval')}}",
      tooltip: "{{JS_WorkItemFlow.actionTooltip('approval')}}",
    }),
    button('btnReject', 'Reject', 117, 34, 12, "JS_WorkItemFlow.submitApproval('reject')", {
      variant: 'SECONDARY',
      disabled: "{{!JS_WorkItemFlow.can('approval')}}",
      tooltip: "{{JS_WorkItemFlow.actionTooltip('approval')}}",
    }),
    button('btnImplementationPlan', 'Implementation plan', 117, 48, 15, 'JS_WorkItemFlow.createImplementationPlan()', {
      disabled: "{{!JS_WorkItemFlow.can('implementationPlan')}}",
      tooltip: "{{JS_WorkItemFlow.actionTooltip('implementationPlan')}}",
    }),
    button('btnExecutionSimulate', 'Execution simulation', 127, 34, 16, 'JS_WorkItemFlow.simulateExecution()', {
      disabled: "{{!JS_WorkItemFlow.can('executionSimulation')}}",
      tooltip: "{{JS_WorkItemFlow.actionTooltip('executionSimulation')}}",
    }),
    sectionTitle('secMemoryCommit', 'Memory Commit', 117),
    input('inpCommitTitle', 'Commit Title', 121, 1, 20, { required: true }),
    input('inpWhatChanged', 'What Changed', 121, 23, 19, { required: true, multiline: true, height: 11 }),
    input('inpWhyChanged', 'Why Changed', 121, 44, 19, { required: true, multiline: true, height: 11 }),
    input('inpHowChanged', 'How Changed', 134, 1, 20, { required: true, multiline: true, height: 11 }),
    table('tblFilesTouched', 134, 23, 19, 12, JSON.stringify([{ path: '' }]), { editable: true, columns: ['path'] }),
    table('tblModulesTouched', 134, 44, 19, 12, JSON.stringify([{ module: '' }]), { editable: true, columns: ['module'] }),
    table('tblCommandsRun', 149, 1, 20, 12, JSON.stringify([{ command: '' }]), { editable: true, columns: ['command'] }),
    select('selValidationStatus', 'Validation Status', 149, 23, 19, ['unknown', 'passed', 'failed', 'partial', 'not_run'], { defaultValue: 'unknown' }),
    input('inpValidationSummary', 'Validation Summary', 149, 44, 19, { multiline: true, height: 12 }),
    table('tblRisksRemaining', 164, 1, 30, 12, JSON.stringify([{ risk: '' }]), { editable: true, columns: ['risk'] }),
    button('btnMemoryCommit', 'Submit memory commit', 170, 44, 19, 'JS_WorkItemFlow.submitMemoryCommit()', {
      disabled: "{{!JS_WorkItemFlow.can('memoryCommit')}}",
      tooltip: "{{JS_WorkItemFlow.actionTooltip('memoryCommit')}}",
    }),
  ],

  P40_Workflow_Runs_Monitor: [
    ...header('Workflow Runs Monitor', 'Run workflows through NestJS and inspect run events from the backend.'),
    select('selWorkflowCode', 'Workflow', 15, 1, 26, "{{(JS_AppShell.dataRows(qWorkflowList.data) || []).map(w => ({ label: w.name || w.code, value: w.code }))}}"),
    input('txtWorkflowInput', 'Workflow Input JSON', 15, 29, 34, { multiline: true, height: 12, defaultText: '{}' }),
    button('btnStartWorkflowRun', 'Start workflow', 29, 49, 14, 'JS_RunMonitor.startManualWorkflow()'),
    button('btnRefreshRuns', 'Refresh', 29, 35, 12, 'JS_RunMonitor.refreshRuns()', { variant: 'SECONDARY' }),
    button('btnPollRun', 'Poll run', 29, 21, 12, 'JS_RunMonitor.pollRun(appsmith.store.activeRunId)', {
      variant: 'SECONDARY',
      disabled: '{{!appsmith.store.activeRunId}}',
    }),
    button('btnRetryRun', 'Retry', 33, 21, 12, 'JS_RunMonitor.retryRun()', {
      variant: 'SECONDARY',
      disabled: '{{!JS_RunMonitor.canRetry()}}',
    }),
    button('btnCancelRun', 'Cancel', 33, 35, 12, 'JS_RunMonitor.cancelRun()', {
      variant: 'SECONDARY',
      disabled: '{{!JS_RunMonitor.canCancel()}}',
    }),
    text('txtActiveRunSummary', '{{JS_RunMonitor.selectedRunSummary()}}', 33, 49, 14, 7, { bold: true, fontSize: '0.875rem', color: '#1F2937' }),
    table('tblWorkflowRuns', 42, 1, 30, 34, '{{JS_AppShell.runRows()}}', {
      onRowSelected: 'JS_RunMonitor.selectRun(tblWorkflowRuns.selectedRow)',
    }),
    input('jsonWorkflowRun', 'Selected Run', 42, 33, 30, { multiline: true, height: 14, disabled: true, defaultText: '{{JSON.stringify(qWorkflowRunGet.data || {}, null, 2)}}' }),
    input('jsonWorkflowArtifact', 'Artifact', 58, 33, 14, { multiline: true, height: 14, disabled: true, defaultText: '{{JSON.stringify(JS_RunMonitor.selectedRunArtifact() || {}, null, 2)}}' }),
    input('jsonWorkflowError', 'Error', 58, 49, 14, { multiline: true, height: 14, disabled: true, defaultText: '{{JSON.stringify(JS_RunMonitor.selectedRunError() || {}, null, 2)}}' }),
    table('tblWorkflowRunEvents', 74, 33, 30, 16, '{{JS_AppShell.dataRows(qWorkflowRunEvents.data)}}'),
  ],

  P50_Stability_Dashboard: [
    ...header('Stability Dashboard', 'Admin-only health and reconcile controls. The reconcile action requires confirmation.'),
    text('kpiProjectCount', 'Projects\\n{{qStabilityHealth.data?.data?.projects || 0}}', 16, 2, 20, 10, { bold: true, fontSize: '1.25rem', color: '#065F46' }),
    text('kpiStaleRuns', 'Stale runs\\n{{qStabilityHealth.data?.data?.stale_workflow_runs || 0}}', 16, 24, 20, 10, { bold: true, fontSize: '1.25rem', color: '#92400E' }),
    input('inpStaleMinutes', 'Stale Minutes', 16, 46, 16, { inputType: 'NUMBER', defaultText: '30' }),
    button('btnRefreshStability', 'Refresh', 28, 36, 12, 'qStabilityHealth.run()', { variant: 'SECONDARY' }),
    button('btnReconcile', 'Reconcile', 28, 50, 12, 'JS_AppShell.requireAdmin() && qStabilityReconcile.run(() => qStabilityHealth.run())', {
      disabled: '{{!JS_AppShell.isAdmin()}}',
    }),
    table('tblRunStatusBreakdown', 38, 1, 62, 26, '{{qStabilityHealth.data?.data?.workflow_runs_by_status || []}}'),
  ],

  P60_Audit_Timeline: [
    ...header('Audit Timeline', 'Read-only timeline composed from audit logs and workflow runs.'),
    button('btnRefreshAudit', 'Refresh', 14, 52, 10, 'Promise.all([qAuditLogs.run(), qAuditWorkflowRuns.run()])', { variant: 'SECONDARY' }),
    table('tblAuditTimeline', 22, 1, 30, 40, '{{JS_AppShell.auditTimelineRows()}}', {
      onRowSelected: 'storeValue("activeRunId", tblAuditTimeline.selectedRow.resourceId, false).then(() => qAuditSelectedWorkflowEvents.run())',
    }),
    table('tblAuditWorkflowEvents', 22, 33, 30, 40, '{{JS_AppShell.dataRows(qAuditSelectedWorkflowEvents.data)}}'),
  ],
};

const pageQueries = {
  P10_Project_Setup_Wizard: [
    'qProjectList',
    'qProjectGet',
    'qProjectCreate',
    'qProjectTechStack',
    'qRepositoryList',
    'qRepoCreate',
    'qRepoValidate',
    'qPathList',
    'qPathCreate',
    'qConfigList',
    'qConfigCreate',
    'qProjectSync',
    'qWorkflowRunsList',
    'qMemoryEvents',
  ],
  P20_Project_Memory: ['qMemoryModules', 'qMemoryFiles', 'qMemoryChunks', 'qMemoryEvents', 'qMemoryCommits'],
  P30_Work_Items: [
    'qWorkItemList',
    'qWorkItemCreate',
    'qWorkItemContext',
    'qWorkItemResearchStart',
    'qWorkItemSpecStart',
    'qWorkItemApproval',
    'qWorkItemImplementationPlan',
    'qWorkItemExecutionSimulate',
    'qWorkItemMemoryCommit',
    'qWorkflowRunsList',
    'qMemoryEvents',
    'qMemoryCommits',
  ],
  P40_Workflow_Runs_Monitor: ['qWorkflowList', 'qWorkflowRunsList', 'qWorkflowRunGet', 'qWorkflowRunEvents', 'qWorkflowRunCreate', 'qWorkflowRunRetry', 'qWorkflowRunCancel'],
  P50_Stability_Dashboard: ['qStabilityHealth', 'qStabilityReconcile'],
  P60_Audit_Timeline: ['qAuditLogs', 'qAuditWorkflowRuns', 'qAuditSelectedWorkflowEvents'],
};

const jsBodies = {
  P01_Login: {
    JS_AppShell: `export default {
  async saveToken() {
    if (!inpToken.text || !String(inpToken.text).trim()) {
      showAlert('Token is required', 'warning');
      return;
    }
    await storeValue('token', String(inpToken.text).trim(), true);
    await storeValue('activeRole', selActiveRole.selectedOptionValue || 'operator', true);
    showAlert('Token saved', 'success');
    navigateTo('P10_Project_Setup_Wizard');
  },

  async saveApiBaseUrl() {
    if (!inpApiBaseUrl.text || !String(inpApiBaseUrl.text).trim()) {
      showAlert('API Base URL is required', 'warning');
      return;
    }
    await storeValue('apiBaseUrl', String(inpApiBaseUrl.text).trim(), true);
    showAlert('API Base URL saved', 'success');
  },

  async setActiveUserId() {
    await storeValue('activeRole', selActiveRole.selectedOptionValue || 'operator', true);
    const value = inpActiveUserId.text;
    if (!value || !String(value).trim()) {
      await removeValue('activeUserId');
      showAlert('Actor cleared', 'info');
      return;
    }
    await storeValue('activeUserId', String(value).trim(), true);
    showAlert('Actor saved', 'success');
  },

  async logout() {
    await removeValue('token');
    await removeValue('activeProjectCode');
    await removeValue('activeProjectId');
    await removeValue('activeRepositoryId');
    await removeValue('activeWorkItemId');
    await removeValue('activeRunId');
    showAlert('Logged out', 'info');
  }
};`,
  },
  P10_Project_Setup_Wizard: {
    JS_AppShell: `export default {
  idempotencyKey(prefix) {
    return \`\${prefix}-\${Date.now()}-\${Math.random().toString(16).slice(2)}\`;
  },

  dataRows(queryData) {
    if (Array.isArray(queryData)) return queryData;
    if (Array.isArray(queryData?.data)) return queryData.data;
    return [];
  },

  projectRows() {
    return this.dataRows(qProjectList.data);
  },

  notifyError(error, fallbackMessage = 'Request failed') {
    const message = error?.responseMeta?.body?.message || error?.message || fallbackMessage;
    showAlert(\`\${fallbackMessage}: \${message}\`, 'error');
  }
};`,
    JS_ProjectFlow: readText('jsobjects/JS_ProjectFlow.js'),
  },
  P20_Project_Memory: {
    JS_AppShell: `export default {
  dataRows(queryData) {
    if (Array.isArray(queryData)) return queryData;
    if (Array.isArray(queryData?.data)) return queryData.data;
    return [];
  }
};`,
  },
  P30_Work_Items: {
    JS_AppShell: `export default {
  idempotencyKey(prefix) {
    return \`\${prefix}-\${Date.now()}-\${Math.random().toString(16).slice(2)}\`;
  },

  dataRows(queryData) {
    if (Array.isArray(queryData)) return queryData;
    if (Array.isArray(queryData?.data)) return queryData.data;
    return [];
  },

  notifyError(error, fallbackMessage = 'Request failed') {
    const message = error?.responseMeta?.body?.message || error?.message || fallbackMessage;
    showAlert(\`\${fallbackMessage}: \${message}\`, 'error');
  }
};`,
    JS_WorkItemFlow: readText('jsobjects/JS_WorkItemFlow.js'),
  },
  P40_Workflow_Runs_Monitor: {
    JS_AppShell: `export default {
  idempotencyKey(prefix) {
    return \`\${prefix}-\${Date.now()}-\${Math.random().toString(16).slice(2)}\`;
  },

  dataRows(queryData) {
    if (Array.isArray(queryData)) return queryData;
    if (Array.isArray(queryData?.data)) return queryData.data;
    return [];
  },

  runRows() {
    return this.dataRows(qWorkflowRunsList.data);
  },

  notifyError(error, fallbackMessage = 'Request failed') {
    const message = error?.responseMeta?.body?.message || error?.message || fallbackMessage;
    showAlert(\`\${fallbackMessage}: \${message}\`, 'error');
  }
};`,
    JS_RunMonitor: readText('jsobjects/JS_RunMonitor.js'),
  },
  P50_Stability_Dashboard: {
    JS_AppShell: `export default {
  isAdmin() {
    return ['admin', 'owner', 'ops'].includes(appsmith.store.activeRole);
  },

  requireAdmin() {
    if (this.isAdmin()) return true;
    showAlert('This operation requires an admin, owner, or ops role', 'warning');
    return false;
  },

  staleMinutes() {
    const parsed = Number(inpStaleMinutes.text);
    if (!Number.isFinite(parsed) || parsed <= 0) return 30;
    return Math.min(Math.floor(parsed), 1440);
  }
};`,
  },
  P60_Audit_Timeline: {
    JS_AppShell: `export default {
  dataRows(queryData) {
    if (Array.isArray(queryData)) return queryData;
    if (Array.isArray(queryData?.data)) return queryData.data;
    return [];
  },

  auditTimelineRows() {
    const auditLogs = this.dataRows(qAuditLogs.data).map((event) => ({
      source: 'audit',
      timestamp: event.createdAt || event.created_at,
      type: event.action,
      summary: \`\${event.outcome || 'success'} \${event.resourceType || ''}\`,
      resourceId: event.resourceId || event.id,
    }));

    const workflowRuns = this.dataRows(qAuditWorkflowRuns.data).map((run) => ({
      source: 'workflow_run',
      timestamp: run.createdAt || run.created_at,
      type: run.workflowDefinition?.code || run.workflow_definition?.code || run.status,
      summary: \`Run \${run.status}\`,
      resourceId: run.id,
    }));

    return [...auditLogs, ...workflowRuns].sort((a, b) =>
      String(b.timestamp || '').localeCompare(String(a.timestamp || '')),
    );
  }
};`,
  },
};

function buildRequestBody(query) {
  if (!query.bodyTemplate) return undefined;
  return `{{ JSON.stringify(${objectToJs(query.bodyTemplate)}) }}`;
}

function objectToJs(value) {
  if (Array.isArray(value)) return `[${value.map(objectToJs).join(', ')}]`;
  if (value && typeof value === 'object') {
    return `({ ${Object.entries(value)
      .map(([key, item]) => `${JSON.stringify(key)}: ${objectToJs(item)}`)
      .join(', ')} })`;
  }
  if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
    return value.slice(2, -2).trim();
  }
  return JSON.stringify(value);
}

function actionForQuery(pageName, queryName) {
  const query = queryByName[queryName];
  const body = buildRequestBody(query);
  const action = {
    name: query.name,
    datasource: {
      name: 'RecallHubAPI',
      pluginId: 'restapi-plugin',
      messages: [],
      isAutoGenerated: false,
      deleted: false,
      policyMap: {},
      policies: [],
      userPermissions: [],
    },
    pageId: pageName,
    actionConfiguration: {
      timeoutInMillisecond: 20000,
      paginationType: 'NONE',
      path: query.path,
      httpMethod: query.method,
      headers: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer {{appsmith.store.token}}' },
      ],
      queryParameters: [],
      encodeParamsToggle: true,
      body: body || '',
      selfReferencingDataPaths: [],
    },
    executeOnLoad: ['GET'].includes(query.method),
    runBehaviour: 'ON_PAGE_LOAD',
    dynamicBindingPathList: dynKeys(
      query.path.includes('{{') ? 'path' : undefined,
      'headers[1].value',
      body ? 'body' : undefined,
    ),
    isValid: true,
    invalids: [],
    messages: [],
    jsonPathKeys: [],
    userSetOnLoad: ['GET'].includes(query.method),
    confirmBeforeExecute: query.name === 'qStabilityReconcile',
    policyMap: {},
    userPermissions: [],
  };
  return {
    pluginType: 'API',
    pluginId: 'restapi-plugin',
    unpublishedAction: action,
    publishedAction: { ...action },
    gitSyncId: id('git'),
    id: `${pageName}_${query.name}`,
    deleted: false,
  };
}

function collectionForJs(pageName, name, body) {
  const collection = {
    name,
    pageId: pageName,
    pluginId: 'js-plugin',
    pluginType: 'JS',
    actions: [],
    archivedActions: [],
    body,
    variables: [],
    userPermissions: [],
  };
  return {
    unpublishedCollection: collection,
    publishedCollection: { ...collection },
    gitSyncId: id('git'),
    id: `${pageName}_${name}`,
    deleted: false,
  };
}

function extractJsActions(body) {
  const actions = [];
  const regex = /^\s*(async\s+)?([A-Za-z_$][\w$]*)\s*\((.*)\)\s*\{/gm;
  let match;
  while ((match = regex.exec(body))) {
    const asyncPrefix = match[1] || '';
    const name = match[2];
    if (['if', 'for', 'while', 'switch', 'catch', 'function'].includes(name)) continue;
    const args = match[3].trim();
    const openIndex = body.indexOf('{', match.index + match[0].length - 1);
    let depth = 0;
    let endIndex = openIndex;
    for (; endIndex < body.length; endIndex += 1) {
      const ch = body[endIndex];
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
      if (depth === 0) break;
    }
    const fnBody = body.slice(openIndex, endIndex + 1);
    actions.push({
      name,
      args,
      body: `${asyncPrefix}(${args}) => ${fnBody}`,
    });
  }
  return actions;
}

function actionForJsMethod(pageName, objectName, method) {
  const action = {
    name: method.name,
    fullyQualifiedName: `${objectName}.${method.name}`,
    datasource: {
      name: 'UNUSED_DATASOURCE',
      pluginId: 'js-plugin',
      messages: [],
      isAutoGenerated: false,
      deleted: false,
      policyMap: {},
      policies: [],
      userPermissions: [],
    },
    pageId: pageName,
    collectionId: `${pageName}_${objectName}`,
    actionConfiguration: {
      timeoutInMillisecond: 10000,
      paginationType: 'NONE',
      encodeParamsToggle: true,
      body: method.body,
      selfReferencingDataPaths: [],
      jsArguments: method.args
        ? method.args.split(',').map((arg) => ({ name: arg.trim(), value: '' }))
        : [],
    },
    executeOnLoad: false,
    runBehaviour: 'MANUAL',
    dynamicBindingPathList: dynKeys('body'),
    isValid: true,
    invalids: [],
    messages: [],
    jsonPathKeys: [method.body],
    userSetOnLoad: false,
    confirmBeforeExecute: false,
    policyMap: {},
    userPermissions: [],
  };
  return {
    pluginType: 'JS',
    pluginId: 'js-plugin',
    unpublishedAction: action,
    publishedAction: { ...action },
    gitSyncId: id('git'),
    id: `${pageName}_${objectName}.${method.name}`,
    deleted: false,
  };
}

const pageList = pageDefs.map((page) =>
  makePage(page.name, pageWidgets[page.name], {
    onLoadActions: (pageQueries[page.name] || [])
      .filter((queryName) => queryByName[queryName]?.method === 'GET')
      .map((queryName) => [{ name: queryName, collectionId: null }]),
  }),
);

const queryActionList = Object.entries(pageQueries).flatMap(([pageName, queryNames]) =>
  queryNames.map((queryName) => actionForQuery(pageName, queryName)),
);

const jsActionList = Object.entries(jsBodies).flatMap(([pageName, objects]) =>
  Object.entries(objects).flatMap(([objectName, body]) =>
    extractJsActions(body).map((method) => actionForJsMethod(pageName, objectName, method)),
  ),
);

const actionList = [...queryActionList, ...jsActionList];

const actionCollectionList = Object.entries(jsBodies).flatMap(([pageName, objects]) =>
  Object.entries(objects).map(([name, body]) => collectionForJs(pageName, name, body)),
);

const exportedApplication = {
  name: 'RecallHub Control Plane',
  isPublic: false,
  pages: pageDefs.map((page) => ({ id: page.name, isDefault: Boolean(page.isDefault) })),
  viewMode: false,
  appIsExample: false,
  unreadCommentThreads: 0,
  unpublishedApplicationDetail: {
    appPositioning: { type: 'FIXED' },
    themeSetting: { sizing: 1, density: 1, appMaxWidth: 'LARGE' },
  },
  publishedApplicationDetail: {
    appPositioning: { type: 'FIXED' },
    themeSetting: { sizing: 1, density: 1, appMaxWidth: 'LARGE' },
  },
  color: '#E9F5FF',
  icon: 'memory',
  slug: 'recallhub-control-plane',
  unpublishedAppLayout: { type: 'FLUID' },
  publishedAppLayout: { type: 'FLUID' },
  unpublishedCustomJSLibs: [],
  publishedCustomJSLibs: [],
  evaluationVersion: 2,
  applicationVersion: 2,
  collapseInvisibleWidgets: true,
  isManualUpdate: false,
  forkedFromTemplateTitle: 'RecallHub Control Plane',
  deleted: false,
};

const app = {
  artifactJsonType: 'APPLICATION',
  serverSchemaVersion: 12,
  clientSchemaVersion: 2,
  exportedApplication,
  datasourceList: [
    {
      name: 'RecallHubAPI',
      pluginId: 'restapi-plugin',
      datasourceConfiguration: {
        url: "{{appsmith.store.apiBaseUrl || 'http://api:3000/api/v1'}}",
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{appsmith.store.token}}' },
        ],
        authentication: { authenticationType: 'NONE' },
        connection: { mode: 'READ_WRITE', ssl: { authType: 'DEFAULT' } },
      },
      messages: [],
      isAutoGenerated: false,
      isTemplate: false,
      gitSyncId: id('git'),
      deleted: false,
    },
  ],
  pageList,
  actionList,
  actionCollectionList,
  customJSLibList: [],
  editModeTheme: null,
  publishedTheme: null,
};

writeFileSync(OUT, `${JSON.stringify(app, null, 2)}\n`);
console.log(`Generated ${OUT}`);
