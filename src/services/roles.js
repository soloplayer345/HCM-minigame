export const ROLE_IMPOSTOR = 'gián điệp';
export const ROLE_CREW = 'dân';

export function getRoleLabel(role) {
  return role || ROLE_CREW;
}

export function getResultMessage(role) {
  return role === ROLE_IMPOSTOR
    ? 'Gián điệp thắng nếu đồng đội bị loại!'
    : 'Đồng đội thắng nếu gián điệp bị tìm ra.';
}
