import * as vscode from 'vscode';

// Unicode bold character mapping for bold-unicode style
const BOLD_MAP: Record<string, string> = {};
(function initBoldMap() {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const boldUpper = '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭';
    const boldLower = '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇';
    const boldDigits = '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵';

    const boldUpperArr = [...boldUpper];
    const boldLowerArr = [...boldLower];
    const boldDigitsArr = [...boldDigits];

    for (let i = 0; i < 26; i++) {
        BOLD_MAP[upper[i]] = boldUpperArr[i];
        BOLD_MAP[lower[i]] = boldLowerArr[i];
    }
    for (let i = 0; i < 10; i++) {
        BOLD_MAP[digits[i]] = boldDigitsArr[i];
    }
})();

function toBoldUnicode(text: string): string {
    return [...text].map(ch => BOLD_MAP[ch] ?? ch).join('');
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

function isValidHexColor(value: string): boolean {
    return HEX_COLOR_RE.test(value);
}

let statusBarItem: vscode.StatusBarItem | undefined;

// Keys we manage inside workbench.colorCustomizations
const MANAGED_KEYS = ['statusBar.background', 'statusBar.foreground'] as const;

/**
 * Apply status bar background/foreground color via workbench.colorCustomizations.
 */
async function applyStatusBarColor(): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('vfrenzy');
    const barColor = cfg.get<string>('statusBarColor', '').trim();
    const fontColor = cfg.get<string>('statusBarFontColor', '').trim();

    const wbConfig = vscode.workspace.getConfiguration('workbench');
    const bgKeys = ['statusBar.background', 'statusBar.noFolderBackground', 'statusBar.debuggingBackground'];
    const fgKeys = ['statusBar.foreground', 'statusBar.noFolderForeground', 'statusBar.debuggingForeground'];

    // Use inspect() to get per-target values so we don't bleed across targets
    const inspected = wbConfig.inspect<Record<string, string>>('colorCustomizations');
    const writeTarget = vscode.workspace.workspaceFolders
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;

    const targetsToProcess: [vscode.ConfigurationTarget, Record<string, string>][] = [
        [vscode.ConfigurationTarget.Global, { ...(inspected?.globalValue || {}) }],
    ];
    if (vscode.workspace.workspaceFolders) {
        targetsToProcess.push([vscode.ConfigurationTarget.Workspace, { ...(inspected?.workspaceValue || {}) }]);
    }

    for (const [target, existing] of targetsToProcess) {
        for (const key of bgKeys) {
            if (barColor && isValidHexColor(barColor) && target === writeTarget) {
                existing[key] = barColor;
            } else {
                delete existing[key];
            }
        }
        for (const key of fgKeys) {
            if (fontColor && isValidHexColor(fontColor) && target === writeTarget) {
                existing[key] = fontColor;
            } else {
                delete existing[key];
            }
        }
        try {
            const value = Object.keys(existing).length > 0 ? existing : undefined;
            await wbConfig.update('colorCustomizations', value, target);
        } catch { /* ignore non-writable targets */ }
    }
}

/**
 * Create or update the workspace-name status bar badge.
 */
function updateWorkspaceBadge(): void {
    const cfg = vscode.workspace.getConfiguration('vfrenzy');
    const show = cfg.get<boolean>('showWorkspaceName', true);

    if (!show) {
        statusBarItem?.hide();
        return;
    }

    if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(
            'vfrenzy.workspaceName',
            vscode.StatusBarAlignment.Left,
            99
        );
        statusBarItem.name = 'VFrenzy Workspace Name';
        statusBarItem.tooltip = 'Click to customize (VFrenzy)';
        statusBarItem.command = 'vfrenzy.showMenu';
    }

    // Determine workspace name
    const customName = cfg.get<string>('customName', '').trim();
    let wsName = customName || (vscode.workspace.name ?? 'No Workspace');

    // Apply style
    const style = cfg.get<string>('workspaceNameStyle', 'normal');
    switch (style) {
        case 'uppercase':
            wsName = wsName.toUpperCase();
            break;
        case 'bold-unicode':
            wsName = toBoldUnicode(wsName);
            break;
    }

    // Apply badge decoration pattern
    const decoration = cfg.get<string>('workspaceNameBadgeDecoration', 'none');
    wsName = applyBadgeDecoration(wsName, decoration);

    // Determine prefix: named icon takes precedence over the freeform prefix string
    const icon = cfg.get<string>('workspaceNameIcon', '').trim();
    const prefix = icon ? `$(${icon}) ` : cfg.get<string>('workspaceNamePrefix', '$(window) ');
    statusBarItem.text = `${prefix}${wsName}`;

    // Badge text color
    const nameColor = cfg.get<string>('workspaceNameColor', '').trim();
    if (nameColor && isValidHexColor(nameColor)) {
        statusBarItem.color = nameColor;
    } else {
        statusBarItem.color = undefined;
    }

    statusBarItem.show();
}

