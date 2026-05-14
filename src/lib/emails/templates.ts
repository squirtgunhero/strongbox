/**
 * Branded HTML email templates.
 *
 * All templates render with inline styles only — email clients strip <style>
 * blocks and don't load external CSS. Each function returns both an HTML and
 * a plain-text version; the text version is what we persist to the
 * notifications table for the audit trail.
 */

type Role = "borrower" | "investor" | "admin" | "loan_officer";

// Brand tokens. Kept inline below — extracted here for readability.
const BG = "#F7F5F2";
const CARD_BG = "#FFFFFF";
const BORDER = "#E5E1DA";
const FG = "#0A0A0A";
const MUTED = "#59554f";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function shell(args: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(args.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BG};font-family:${SANS};color:${FG};">
    <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(args.preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
            <tr>
              <td style="padding:0 0 20px 0;">
                <div style="font-family:${SERIF};font-size:22px;font-weight:700;color:${FG};letter-spacing:-0.01em;">StrongBox</div>
              </td>
            </tr>
            <tr>
              <td style="background:${CARD_BG};border:1px solid ${BORDER};border-radius:8px;padding:32px;">
                <h1 style="margin:0 0 16px 0;font-family:${SANS};font-size:20px;font-weight:600;color:${FG};line-height:1.3;">${escapeHtml(args.heading)}</h1>
                <div style="font-family:${SANS};font-size:14px;line-height:1.6;color:${FG};">
                  ${args.bodyHtml}
                </div>
                <div style="text-align:center;margin:28px 0 8px 0;">
                  <a href="${escapeAttr(args.ctaUrl)}" style="display:inline-block;background:${FG};color:#ffffff;text-decoration:none;font-family:${SANS};font-size:14px;font-weight:500;padding:10px 24px;border-radius:6px;">${escapeHtml(args.ctaLabel)}</a>
                </div>
                <div style="font-family:${SANS};font-size:12px;line-height:1.5;color:${MUTED};margin-top:20px;word-break:break-all;">
                  Or paste this link into your browser:<br />
                  <a href="${escapeAttr(args.ctaUrl)}" style="color:${MUTED};text-decoration:underline;">${escapeHtml(args.ctaUrl)}</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 4px 0 4px;font-family:${SANS};font-size:11.5px;line-height:1.5;color:${MUTED};">
                ${args.footerHtml}
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

function roleBlurb(role: Role, orgName: string): string {
  switch (role) {
    case "borrower":
      return "Your loan officer has invited you to access your loan portal. Click below to set your password and sign in.";
    case "investor":
      return "You've been invited as an investor to track your positions and distributions.";
    case "admin":
    case "loan_officer":
    default:
      return `You've been invited to join the ${orgName} team.`;
  }
}

export function inviteEmailTemplate(args: {
  recipientName: string;
  role: Role;
  inviteUrl: string;
  orgName: string;
}): { subject: string; html: string; text: string } {
  const orgName = args.orgName || "StrongBox";
  const subject = `You've been invited to ${orgName}`;
  const heading = `Welcome to ${orgName}`;
  const blurb = roleBlurb(args.role, orgName);

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Hi ${escapeHtml(args.recipientName || "there")},</p>
    <p style="margin:0 0 12px 0;">${escapeHtml(blurb)}</p>
    <p style="margin:0;color:${MUTED};font-size:12.5px;">This link expires in 24 hours.</p>
  `;

  const footerHtml = `
    <div style="margin-bottom:4px;">${escapeHtml(orgName)}</div>
    <div>Didn't expect this email? You can safely ignore it.</div>
  `;

  const html = shell({
    preheader: `Set your password to access ${orgName}.`,
    heading,
    bodyHtml,
    ctaLabel: "Set your password",
    ctaUrl: args.inviteUrl,
    footerHtml,
  });

  const text = [
    `${heading}`,
    ``,
    `Hi ${args.recipientName || "there"},`,
    ``,
    blurb,
    ``,
    `Set your password:`,
    args.inviteUrl,
    ``,
    `This link expires in 24 hours.`,
    ``,
    `--`,
    orgName,
    `Didn't expect this email? You can safely ignore it.`,
  ].join("\n");

  return { subject, html, text };
}

export function passwordResetEmailTemplate(args: {
  resetUrl: string;
  orgName: string;
}): { subject: string; html: string; text: string } {
  const orgName = args.orgName || "StrongBox";
  const subject = `Reset your ${orgName} password`;
  const heading = "Reset your password";

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">We received a request to reset the password for your ${escapeHtml(orgName)} account.</p>
    <p style="margin:0 0 12px 0;">Click below to set a new password. If you didn't request this, you can safely ignore this email.</p>
  `;

  const footerHtml = `
    <div style="margin-bottom:4px;">${escapeHtml(orgName)}</div>
    <div>This link expires in 1 hour.</div>
  `;

  const html = shell({
    preheader: `Reset your ${orgName} password.`,
    heading,
    bodyHtml,
    ctaLabel: "Reset password",
    ctaUrl: args.resetUrl,
    footerHtml,
  });

  const text = [
    heading,
    ``,
    `We received a request to reset the password for your ${orgName} account.`,
    `If you didn't request this, you can safely ignore this email.`,
    ``,
    `Reset your password:`,
    args.resetUrl,
    ``,
    `This link expires in 1 hour.`,
    ``,
    `--`,
    orgName,
  ].join("\n");

  return { subject, html, text };
}
