document.addEventListener('DOMContentLoaded', async function () {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');
    const loginSpinner = document.getElementById('loginSpinner');
    const notification = document.getElementById('notification');
    const errorNotification = document.getElementById('errorNotification');
    const errorMsg = document.getElementById('errorMsg');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const togglePassword = document.getElementById('togglePassword');

    // 0. Update Greeting & Year
    const greetingText = document.getElementById('greetingText');
    const footerYear = document.getElementById('footerYear');
    const now = new Date();
    const hour = now.getHours();
    let greeting = "Selamat Datang!";

    if (hour >= 4 && hour < 11) greeting = "Selamat Pagi!";
    else if (hour >= 11 && hour < 15) greeting = "Selamat Siang!";
    else if (hour >= 15 && hour < 18) greeting = "Selamat Sore!";
    else greeting = "Selamat Malam!";

    if (greetingText) greetingText.textContent = greeting;
    if (footerYear) footerYear.textContent = now.getFullYear();

    // 1. Check existing session
    const session = await AuthHelper.getSession();
    if (session) {
        window.location.href = 'dashboard.html';
        return;
    }

    // 2. Toggle Password
    togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    // 3. Login Process
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        loginBtn.disabled = true;
        btnText.textContent = 'AUTHENTICATING...';
        loginSpinner.classList.remove('d-none');
        errorNotification.style.display = 'none';

        try {
            const response = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok) {
                StorageHelper.set({ 'supabase_session': data }, () => {
                    notification.style.display = 'block';
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
                });
            } else {
                throw new Error(data.error_description || data.message || "Gagal login!");
            }
        } catch (err) {
            errorMsg.textContent = err.message;
            errorNotification.style.display = 'block';
            loginBtn.disabled = false;
            btnText.textContent = 'MASUK KE PORTAL';
            loginSpinner.classList.add('d-none');
        }
    });
});
