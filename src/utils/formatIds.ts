export const formatUserId = (index: number, year = 2026) => `USR-${year}-${String(index + 1).padStart(4, '0')}`;
export const formatOrderId = (index: number) => `TM-${String(index + 1).padStart(4, '0')}`;

export const formatUserIdFromUid = (uid: string | null | undefined, year = 2026) => {
  if (!uid) return `USR-${year}-0000`;
  const raw = uid.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '0');
  const parsed = parseInt(raw, 36);
  const suffix = Number.isFinite(parsed) ? String(parsed % 10000).padStart(4, '0') : '0000';
  return `USR-${year}-${suffix}`;
};

export const formatOrderIdFromDoc = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  const num = (Math.abs(hash) % 9999) + 1;
  return `TM-${String(num).padStart(4, '0')}`;
};