// ── Badge decoration patterns ────────────────────────────────────────────────

function applyBadgeDecoration(name: string, decoration: string): string {
    switch (decoration) {
        case 'brackets':      return `[ ${name} ]`;
        case 'angle':         return `‹ ${name} ›`;
        case 'double-angle':  return `« ${name} »`;
        case 'braces':        return `{ ${name} }`;
        case 'chevrons':      return `» ${name} «`;
        case 'dots':          return `• ${name} •`;
        case 'stars':         return `★ ${name} ★`;
        case 'arrows':        return `→ ${name} ←`;
        case 'diagonal':      return `╱ ${name} ╲`;
        case 'gradient':      return `░▒▓ ${name} ▓▒░`;
        case 'pipes':         return `┃ ${name} ┃`;
        case 'equals':        return `══ ${name} ══`;
        case 'wave':          return `〜 ${name} 〜`;
        default:              return name;
    }
}

// ── Icon presets ─────────────────────────────────────────────────────────────

interface IconPreset {
    label: string;
    description: string;
    icon: string;
}

const ICON_PRESETS: IconPreset[] = [
    { label: '$(window) Window',           description: 'window',         icon: 'window' },
    { label: '$(folder) Folder',           description: 'folder',         icon: 'folder' },
    { label: '$(folder-opened) Folder Opened', description: 'folder-opened', icon: 'folder-opened' },
    { label: '$(home) Home',               description: 'home',           icon: 'home' },
    { label: '$(star-full) Star',          description: 'star-full',      icon: 'star-full' },
    { label: '$(heart) Heart',             description: 'heart',          icon: 'heart' },
    { label: '$(code) Code',               description: 'code',           icon: 'code' },
    { label: '$(terminal) Terminal',       description: 'terminal',       icon: 'terminal' },
    { label: '$(git-branch) Branch',       description: 'git-branch',     icon: 'git-branch' },
    { label: '$(cloud) Cloud',             description: 'cloud',          icon: 'cloud' },
    { label: '$(database) Database',       description: 'database',       icon: 'database' },
    { label: '$(server) Server',           description: 'server',         icon: 'server' },
    { label: '$(shield) Shield',           description: 'shield',         icon: 'shield' },
    { label: '$(vm) VM',                   description: 'vm',             icon: 'vm' },
    { label: '$(globe) Globe',             description: 'globe',          icon: 'globe' },
    { label: '$(rocket) Rocket',           description: 'rocket',         icon: 'rocket' },
    { label: '$(beaker) Beaker',           description: 'beaker',         icon: 'beaker' },
    { label: '$(bug) Bug',                 description: 'bug',            icon: 'bug' },
    { label: '$(lock) Lock',               description: 'lock',           icon: 'lock' },
    { label: '$(settings-gear) Settings',  description: 'settings-gear',  icon: 'settings-gear' },
    { label: '$(bookmark) Bookmark',       description: 'bookmark',       icon: 'bookmark' },
    { label: '$(flame) Flame',             description: 'flame',          icon: 'flame' },
    { label: '$(zap) Zap',                description: 'zap',            icon: 'zap' },
];

