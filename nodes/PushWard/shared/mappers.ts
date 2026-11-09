import { jsonParse, tryToParseDateTime, type IDataObject } from 'n8n-workflow';
import {
	findTemplate,
	paramName,
	type ContentField,
	type ContentTemplate,
} from './contentTemplates';

export interface Mapped {
	body?: IDataObject;
	headers?: IDataObject;
}

const isBlank = (value: unknown) => value === '' || value === null || value === undefined;

function compact(fields: IDataObject): IDataObject {
	return Object.fromEntries(Object.entries(fields).filter(([, value]) => !isBlank(value)));
}

// Objects become JSON text unless they have a text form of their own (dates). n8n's vm expression
// engine passes a DateTime as a plain snapshot, and an invalid one holds the current time in ts.
function text(value: unknown): string | undefined {
	if (isBlank(value)) return undefined;
	if (typeof value !== 'object') return String(value);
	const date = value as {
		isLuxonDateTime?: boolean;
		invalid?: unknown;
		ts?: number;
		o?: number;
		toJSON?: () => unknown;
	};
	if (date.isLuxonDateTime) {
		return date.invalid
			? 'Invalid DateTime'
			: tryToParseDateTime(new Date(date.ts as number))
					.setZone(date.o)
					.toISO();
	}
	return date.toJSON ? text(date.toJSON()) : JSON.stringify(value);
}

function list(value: unknown): string[] | undefined {
	const entries = Array.isArray(value)
		? value.map((item) => text(item) ?? '')
		: (text(value) ?? '').split(',');
	const items = entries.map((item) => item.trim()).filter(Boolean);
	return items.length ? items : undefined;
}

export function mapActions(buttons: IDataObject[] = []): IDataObject[] | undefined {
	const actions = buttons.map((button) =>
		compact(
			Object.fromEntries(
				Object.entries(button)
					.filter(([, value]) => value !== false)
					.map(([key, value]) => [
						key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
						value === true ? true : text(value),
					]),
			),
		),
	);
	return actions.length ? actions : undefined;
}

export function parseSnooze(value: unknown): number[] | undefined {
	return list(value)?.map((entry) => {
		if (!/^\d+$/.test(entry)) {
			throw new Error(`Snooze takes whole minutes separated by commas, got "${entry}"`);
		}
		return Number(entry);
	});
}

export function mapMetadata(pairs: IDataObject[] = []): IDataObject | undefined {
	const entries = pairs
		.map(({ key, value }) => [text(key), text(value)])
		.filter(([key, value]) => key && value);
	return entries.length ? Object.fromEntries(entries) : undefined;
}

export function mapAcknowledge(settings?: IDataObject): IDataObject {
	if (!settings) return {};
	return compact({
		acknowledge: compact({
			repeat_seconds: settings.repeatSeconds as number,
			expire_seconds: settings.expireSeconds as number,
			action_title: text(settings.actionTitle),
		}),
		tags: list(settings.tags),
		callback_url: text(settings.callbackUrl),
	});
}

export function mapMedia(file?: IDataObject): IDataObject | undefined {
	const url = text(file?.url);
	return url ? { url, type: text(file?.type) ?? 'image' } : undefined;
}

export function mapTarget(recipients?: IDataObject): IDataObject | undefined {
	const target = compact({
		groups: list(recipients?.groups),
		members: list(recipients?.members),
		tags: list(recipients?.tags),
	});
	return Object.keys(target).length ? target : undefined;
}

export function idempotencyHeaders(key: unknown): IDataObject {
	const value = text(key)?.trim();
	return value ? { 'Idempotency-Key': value } : {};
}

export function notificationOptions(
	additionalFields: IDataObject,
	actions: IDataObject,
	acknowledge: IDataObject,
): Mapped {
	const nested = (name: string, group: string) =>
		(additionalFields[name] as IDataObject | undefined)?.[group];

	return {
		body: compact({
			actions: mapActions(actions.button as IDataObject[] | undefined),
			...mapAcknowledge(acknowledge.settings as IDataObject | undefined),
			snooze: parseSnooze(additionalFields.snooze),
			metadata: mapMetadata(nested('metadata', 'pair') as IDataObject[] | undefined),
			media: mapMedia(nested('media', 'file') as IDataObject | undefined),
			target: mapTarget(nested('target', 'recipients') as IDataObject | undefined),
		}),
		headers: idempotencyHeaders(additionalFields.idempotencyKey),
	};
}

// A picker value has no offset, so it is read in the workflow time zone.
function parseDate(value: unknown, zone: string) {
	const source = text(value);
	return source === undefined ? undefined : tryToParseDateTime(source, zone);
}

export function toRfc3339(value: unknown, zone: string): string | undefined {
	return parseDate(value, zone)?.toISO() as string | undefined;
}

export function toUnixSeconds(value: unknown, zone: string): number | undefined {
	const date = parseDate(value, zone);
	return date && Math.floor(date.toSeconds());
}

