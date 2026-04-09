// ─────────────────────────────────────────────────────────────
//  Production-Grade Email Templates
//  Theme: Dark Obsidian × Deep Violet — luxury SaaS aesthetic
// ─────────────────────────────────────────────────────────────

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background-color: #0a0a0f;
    font-family: 'DM Sans', -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    color: #e2e2f0;
  }

  .wrapper {
    background: #0a0a0f;
    padding: 48px 20px;
    min-height: 100vh;
  }

  .card {
    max-width: 560px;
    margin: 0 auto;
    background: linear-gradient(160deg, #13101f 0%, #0d0b18 60%, #110f1e 100%);
    border-radius: 20px;
    border: 1px solid rgba(120, 80, 220, 0.18);
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.03),
      0 32px 80px rgba(0,0,0,0.7),
      0 0 120px rgba(100, 60, 200, 0.08);
  }

  .header-bar {
    height: 4px;
    background: linear-gradient(90deg, #4a1fa8 0%, #7c3aed 40%, #a855f7 70%, #c084fc 100%);
  }

  .header {
    padding: 44px 48px 36px;
    position: relative;
    overflow: hidden;
  }

  .header::before {
    content: '';
    position: absolute;
    top: -80px; right: -80px;
    width: 280px; height: 280px;
    background: radial-gradient(circle, rgba(120, 60, 220, 0.18) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }

  .logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 36px;
  }

  .logo-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #6d28d9, #a855f7);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }

  .logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.3px;
  }

  .badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: #a78bfa;
    background: rgba(109, 40, 217, 0.15);
    border: 1px solid rgba(167, 139, 250, 0.25);
    padding: 5px 12px;
    border-radius: 100px;
    margin-bottom: 18px;
  }

  h1 {
    font-family: 'Playfair Display', serif;
    font-size: 32px;
    font-weight: 700;
    line-height: 1.2;
    color: #f5f4ff;
    letter-spacing: -0.5px;
  }

  h1 span {
    background: linear-gradient(90deg, #c084fc, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtext {
    margin-top: 12px;
    font-size: 15px;
    font-weight: 300;
    color: #8b8aa8;
    line-height: 1.65;
  }

  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(120, 80, 220, 0.2), transparent);
    margin: 0 48px;
  }

  .body {
    padding: 36px 48px;
  }

  .cta-btn {
    display: block;
    width: fit-content;
    margin: 28px auto 0;
    padding: 15px 40px;
    background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #8b5cf6 100%);
    color: #fff !important;
    text-decoration: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.2px;
    border-radius: 12px;
    text-align: center;
    box-shadow:
      0 0 0 1px rgba(139, 92, 246, 0.4),
      0 8px 24px rgba(109, 40, 217, 0.45),
      inset 0 1px 0 rgba(255,255,255,0.12);
    transition: all 0.2s ease;
  }

  .otp-box {
    margin: 28px auto;
    width: fit-content;
    background: linear-gradient(135deg, rgba(109,40,217,0.12), rgba(139,92,246,0.08));
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 16px;
    padding: 24px 48px;
    text-align: center;
  }

  .otp-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #7c5cc4;
    margin-bottom: 12px;
  }

  .otp-code {
    font-family: 'Playfair Display', 'Courier New', monospace;
    font-size: 44px;
    font-weight: 700;
    letter-spacing: 14px;
    color: #fff;
    text-shadow: 0 0 40px rgba(167, 139, 250, 0.5);
    padding-left: 14px; /* optical correction for letter-spacing */
  }

  .otp-timer {
    margin-top: 10px;
    font-size: 12px;
    color: #6b6985;
    letter-spacing: 0.3px;
  }

  .otp-timer strong {
    color: #a78bfa;
    font-weight: 500;
  }

  .info-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    margin-top: 16px;
  }

  .info-icon {
    width: 36px; height: 36px; flex-shrink: 0;
    background: rgba(109,40,217,0.15);
    border: 1px solid rgba(139,92,246,0.2);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
  }

  .info-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #6b6885;
    margin-bottom: 4px;
  }

  .info-value {
    font-size: 14px;
    color: #c4c3df;
    font-weight: 400;
  }

  .warning-box {
    margin-top: 24px;
    padding: 14px 18px;
    background: rgba(220, 100, 60, 0.06);
    border: 1px solid rgba(220, 100, 60, 0.15);
    border-radius: 10px;
    font-size: 13px;
    color: #b07050;
    line-height: 1.6;
  }

  .warning-box strong { color: #d08060; }

  .footer {
    padding: 28px 48px 40px;
    text-align: center;
    border-top: 1px solid rgba(255,255,255,0.04);
  }

  .footer p {
    font-size: 12px;
    color: #3d3c52;
    line-height: 1.7;
  }

  .footer a {
    color: #5b4a8a;
    text-decoration: none;
  }

  .dots-row {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-top: 20px;
  }

  .dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    background: rgba(139,92,246,0.25);
  }
  .dot.active { background: rgba(139,92,246,0.7); }