async function setCustomNameCommand(): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('vfrenzy');
    const current = cfg.get<string>('customName', '').trim();

    const input = await vscode.window.showInputBox({
        title: 'VFrenzy: Set Custom Workspace Name',
        prompt: 'Enter a custom name to display instead of the workspace name. Leave blank to use the workspace name.',
        value: current,
        placeHolder: vscode.workspace.name ?? 'My Project',
    });

    if (input === undefined) { return; }

    const target = vscode.workspace.workspaceFolders
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;

    const newName = input.trim() || undefined;
    await cfg.update('customName', newName, target);
    vscode.window.showInformationMessage(
        newName
            ? `VFrenzy: Custom name set to "${newName}".`
            : 'VFrenzy: Custom name cleared — using workspace name.'
    );
}

async function setIconCommand(): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('vfrenzy');
    const currentIcon = cfg.get<string>('workspaceNameIcon', '').trim();

    const items: vscode.QuickPickItem[] = [
        ...ICON_PRESETS.map(p => ({
            label: p.label,
            description: p.icon,
            detail: currentIcon === p.icon ? '$(check) Current' : undefined,
        })),
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        { label: '$(pencil) Custom icon...', description: 'Enter any codicon name' },
        { label: '$(discard) No icon', description: 'Fall back to workspaceNamePrefix setting' },
    ];

    const pick = await vscode.window.showQuickPick(items, {
        title: 'VFrenzy: Set Workspace Name Icon',
        placeHolder: currentIcon ? `Current: ${currentIcon}` : 'Pick an icon',
    });

    if (!pick) { return; }

    let chosenIcon: string | undefined;

    if (pick.label === '$(discard) No icon') {
        chosenIcon = undefined;
    } else if (pick.label === '$(pencil) Custom icon...') {
        const input = await vscode.window.showInputBox({
            title: 'VFrenzy: Enter Codicon Name',
            prompt: 'Enter a codicon name without $() — e.g. folder, star-full, rocket',
            value: currentIcon,
            placeHolder: 'folder',
        });
        if (input === undefined) { return; }
        chosenIcon = input.trim() || undefined;
    } else {
        const preset = ICON_PRESETS.find(p => p.description === pick.description);
        chosenIcon = preset?.icon;
    }

    const target = vscode.workspace.workspaceFolders
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;

    await cfg.update('workspaceNameIcon', chosenIcon, target);
    vscode.window.showInformationMessage(
        chosenIcon
            ? `VFrenzy: Workspace icon set to $(${chosenIcon})`
            : 'VFrenzy: Icon removed — using workspaceNamePrefix setting.'
    );
}

// ── Color presets ─────────────────────────────────────────────────────────────

interface ColorPreset {
    label: string;
    description: string;
    color: string;
}

const COLOR_PRESETS: ColorPreset[] = [
    { label: '$(circle-filled) Blue',        description: '#007ACC', color: '#007ACC' },
    { label: '$(circle-filled) Dark Blue',   description: '#1B2A4A', color: '#1B2A4A' },
    { label: '$(circle-filled) Green',       description: '#16825D', color: '#16825D' },
    { label: '$(circle-filled) Dark Green',  description: '#2E4A1B', color: '#2E4A1B' },
    { label: '$(circle-filled) Red',         description: '#C72E2E', color: '#C72E2E' },
    { label: '$(circle-filled) Dark Red',    description: '#4A1B1B', color: '#4A1B1B' },
    { label: '$(circle-filled) Purple',      description: '#6A0DAD', color: '#6A0DAD' },
    { label: '$(circle-filled) Orange',      description: '#CC6600', color: '#CC6600' },
    { label: '$(circle-filled) Teal',        description: '#008080', color: '#008080' },
    { label: '$(circle-filled) Pink',        description: '#C7254E', color: '#C7254E' },
    { label: '$(circle-filled) Yellow',      description: '#B8860B', color: '#B8860B' },
    { label: '$(circle-filled) Slate',       description: '#4A5568', color: '#4A5568' },
];

