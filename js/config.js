// js/config.js
const CONFIG = {
    // Netlify akan menginjeksi variabel ini jika tersedia saat runtime
    get SUPABASE_URL() {
        return window.env?.SUPABASE_URL || "__SUPABASE_URL__" || "aHR0cHM6Ly9wZWh3a29hcHlwenpmYmRtaGp4YS5zdXBhYmFzZS5jbw==";
    },
    get SUPABASE_ANON_KEY() {
        return window.env?.SUPABASE_ANON_KEY || "__SUPABASE_ANON_KEY__" || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Kunci cadangan Anda
    }
};

// Logika pembersihan otomatis jika masih berupa placeholder
const finalConfig = {
    _u: CONFIG.SUPABASE_URL,
    _k: CONFIG.SUPABASE_ANON_KEY,

    _dec(s) {
        try { return atob(s); } catch (e) { return s; }
    },

    get SUPABASE_URL() {
        // Jika isinya masih placeholder __...__ atau base64, kita dekode
        if (this._u.startsWith("__") || this._u.length < 30) {
            return this._dec("aHR0cHM6Ly9wZWh3a29hcHlwenpmYmRtaGp4YS5zdXBhYmFzZS5jbw==");
        }
        return this._u;
    },

    get SUPABASE_ANON_KEY() {
        if (this._k.startsWith("__") || this._k.length < 100) {
            return this._dec("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CbGFIZHJiMkZ3ZVhCNmVtWmlaRzFvYW5oaElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJeE16YzFPVEVzSW1WNGNDSTZNakE0TnpjeE16VTVNWDAuSEYwZGJIUDlDdlJrY3B4UkVnQlpqRlVRakpkc0t6d1RvSlhoQ2ZtT2VpMA==");
        }
        return this._k;
    }
};

// Gunakan finalConfig ke global
window.CONFIG = finalConfig;
