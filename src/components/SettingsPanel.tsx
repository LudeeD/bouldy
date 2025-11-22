import { FolderOpen } from 'lucide-react';
import { themes } from '../themes';

interface SettingsPanelProps {
    currentTheme: string;
    onThemeChange: (theme: string) => void;
    vaultPath: string | null;
    onChangeVault: () => void;
}

export default function SettingsPanel({ currentTheme, onThemeChange, vaultPath, onChangeVault }: SettingsPanelProps) {
    return (
        <div className="p-6 max-w-2xl mx-auto w-full">
            <h1 className="text-2xl font-bold mb-8 text-text">Settings</h1>

            {/* Theme Section */}
            <section className="mb-10">
                <h2 className="text-lg font-semibold mb-4 text-text">Appearance</h2>
                <div className="bg-bg rounded-lg border border-border p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Object.entries(themes).map(([key, theme]) => (
                            <button
                                key={key}
                                onClick={() => onThemeChange(key)}
                                className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${currentTheme === key
                                    ? 'border-primary bg-highlight text-primary'
                                    : 'border-transparent hover:bg-bg-light text-text-muted'
                                    }`}
                            >
                                <div
                                    className="w-12 h-12 rounded-full border border-border-muted shadow-sm"
                                    style={{
                                        background: theme.previewColors.bg,
                                        backgroundImage: `linear-gradient(135deg, ${theme.previewColors.primary} 0%, ${theme.previewColors.bg} 50%)`
                                    }}
                                />
                                <span className="font-medium">{theme.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Vault Section */}
            <section>
                <h2 className="text-lg font-semibold mb-4 text-text">Vault</h2>
                <div className="bg-bg rounded-lg border border-border p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-highlight rounded-full text-primary">
                            <FolderOpen size={24} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-sm text-text-muted mb-1">Current Vault</div>
                            <div className="font-mono text-sm truncate text-text bg-bg-dark px-3 py-2 rounded border border-border">
                                {vaultPath}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={onChangeVault}
                            className="px-4 py-2 bg-bg-light border border-border-muted hover:bg-bg text-text rounded-md text-sm font-medium transition-colors"
                        >
                            Change Vault...
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
