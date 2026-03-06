// Global Configuration for MAP Helper
const _dec = (s) => {
    try { return atob(s); } catch (e) { return s; }
};

const CONFIG = {
    // These will be replaced by Netlify Build if configured, or fall back to encoded strings
    _u: window?.env?.SUPABASE_URL || "__SUPABASE_URL__" || "aHR0cHM6Ly9wZWh3a29hcHlwenpmYmRtaGp4YS5zdXBhYmFzZS5jbw==",
    _k: window?.env?.SUPABASE_ANON_KEY || "__SUPABASE_ANON_KEY__" || "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CbGFIZHJiMkZ3ZVhCNmVtWmlaRzFvYW5oaElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJeE16YzFPVEVzSW1WNGNDSTZNakE0TnpjeE16VTVNWDAuSEYwZGJIUDlDdlJrY3B4UkVnQlpqRlVRakpkc0t6d1RvSlhoQ2ZtT2VpMA==",

    get SUPABASE_URL() {
        const val = this._u;
        return (val.startsWith("__") || val.includes("http")) ? val : _dec(val);
    },
    get SUPABASE_ANON_KEY() {
        const val = this._k;
        return (val.startsWith("__") || val.length > 50) ? val : _dec(val);
    }
};

// Check if these are still placeholders (means they weren't replaced during build)
if (CONFIG.SUPABASE_URL === "__SUPABASE_URL__") {
    // Use the hardcoded encoded values as absolute fallback
    CONFIG._u = "aHR0cHM6Ly9wZWh3a29hcHlwenpmYmRtaGp4YS5zdXBhYmFzZS5jbw==";
}
if (CONFIG.SUPABASE_ANON_KEY === "__SUPABASE_ANON_KEY__") {
    CONFIG._k = "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CbGFIZHJiMkZ3ZVhCNmVtWmlaRzFvYW5oaElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJeE16YzFPVEVzSW1WNGNDSTZNakE0TnpjeE16VTVNWDAuSEYwZGJIUDlDdlJrY3B4UkVnQlpqRlVRakpkc0t6d1RvSlhoQ2ZtT2VpMA==";
}

if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
