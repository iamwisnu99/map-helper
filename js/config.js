// js/config.js
/**
 * Global Configuration for MAP Helper
 * Supports:
 * 1. Netlify Environment Variables (via window.env injection)
 * 2. Placeholder replacement (via sed during build)
 * 3. Base64 fallback (for local development/extension)
 */

(function () {
    const _dec = (s) => {
        try { return atob(s); } catch (e) { return s; }
    };

    // 1. Definisikan Nilai Mentah (Raw)
    const raw_u = window.env?.SUPABASE_URL || "__SUPABASE_URL__";
    const raw_k = window.env?.SUPABASE_ANON_KEY || "__SUPABASE_ANON_KEY__";

    // 2. Hardcoded Backups (Encoded)
    const backup_u = "aHR0cHM6Ly9wZWh3a29hcHlwenpmYmRtaGp4YS5zdXBhYmFzZS5jbw==";
    const backup_k = "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CbGFIZHJiMkZ3ZVhCNmVtWmlaRzFvYW5oaElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJeE16YzFPVEVzSW1WNGNDSTZNakE0TnpjeE16VTVNWDAuSEYwZGJIUDlDdlJrY3B4UkVnQlpqRlVRakpkc0t6d1RvSlhoQ2ZtT2VpMA==";

    // 3. Final Config Object
    const configObject = {
        get SUPABASE_URL() {
            // Jika masih placeholder atau string kosong, gunakan backup
            if (raw_u.startsWith("__") || !raw_u || raw_u === "undefined") {
                return _dec(backup_u);
            }
            return raw_u;
        },
        get SUPABASE_ANON_KEY() {
            if (raw_k.startsWith("__") || !raw_k || raw_k === "undefined") {
                return _dec(backup_k);
            }
            return raw_k;
        }
    };

    // 4. Export to Global window
    window.CONFIG = configObject;

    // Tambahan untuk module compatibility jika dibutuhkan
    if (typeof module !== 'undefined') {
        module.exports = configObject;
    }
})();
