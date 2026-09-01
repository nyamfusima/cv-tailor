const DEFAULT_ADMIN_EMAILS = [
  "nyamfusima@gmail.com",
  "hamza26mohamud@gmail.com",
  "the.real.chad.naude@gmail.com",
  "ngqongwaayandisa@gmail.com",
  "somilamangqu@gmail.com",
  "moabithapelo1@gmail.com",
  "sikhanyiselesky@gmail.com",
  "zengetwasisipho@gmail.com",
];

function parseEmailList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function adminEmails(): string[] {
  return [...new Set([...DEFAULT_ADMIN_EMAILS, ...parseEmailList(process.env.ADMIN_EMAILS)])];
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
