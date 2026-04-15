export const ROLE_SPY_BOSS = 'trùm gián điệp';
export const ROLE_IMPOSTOR = 'gián điệp';
export const ROLE_ASSASSIN = 'sát thủ';
export const ROLE_SECRETARY = 'bí thư chi bộ';
export const ROLE_INTELLIGENCE = 'tình báo';
export const ROLE_MILITIA = 'dân quân';
export const ROLE_CREW = 'dân';

export function getRoleLabel(role) {
  return role || ROLE_CREW;
}

export function isEnemyRole(role) {
  return role === ROLE_SPY_BOSS || role === ROLE_IMPOSTOR || role === ROLE_ASSASSIN;
}

export function getResultMessage(role) {
  return isEnemyRole(role)
    ? 'Gián điệp thắng nếu đồng đội bị loại!'
    : 'Đồng đội thắng nếu gián điệp bị tìm ra.';
}