function toNumber(value: unknown, label: string): number | undefined {
	if (isBlank(value) || (typeof value === 'string' && !value.trim())) return undefined;
	const number = Number(value);
	if (!Number.isFinite(number)) throw new Error(`${label} takes a number, got "${text(value)}"`);
	return number;
}

function parseJsonObject(value: unknown, label: string): IDataObject | undefined {
	if (isBlank(value)) return undefined;
	const parsed =
		typeof value === 'string'
			? jsonParse<unknown>(value, { errorMessage: `${label} is not valid JSON` })
			: value;
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new Error(`${label} must be a JSON object`);
	}
	return parsed as IDataObject;
}

type ToDate = (value: unknown) => string | number | undefined;

function mapField(field: ContentField, value: unknown, toDate: ToDate): unknown {
	switch (field.type) {
		case 'number':
			return toNumber(value, field.displayName);
		case 'boolean':
			return isBlank(value) ? undefined : value === true || value === 'true';
		case 'dateTime':
			return toDate(value);
		case 'stringList':
			return list(value);
		case 'numberList':
			return list(value)?.map((entry) => toNumber(entry, field.displayName));
		case 'json':
			return parseJsonObject(value, field.displayName);
		case 'rows': {
			const rows = (((value as IDataObject | undefined)?.item ?? []) as IDataObject[])
				.map((row) => mapFields(field.fields ?? [], (sub) => row[sub.key], toDate))
				.filter((row) => Object.keys(row).length);
			if (field.keyedByName) {
				const entries = rows
					.filter((row) => row.name !== undefined && row.value !== undefined)
					.map((row) => [row.name as string, row.value]);
				return entries.length ? Object.fromEntries(entries) : undefined;
			}
			return rows.length ? rows : undefined;
		}
		default:
			return text(value);
	}
}

function mapFields(
	fields: ContentField[],
	read: (field: ContentField) => unknown,
	toDate: ToDate,
): IDataObject {
	return compact(
		Object.fromEntries(
			fields.map((field) => [field.key, mapField(field, read(field), toDate)]),
		) as IDataObject,
	);
}

const serverOwnedKeys = [
	'warning_pushed',
	'snoozed_until',
	'answer',
	'answer_round',
	'paused_at',
	'paused_seconds',
	'log_backlog',
];

export function mapContent(
	templates: ContentTemplate[],
	name: string,
	values: IDataObject,
	toDate: ToDate,
): IDataObject {
	const extra = parseJsonObject(values.extraContent, 'Extra Content') ?? {};
	return {
		template: name,
		...mapFields(
			findTemplate(templates, name).fields,
			({ key }) => values[paramName(name, key)],
			toDate,
		),
		...Object.fromEntries(Object.entries(extra).filter(([key]) => !serverOwnedKeys.includes(key))),
	};
}

const nestedTarget = (additional: IDataObject) =>
	mapTarget((additional.target as IDataObject | undefined)?.recipients as IDataObject | undefined);

export function mapActivityCreate(
	slug: unknown,
	name: unknown,
	additional: IDataObject,
): IDataObject {
	return compact({
		slug: text(slug),
		name: text(name),
		priority: toNumber(additional.priority, 'Priority'),
		ended_ttl: toNumber(additional.endedTtl, 'Ended TTL'),
		stale_ttl: toNumber(additional.staleTtl, 'Stale TTL'),
		dismissal_ttl: toNumber(additional.dismissalTtl, 'Dismissal TTL'),
		target: nestedTarget(additional),
	});
}

export function mapActivityPatch(content: IDataObject, additional: IDataObject): IDataObject {
	return compact({ content, sound: text(additional.sound) });
}

export function mapActivityEnd(additional: IDataObject): IDataObject {
	return compact({ dismissal_ttl: toNumber(additional.dismissalTtl, 'Dismissal TTL') });
}

const widgetSettings = (additional: IDataObject) => ({
	push_throttle: toNumber(additional.pushThrottle, 'Push Throttle'),
	stale_after: toNumber(additional.staleAfter, 'Stale After'),
});

export function mapWidgetCreate(
	slug: unknown,
	name: unknown,
	content: IDataObject,
	additional: IDataObject,
): IDataObject {
	return compact({
		slug: text(slug),
		name: text(name),
		content,
		...widgetSettings(additional),
		target: nestedTarget(additional),
	});
}

export function mapWidgetPatch(content: IDataObject, additional: IDataObject): IDataObject {
	return compact({ content, name: text(additional.name), ...widgetSettings(additional) });
}

export function mapSchedule(schedule: IDataObject, zone: string): Mapped {
	if (schedule.scheduleType !== 'recurring') {
		return { body: compact({ send_at: toRfc3339(schedule.sendAt, zone) }) };
	}

	const options = (schedule.recurrenceOptions ?? {}) as IDataObject;
	return {
		body: compact({
			send_at: toRfc3339(options.sendAt, zone),
			recurrence: compact({
				cron: text(schedule.cron),
				timezone: text(schedule.timezone),
				count: options.count as number,
				until: toRfc3339(options.until, zone),
			}),
		}),
	};
}
