export type RoomType = 'campsite' | 'cabin' | 'suite';

export interface RoomSummary {
  id: string;
  data: {
    numberOfPeople: number;
    weekdayPrice: number;
    order: number;
  };
}

export const SHARED_POLICIES = [
  '訪客須事先登記，每人酌收 100 元清潔費；晚上 5 點後不再開放訪客入場，已入場訪客須於晚上 8 點前離開。',
  '為響應環保，園內住宿不提供毛巾、浴巾、牙刷等盥洗用品，請自行準備。',
] as const;

export const ROOM_TYPE_POLICIES: Record<RoomType, readonly string[]> = {
  campsite: [
    '營位及露營木屋不提供早晚餐。',
    '一帳以一車四人為原則；加人、加車及加帳費用另計。',
    '攜帶寵物離開預訂區域時請繫繩，未繫繩將酌收每隻 100 元清潔費。',
    '烤肉架、焚火台或快速爐須架高並離地 60 公分以上，不得直接在草皮或木板上使用。',
  ],
  cabin: [
    '露營木屋不提供早晚餐。',
    '木屋區嚴禁攜帶寵物；需要攜帶寵物請改訂露營營位。',
    '木屋內禁止吸菸及炊煮食物。',
  ],
  suite: [
    '套房於假日及連續假期附早餐，平日不附早餐；園區不提供晚餐。',
    '套房內禁止吸菸及炊煮食物。',
  ],
};

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  campsite: '露營營位',
  cabin: '露營木屋',
  suite: '園區套房',
};

export const ROOM_TYPE_TIMES: Record<RoomType, { checkinTime: string; checkoutTime: string }> = {
  campsite: { checkinTime: '13:00', checkoutTime: '12:00' },
  cabin: { checkinTime: '15:00', checkoutTime: '12:00' },
  suite: { checkinTime: '15:00', checkoutTime: '12:00' },
};

export function roomTypeFromId(id: string): RoomType {
  if (id.startsWith('campsite_')) return 'campsite';
  if (id.startsWith('log_cabin_')) return 'cabin';
  if (id.startsWith('suite_')) return 'suite';
  throw new Error(`Unknown room type for ${id}`);
}

export function policiesForRoom(id: string) {
  const roomType = roomTypeFromId(id);
  return {
    roomType,
    label: ROOM_TYPE_LABELS[roomType],
    times: ROOM_TYPE_TIMES[roomType],
    shared: SHARED_POLICIES,
    specific: ROOM_TYPE_POLICIES[roomType],
  };
}

export function relatedRoomScore(current: RoomSummary, candidate: RoomSummary) {
  const sameType = roomTypeFromId(current.id) === roomTypeFromId(candidate.id);
  const peopleDifference = Math.abs(current.data.numberOfPeople - candidate.data.numberOfPeople);
  const priceDifference = Math.abs(current.data.weekdayPrice - candidate.data.weekdayPrice);
  return (sameType ? 0 : 1_000_000) + peopleDifference * 10_000 + priceDifference + candidate.data.order;
}

export function selectRelatedRooms<T extends RoomSummary>(current: T, rooms: T[], limit = 3) {
  return rooms
    .filter((room) => room.id !== current.id)
    .sort((a, b) => relatedRoomScore(current, a) - relatedRoomScore(current, b))
    .slice(0, limit);
}