`;

// ─── Shared shell ─────────────────────────────────────────────
const shell = (content: string, year = new Date().getFullYear()) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <style>${baseStyles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header-bar"></div>
      ${content}
      <div class="footer">
        <div class="dots-row">
          <div class="dot active"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        <p style="margin-top:20px;">
          You received this email because an action was triggered on your account.<br/>
          If this wasn't you, <a href="#">contact support</a> immediately.
        </p>
        <p style="margin-top:8px;">
          © ${year} YourApp, Inc. · <a href="#">Privacy Policy</a> · <a href="#">Unsubscribe</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ─── Logo partial ─────────────────────────────────────────────
const logo = `
  <div class="logo">
    <div class="logo-icon">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L17.32 6.5V15.5L10 20L2.68 15.5V6.5L10 2Z" fill="rgba(255,255,255,0.9)"/>
      </svg>
    </div>
    <span class="logo-text">YourApp</span>
  </div>
`;

// ─────────────────────────────────────────────────────────────
export const emailTemplates = {

  // ── 1. Admin Invite ────────────────────────────────────────
  adminInvite: (inviteLink: string) => ({
    subject: "You've been invited to join as Admin",
    html: shell(`
      <div class="header">
        ${logo}
        <div class="badge">Admin Invitation</div>
        <h1>You're invited to<br/><span>take the helm.</span></h1>
        <p class="subtext">
          Someone on your team has granted you administrator access.
          Accept your invite to unlock full control of the workspace.
        </p>
      </div>

      <div class="divider"></div>

      <div class="body">
        <div class="info-row">
          <div class="info-icon">🛡️</div>
          <div>
            <div class="info-label">Role Granted</div>
            <div class="info-value">Administrator — full workspace access</div>
          </div>
        </div>

        <div class="info-row">
          <div class="info-icon">⏱️</div>
          <div>
            <div class="info-label">Link Expires</div>
            <div class="info-value">In 1 hour from when this email was sent</div>
          </div>
        </div>

        <a href="${inviteLink}" class="cta-btn">Accept Invitation →</a>

        <div class="warning-box">
          <strong>Security notice:</strong> This invite link can only be used once.
          Do not forward this email — anyone with this link can accept on your behalf.
        </div>
      </div>
    `),
  }),

  // ── 2. OTP ────────────────────────────────────────────────
  otp: (otp: string) => ({
    subject: `${otp} is your verification code`,
    html: shell(`
      <div class="header">
        ${logo}
        <div class="badge">Verification Required</div>
        <h1>Here's your<br/><span>one-time code.</span></h1>
        <p class="subtext">
          Use the code below to complete your sign-in.
          Never share this code with anyone — we'll never ask for it.
        </p>
      </div>

      <div class="divider"></div>

      <div class="body">
        <div class="otp-box">
          <div class="otp-label">Your OTP Code</div>
          <div class="otp-code">${otp}</div>
          <div class="otp-timer">Expires in <strong>5 minutes</strong></div>
        </div>

        <div class="info-row">
          <div class="info-icon">🔒</div>
          <div>
            <div class="info-label">Security tip</div>
            <div class="info-value">
              YourApp will never call or message you to ask for this code.
              If you didn't request it, ignore this email — your account is safe.
            </div>
          </div>
        </div>
      </div>
    `),
  }),

  // ── 3. Welcome ────────────────────────────────────────────
  welcome: (firstName: string, loginLink: string) => ({
    subject: `Welcome to YourApp, ${firstName} 🎉`,
    html: shell(`
      <div class="header">
        ${logo}
        <div class="badge">Welcome Aboard</div>
        <h1>Good to have you,<br/><span>${firstName}.</span></h1>
        <p class="subtext">
          Your account is ready. You're now part of a workspace built for
          speed, clarity, and focus. Let's make something great.
        </p>
      </div>

      <div class="divider"></div>

      <div class="body">
        <div class="info-row">
          <div class="info-icon">✦</div>
          <div>
            <div class="info-label">What's next</div>
            <div class="info-value">Complete your profile and set up your first project in under 2 minutes.</div>
          </div>
        </div>

        <div class="info-row">
          <div class="info-icon">💬</div>
          <div>
            <div class="info-label">Need help?</div>
            <div class="info-value">Our support team is available 24/7 at <a href="mailto:support@yourapp.com" style="color:#a78bfa;text-decoration:none;">support@yourapp.com</a></div>
          </div>
        </div>

        <div class="info-row">
          <div class="info-icon">📖</div>
          <div>
            <div class="info-label">Documentation</div>
            <div class="info-value">Explore guides, tutorials, and API references in our <a href="#" style="color:#a78bfa;text-decoration:none;">docs portal</a>.</div>
          </div>
        </div>

        <a href="${loginLink}" class="cta-btn">Go to your Dashboard →</a>
      </div>
    `),
  }),

};