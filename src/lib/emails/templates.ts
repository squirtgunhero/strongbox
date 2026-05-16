/**
 * Branded HTML email templates.
 *
 * All templates render with inline styles only — email clients strip <style>
 * blocks and don't load external CSS. Layout is table-based for Outlook.
 * Each function returns both an HTML and a plain-text version; the text
 * version is what we persist to the notifications table for the audit trail.
 */

type Role = "borrower" | "investor" | "admin" | "loan_officer";

// Brand name shown to recipients. Fixed on purpose — the configurable org
// name (e.g. "StrongBox Lender") is internal and should never surface in
// outbound email copy, headings, or the footer.
const BRAND = "StrongBox";

// Brand tokens.
const BG = "#F0F2F5";
const CARD_BG = "#FFFFFF";
const BORDER = "#E2E5EA";
const FG = "#0A0A0A";
const BODY_TEXT = "#3F4651";
const MUTED = "#7A828F";
const ACCENT = "#1B6B4A";
const ACCENT_DARK = "#155539";
const SERIF = "Georgia, 'Times New Roman', serif";
// Single-quote the multi-word family: this string is interpolated into
// double-quoted style="" attributes, so double quotes would close the
// attribute early and silently drop every declaration after font-family.
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function shell(args: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerHtml: string;
}): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${escapeHtml(args.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BG};font-family:${SANS};color:${FG};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;max-height:0;max-width:0;mso-hide:all;">${escapeHtml(args.preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};">
      <tr>
        <td align="center" style="padding:48px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
            <!-- Card -->
            <tr>
              <td style="background:${CARD_BG};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
                <!-- Brand band -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td bgcolor="${ACCENT}" style="background:${ACCENT};padding:30px 40px;">
                      <div style="font-family:${SERIF};font-size:25px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1;">${BRAND}</div>
                      <div style="font-family:${SANS};font-size:10px;font-weight:600;letter-spacing:0.16em;color:#CFE6DB;text-transform:uppercase;margin-top:7px;">Hard Money Lending</div>
                    </td>
                  </tr>
                </table>
                <!-- Body -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:40px 40px 36px 40px;">
                      <h1 style="margin:0 0 20px 0;font-family:${SANS};font-size:21px;font-weight:700;color:${FG};line-height:1.3;letter-spacing:-0.01em;">${escapeHtml(args.heading)}</h1>
                      <div style="font-family:${SANS};font-size:15px;line-height:1.65;color:${BODY_TEXT};">
                        ${args.bodyHtml}
                      </div>
                      <!-- Button: visual lives on the <td> so it survives
                           clients that strip <a> styles. -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:32px auto 0 auto;">
                        <tr>
                          <td align="center" bgcolor="${ACCENT}" style="border-radius:10px;background:${ACCENT};mso-padding-alt:15px 40px;">
                            <a href="${escapeAttr(args.ctaUrl)}" target="_blank" style="display:inline-block;padding:15px 40px;font-family:${SANS};font-size:15px;line-height:1;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(args.ctaLabel)}</a>
                          </td>
                        </tr>
                      </table>
                      <div style="font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};margin-top:22px;text-align:center;word-break:break-all;">
                        Or paste this link into your browser:<br />
                        <a href="${escapeAttr(args.ctaUrl)}" style="color:${ACCENT_DARK};text-decoration:underline;">${escapeHtml(args.ctaUrl)}</a>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 40px;">
                      <div style="border-top:1px solid ${BORDER};"></div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 40px 36px 40px;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">
                      ${args.footerHtml}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Sub-footer -->
            <tr>
              <td style="padding:24px 8px 0 8px;text-align:center;font-family:${SANS};font-size:11px;line-height:1.6;color:${MUTED};">
                &copy; ${year} ${BRAND} &middot; Hard money lending operations
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function roleBlurb(role: Role): string {
  switch (role) {
    case "borrower":
      return "Your loan officer has invited you to access your loan portal. Set your password below to sign in and track your loan.";
    case "investor":
      return "You've been invited to track your positions, distributions, and returns. Set your password below to get started.";
    case "admin":
    case "loan_officer":
    default:
      return `You've been invited to join the ${BRAND} team. Set your password below to access the platform.`;
  }
}

export function inviteEmailTemplate(args: {
  recipientName: string;
  role: Role;
  inviteUrl: string;
  /** Accepted for API stability; intentionally not shown — see BRAND. */
  orgName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `You've been invited to ${BRAND}`;
  const heading = `Welcome to ${BRAND}`;
  const blurb = roleBlurb(args.role);

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">Hi ${escapeHtml(args.recipientName || "there")},</p>
    <p style="margin:0;">${escapeHtml(blurb)}</p>
  `;

  const footerHtml = `
    <div style="color:${BODY_TEXT};font-weight:600;margin-bottom:4px;">This invite link expires in 24 hours.</div>
    <div>Didn't expect this email? You can safely ignore it — no account will be created.</div>
  `;

  const html = shell({
    preheader: `Set your password to access ${BRAND}.`,
    heading,
    bodyHtml,
    ctaLabel: "Set your password",
    ctaUrl: args.inviteUrl,
    footerHtml,
  });

  const text = [
    heading,
    ``,
    `Hi ${args.recipientName || "there"},`,
    ``,
    blurb,
    ``,
    `Set your password:`,
    args.inviteUrl,
    ``,
    `This invite link expires in 24 hours.`,
    `Didn't expect this email? You can safely ignore it.`,
    ``,
    `--`,
    BRAND,
  ].join("\n");

  return { subject, html, text };
}

export function passwordResetEmailTemplate(args: {
  resetUrl: string;
  /** Accepted for API stability; intentionally not shown — see BRAND. */
  orgName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Reset your ${BRAND} password`;
  const heading = "Reset your password";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">We received a request to reset the password for your ${BRAND} account.</p>
    <p style="margin:0;">Click the button below to choose a new password. If you didn't request this, you can safely ignore this email — your password won't change.</p>
  `;

  const footerHtml = `
    <div style="color:${BODY_TEXT};font-weight:600;margin-bottom:4px;">This link expires in 1 hour.</div>
    <div>For your security, never share this email or link with anyone.</div>
  `;

  const html = shell({
    preheader: `Reset your ${BRAND} password.`,
    heading,
    bodyHtml,
    ctaLabel: "Reset password",
    ctaUrl: args.resetUrl,
    footerHtml,
  });

  const text = [
    heading,
    ``,
    `We received a request to reset the password for your ${BRAND} account.`,
    `If you didn't request this, you can safely ignore this email — your password won't change.`,
    ``,
    `Reset your password:`,
    args.resetUrl,
    ``,
    `This link expires in 1 hour.`,
    ``,
    `--`,
    BRAND,
  ].join("\n");

  return { subject, html, text };
}