const FONT_COLOR_PRESETS: ColorPreset[] = [
    { label: '$(circle-filled) White',        description: '#FFFFFF', color: '#FFFFFF' },
    { label: '$(circle-filled) Light Grey',   description: '#CCCCCC', color: '#CCCCCC' },
    { label: '$(circle-filled) Silver',       description: '#C0C0C0', color: '#C0C0C0' },
    { label: '$(circle-filled) Gold',         description: '#FFD700', color: '#FFD700' },
    { label: '$(circle-filled) Yellow',       description: '#FFFF00', color: '#FFFF00' },
    { label: '$(circle-filled) Lime',         description: '#00FF00', color: '#00FF00' },
    { label: '$(circle-filled) Cyan',         description: '#00FFFF', color: '#00FFFF' },
    { label: '$(circle-filled) Sky Blue',     description: '#87CEEB', color: '#87CEEB' },
    { label: '$(circle-filled) Light Pink',   description: '#FFB6C1', color: '#FFB6C1' },
    { label: '$(circle-filled) Salmon',       description: '#FA8072', color: '#FA8072' },
    { label: '$(circle-filled) Orange',       description: '#FFA500', color: '#FFA500' },
    { label: '$(circle-filled) Black',        description: '#000000', color: '#000000' },
];

/**
 * Show a font color picker with presets + custom hex entry, then apply.
 */
async function setFontColorCommand(): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('vfrenzy');
    const currentColor = cfg.get<string>('statusBarFontColor', '');

    const items: vscode.QuickPickItem[] = [
        ...FONT_COLOR_PRESETS.map(p => ({
            label: p.label,
            description: p.description,
            detail: currentColor === p.color ? '$(check) Current' : undefined,
        })),
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        { label: '$(pencil) Custom hex color...', description: 'Enter any hex color' },
        { label: '$(discard) Clear font color', description: 'Inherit from theme' },
    ];

    const pick = await vscode.window.showQuickPick(items, {
        title: 'VFrenzy: Set Status Bar Font Color',
        placeHolder: currentColor ? `Current: ${currentColor}` : 'Pick a font color',
    });

    if (!pick) { return; }

    let chosenColor: string | undefined;

    if (pick.label === '$(discard) Clear font color') {
        chosenColor = undefined;
    } else if (pick.label === '$(pencil) Custom hex color...') {
        const input = await vscode.window.showInputBox({
            title: 'VFrenzy: Enter Custom Font Hex Color',
            prompt: 'Enter a hex color (e.g. #FFFFFF)',
            value: currentColor,
            validateInput: (value) => {
                const v = value.trim();
                if (v === '') { return null; }
                return isValidHexColor(v) ? null : 'Please enter a valid hex color (e.g. #FFFFFF or #FFF)';
            }
        });
        if (input === undefined) { return; }
        chosenColor = input.trim() || undefined;
    } else {
        const preset = FONT_COLOR_PRESETS.find(p => p.description === pick.description);
        chosenColor = preset?.color;
    }

    const target = vscode.workspace.workspaceFolders
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;

    await cfg.update('statusBarFontColor', chosenColor, target);
}

/**
 * Show a color picker with presets + custom hex entry, then apply.
 */
async function setColorCommand(): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('vfrenzy');
    const currentColor = cfg.get<string>('statusBarColor', '');

    const items: vscode.QuickPickItem[] = [
        ...COLOR_PRESETS.map(p => ({
            label: p.label,
            description: p.description,
            detail: currentColor === p.color ? '$(check) Current' : undefined,
        })),
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        { label: '$(pencil) Custom hex color...', description: 'Enter any hex color' },
        { label: '$(discard) Clear color', description: 'Reset to VS Code default' },
    ];

    const pick = await vscode.window.showQuickPick(items, {
        title: 'VFrenzy: Set Status Bar Color',
        placeHolder: currentColor ? `Current: ${currentColor}` : 'Pick a color',
    });

    if (!pick) { return; }

    let chosenColor: string | undefined;

    if (pick.label === '$(discard) Clear color') {
        chosenColor = undefined;
    } else if (pick.label === '$(pencil) Custom hex color...') {
        const input = await vscode.window.showInputBox({
            title: 'VFrenzy: Enter Custom Hex Color',
            prompt: 'Enter a hex color (e.g. #007ACC)',
            value: currentColor,
            validateInput: (value) => {
                const v = value.trim();
                if (v === '') { return null; }
                return isValidHexColor(v) ? null : 'Please enter a valid hex color (e.g. #007ACC or #09F)';
            }
        });
        if (input === undefined) { return; }
        chosenColor = input.trim() || undefined;
    } else {
        const preset = COLOR_PRESETS.find(p => p.description === pick.description);
        chosenColor = preset?.color;
    }

    const target = vscode.workspace.workspaceFolders
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;

    await cfg.update('statusBarColor', chosenColor, target);
}

