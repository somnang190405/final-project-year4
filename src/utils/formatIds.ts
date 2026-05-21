export const formatUserId = (index: number, year = 2026) => `USR-${year}-${String(index + 1).padStart(4, '0')}`;
export const formatOrderId = (index: number) => `TM-${String(index + 1).padStart(4, '0')}`;

export const formatUserIdFromUid = (uid: string | null | undefined, year = 2026) => {
  if (!uid) return `USR-${year}-0000`;
  const raw = uid.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '0');
  const parsed = parseInt(raw, 36);
  const suffix = Number.isFinite(parsed) ? String(parsed % 10000).padStart(4, '0') : '0000';
  return `USR-${year}-${suffix}`;
};
