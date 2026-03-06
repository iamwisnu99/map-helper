/**
 * Auth Helper for Supabase Session Management
 * Handles token refresh and session retrieval
 */

const AuthHelper = {
    async getSession() {
        return new Promise((resolve) => {
            StorageHelper.get(['supabase_session'], async (result) => {
                let session = result.supabase_session;
                if (!session) {
                    resolve(null);
                    return;
                }

                const now = Math.floor(Date.now() / 1000);
                const isExpired = !session.expires_at || session.expires_at <= (now + 600); // 10 min buffer

                if (isExpired && session.refresh_token) {
                    console.log("[AuthHelper] Token expiring, refreshing...");
                    try {
                        const response = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                            method: 'POST',
                            headers: {
                                'apikey': CONFIG.SUPABASE_ANON_KEY,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ refresh_token: session.refresh_token })
                        });

                        if (response.ok) {
                            const newData = await response.json();
                            StorageHelper.set({ 'supabase_session': newData }, () => {
                                resolve(newData);
                            });
                        } else {
                            const errorData = await response.json();
                            if (errorData.error === 'invalid_grant' || errorData.message?.includes('expired')) {
                                StorageHelper.remove(['supabase_session'], () => resolve(null));
                            } else {
                                resolve(session);
                            }
                        }
                    } catch (e) {
                        resolve(session);
                    }
                } else {
                    resolve(session);
                }
            });
        });
    }
};