/**
 * Reset VFrenzy colors to defaults.
 */
async function resetColorCommand(): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('vfrenzy');
    const wbConfig = vscode.workspace.getConfiguration('workbench');

    const keysToRemove = [
        'statusBar.background', 'statusBar.foreground',
        'statusBar.noFolderBackground', 'statusBar.noFolderForeground',
        'statusBar.debuggingBackground', 'statusBar.debuggingForeground',
    ];

    // Use inspect() to get per-target values so clearing one target doesn't
    // bleed the other target's colors into it
    const inspected = wbConfig.inspect<Record<string, string>>('colorCustomizations');

    const targets: [vscode.ConfigurationTarget, Record<string, string>][] = [
        [vscode.ConfigurationTarget.Global, { ...(inspected?.globalValue || {}) }],
    ];
    if (vscode.workspace.workspaceFolders) {
        targets.push([vscode.ConfigurationTarget.Workspace, { ...(inspected?.workspaceValue || {}) }]);
    }

    for (const [target, existing] of targets) {
        try {
            await cfg.update('statusBarColor', undefined, target);
            await cfg.update('statusBarFontColor', undefined, target);

            for (const key of keysToRemove) {
                delete existing[key];
            }
            const value = Object.keys(existing).length > 0 ? existing : undefined;
            await wbConfig.update('colorCustomizations', value, target);
        } catch {
            // Workspace target may not be writable in some contexts — ignore
        }
    }

    vscode.window.showInformationMessage('VFrenzy: Status bar color reset to default.');
}

/**
 * Main menu shown when the user clicks the workspace name badge.
 */
