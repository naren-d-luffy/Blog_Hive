export const emailTemplates = {
  adminInvite: (inviteLink: string) => ({
    subject: "You're invited as Admin",
    html: `
      <h2>Admin Invitation</h2>
      <p>You’ve been invited to join as an admin.</p>
      <a href="${inviteLink}">Accept Invite</a>
      <p>This link expires in 1 hour.</p>
    `,
  }),

  otp: (otp: string) => ({
    subject: "Your OTP Code",
    html: `
      <h2>Your OTP</h2>
      <p>${otp}</p>
      <p>This OTP expires in 5 minutes.</p>
    `,
  }),
};