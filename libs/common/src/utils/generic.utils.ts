import * as moment from 'moment-timezone';

/**
 * Convert any date input to UTC Date for storage in DB
 */
export function toUTC(date: Date | string): Date {
  return moment.tz(date, 'UTC').toDate();
}

/**
 * Convert UTC date to specific timezone
 */
export function toTimezone(date: Date | string, tz: string): Date {
  return moment.tz(date, tz).toDate();
}



/**
 * Recursively normalize date-like fields in objects
 */
export function normalizeDates(
	obj: any,
	mode: "toUTC" | "toTZ",
	tz = "Africa/Lagos",
) {
	if (!obj || typeof obj !== "object") return obj;

	for (const key in obj) {
		if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

		const value = obj[key];

		if (
			key.toLowerCase().includes("date") ||
			key.endsWith("_at") ||
			key.endsWith("_time")
		) {
			if (value) {
				obj[key] = mode === "toUTC" ? toUTC(value) : toTimezone(value, tz);
			}
		} else if (typeof value === "object") {
			normalizeDates(value, mode, tz);
		}
	}

	return obj;
}