async function showMenuCommand(): Promise<void> {
    type Action = 'customName' | 'color' | 'fontColor' | 'icon' | 'style' | 'decoration' | 'reset';
    interface MenuItem extends vscode.QuickPickItem { action?: Action; }

    const cfg = vscode.workspace.getConfiguration('vfrenzy');
    const currentColor = cfg.get<string>('statusBarColor', '');
    const currentIcon  = cfg.get<string>('workspaceNameIcon', '');
    const currentDeco  = cfg.get<string>('workspaceNameBadgeDecoration', 'none');
    const currentStyle = cfg.get<string>('workspaceNameStyle', 'normal');

    const currentCustomName = cfg.get<string>('customName', '').trim();

    const items: MenuItem[] = [
        {
            label: '$(tag) Custom workspace name',
            description: currentCustomName || '(using workspace name)',
            detail: 'Override the workspace name shown in the badge',
            action: 'customName',
        },
        {
            label: '$(symbol-color) Status bar color',
            description: currentColor || 'default',
            detail: 'Set the status bar background color',
            action: 'color',
        },
        {
            label: '$(paintcan) Status bar font color',
            description: cfg.get<string>('statusBarFontColor', '') || 'default',
            detail: 'Set the status bar foreground/text color',
            action: 'fontColor',
        },
        {
            label: `$(${currentIcon || 'window'}) Workspace icon`,
            description: currentIcon || 'window (default)',
            detail: 'Choose the icon shown before the workspace name',
            action: 'icon',
        },
        {
            label: '$(text-size) Workspace name style',
            description: currentStyle,
            detail: 'normal / uppercase / bold-unicode',
            action: 'style',
        },
        {
            label: '$(symbol-misc) Badge decoration pattern',
            description: currentDeco,
            detail: 'Surround the workspace name with a Unicode pattern',
            action: 'decoration',
        },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        {
            label: '$(discard) Reset all VFrenzy settings',
            description: 'Remove colors and restore defaults',
            action: 'reset',
        },
    ];

    const pick = await vscode.window.showQuickPick(items, {
        title: 'VFrenzy: Customize workspace badge',
        placeHolder: 'Choose what to change',
    });

    if (!pick?.action) { return; }

    const target = vscode.workspace.workspaceFolders
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;

    switch (pick.action) {
        case 'customName': return setCustomNameCommand();
        case 'color':      return setColorCommand();
        case 'fontColor':  return setFontColorCommand();
        case 'icon':       return setIconCommand();
        case 'reset':      return resetColorCommand();

        case 'style': {
            const stylePick = await vscode.window.showQuickPick(
                [
                    { label: 'normal',       description: 'Display as-is',               picked: currentStyle === 'normal' },
                    { label: 'uppercase',    description: 'UPPERCASE',                   picked: currentStyle === 'uppercase' },
                    { label: 'bold-unicode', description: '𝗕𝗼𝗹𝗱 𝗨𝗻𝗶𝗰𝗼𝗱𝗲', picked: currentStyle === 'bold-unicode' },
                ],
                { title: 'VFrenzy: Workspace Name Style' }
            );
            if (!stylePick) { return; }
            await cfg.update('workspaceNameStyle', stylePick.label, target);
            break;
        }

        case 'decoration': {
            const DECO_OPTIONS = [
                { label: 'none',         description: 'No decoration' },
                { label: 'brackets',     description: '[ WorkspaceName ]' },
                { label: 'angle',        description: '‹ WorkspaceName ›' },
                { label: 'double-angle', description: '« WorkspaceName »' },
                { label: 'braces',       description: '{ WorkspaceName }' },
                { label: 'chevrons',     description: '» WorkspaceName «' },
                { label: 'dots',         description: '• WorkspaceName •' },
                { label: 'stars',        description: '★ WorkspaceName ★' },
                { label: 'arrows',       description: '→ WorkspaceName ←' },
                { label: 'diagonal',     description: '╱ WorkspaceName ╲' },
                { label: 'gradient',     description: '░▒▓ WorkspaceName ▓▒░' },
                { label: 'pipes',        description: '┃ WorkspaceName ┃' },
                { label: 'equals',       description: '══ WorkspaceName ══' },
                { label: 'wave',         description: '〜 WorkspaceName 〜' },
            ].map(d => ({ ...d, picked: d.label === currentDeco }));

            const decoPick = await vscode.window.showQuickPick(DECO_OPTIONS, {
                title: 'VFrenzy: Badge Decoration Pattern',
            });
            if (!decoPick) { return; }
            await cfg.update('workspaceNameBadgeDecoration', decoPick.label, target);
            break;
        }
    }
}

export function activate(context: vscode.ExtensionContext): void {
    // Apply on startup
    applyStatusBarColor();
    updateWorkspaceBadge();

    // React to config changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('vfrenzy.statusBarColor') ||
                e.affectsConfiguration('vfrenzy.statusBarFontColor')) {
                applyStatusBarColor();
            }
            if (e.affectsConfiguration('vfrenzy.customName') ||
                e.affectsConfiguration('vfrenzy.showWorkspaceName') ||
                e.affectsConfiguration('vfrenzy.workspaceNameColor') ||
                e.affectsConfiguration('vfrenzy.workspaceNameStyle') ||
                e.affectsConfiguration('vfrenzy.workspaceNamePrefix') ||
                e.affectsConfiguration('vfrenzy.workspaceNameIcon') ||
                e.affectsConfiguration('vfrenzy.workspaceNameBadgeDecoration')) {
                updateWorkspaceBadge();
            }
        })
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('vfrenzy.showMenu', showMenuCommand),
        vscode.commands.registerCommand('vfrenzy.setCustomName', setCustomNameCommand),
        vscode.commands.registerCommand('vfrenzy.setColor', setColorCommand),
        vscode.commands.registerCommand('vfrenzy.resetColor', resetColorCommand),
        vscode.commands.registerCommand('vfrenzy.setIcon', setIconCommand)
    );

    // Dispose status bar item on deactivation
    if (statusBarItem) {
        context.subscriptions.push(statusBarItem);
    }
}

export function deactivate(): void {
    statusBarItem?.dispose();
    statusBarItem = undefined;
}
