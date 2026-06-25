/* =============================================
   settings.js — Backup and import/export settings
   ============================================= */

const Settings = {
  render() {
    const info = Storage.getBackupInfo();
    const lastSave = document.getElementById('settings-last-save');
    const lastBackup = document.getElementById('settings-last-backup');
    const warning = document.getElementById('backup-warning');

    if (lastSave) lastSave.textContent = info.lastSavedAt ? `${Utils.formatDateTime(info.lastSavedAt)} ✓` : '—';
    if (lastBackup) lastBackup.textContent = info.lastManualBackupAt ? `${Utils.formatDateTime(info.lastManualBackupAt)} 💾` : '—';
    if (warning) warning.hidden = !Storage.shouldShowBackupReminder();
  },
};
