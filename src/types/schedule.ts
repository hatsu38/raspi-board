export type ScheduleEvent = {
  id: string;
  title: string;
  startAt: string; // ISO8601
  endAt: string; // ISO8601
  allDay: boolean;
};
