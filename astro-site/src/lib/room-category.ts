export const roomCategoryLabels = {
  campsite: '露營營位',
  cabin: '露營木屋',
  suite: '套房',
} as const;

export type RoomCategory = keyof typeof roomCategoryLabels;
