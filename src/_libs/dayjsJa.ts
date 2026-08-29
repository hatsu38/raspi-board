import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import weekday from "dayjs/plugin/weekday";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import "dayjs/locale/ja";
// timezoneプラグインはutcプラグインに依存するため、extendの順序はutc→timezoneを守る。
// TimeTreeの終日予定を「イベント自身のタイムゾーンでの壁時計時刻」に変換する
// (src/_libs/timetree/calendar.ts の toZonedIsoString)ためだけに使っており、
// dayjs.tz.setDefault()などのグローバルなデフォルトタイムゾーン設定は行わない。
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekday);
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.locale("ja");

export default dayjs;
