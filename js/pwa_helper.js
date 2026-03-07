// pwa_helper.js - Handles PWA install logic specifically for Netlify hosting

let deferredPrompt;

// 1. Inject PWA Manifest dynamically if we are on Netlify
if (window.location.hostname.includes('netlify.app')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/pwa-manifest.json';
    document.head.appendChild(link);

    // 2. Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then((registration) => {
                console.log('SW registered for PWA installability:', registration.scope);
            }).catch((error) => {
                console.log('SW registration failed:', error);
            });
        });
    }
}

// 3. Listen for the install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Only operate if on netlify
    if (!window.location.hostname.includes('netlify.app')) {
        return;
    }

    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;

    // Show the custom install UI
    showInstallPromotion();
});

function showInstallPromotion() {
    // Don't duplicate
    if (document.getElementById('pwaInstallBanner')) {
        document.getElementById('pwaInstallBanner').style.display = 'flex';
        return;
    }

    const banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.style.position = 'fixed';
    banner.style.bottom = '30px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.width = '90%';
    banner.style.maxWidth = '400px';
    banner.style.background = 'rgba(255, 255, 255, 0.95)';
    banner.style.backdropFilter = 'blur(10px)';
    banner.style.border = '1px solid #10b981';
    banner.style.borderRadius = '16px';
    banner.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.1)';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.padding = '16px 20px';
    banner.style.gap = '16px';
    banner.style.zIndex = '9999';
    banner.style.animation = 'slideUpPwa 0.5s cubic-bezier(0.16, 1, 0.3, 1)';

    // Icon
    const icon = document.createElement('img');
    icon.src = '/assets/icon48.png';
    icon.style.width = '48px';
    icon.style.height = '48px';
    icon.style.borderRadius = '12px';
    banner.appendChild(icon);

    // Text Container
    const textContainer = document.createElement('div');
    textContainer.style.flex = '1';
    textContainer.innerHTML = `
        <div style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 16px; color: #0f172a; margin-bottom: 4px;">Install Aplikasi</div>
        <div style="font-family: 'Inter', sans-serif; font-size: 12px; color: #64748b; line-height: 1.4;">Tambahkan MAP Helper ke layar utama untuk akses lebih cepat.</div>
    `;
    banner.appendChild(textContainer);

    // Install Button
    const installBtn = document.createElement('button');
    installBtn.textContent = 'Install';
    installBtn.style.background = '#10b981';
    installBtn.style.color = '#fff';
    installBtn.style.border = 'none';
    installBtn.style.padding = '8px 20px';
    installBtn.style.borderRadius = '10px';
    installBtn.style.fontWeight = '600';
    installBtn.style.fontSize = '14px';
    installBtn.style.cursor = 'pointer';
    installBtn.style.transition = 'all 0.2s';
    installBtn.onmouseover = () => installBtn.style.transform = 'scale(1.05)';
    installBtn.onmouseout = () => installBtn.style.transform = 'scale(1)';

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            banner.style.display = 'none';
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
        }
    });
    banner.appendChild(installBtn);

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '4px';
    closeBtn.style.right = '8px';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.color = '#94a3b8';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => {
        banner.style.display = 'none';
    });
    banner.appendChild(closeBtn);

    // Keyframes
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes slideUpPwa {
            0% { transform: translate(-50%, 100px); opacity: 0; }
            100% { transform: translate(-50%, 0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(banner);
}
