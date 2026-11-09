import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DateTime } from 'luxon';

import {
	idempotencyHeaders,
	mapAcknowledge,
	mapActions,
	mapMedia,
	mapMetadata,
	mapSchedule,
	mapTarget,
	notificationOptions,
	parseSnooze,
	toRfc3339,
} from '../dist/nodes/PushWard/shared/mappers.js';

test('actions drop blanks and false booleans and use snake_case keys', () => {
	assert.deepEqual(
		mapActions([
			{
				id: 'approve',
				title: 'Approve',
				url: '',
				method: 'POST',
				body: '',
				foreground: false,
				destructive: true,
				authenticationRequired: true,
				icon: '',
				textInput: false,
				textInputPlaceholder: 'Why?',
				textInputButtonTitle: '',
			},
		]),
		[
			{
				id: 'approve',
				title: 'Approve',
				method: 'POST',
				destructive: true,
				authentication_required: true,
				text_input_placeholder: 'Why?',
			},
		],
	);
});

test('no action buttons means no actions key', () => {
	assert.equal(mapActions([]), undefined);
	assert.equal(mapActions(undefined), undefined);
});

test('snooze becomes an integer array', () => {
	assert.deepEqual(parseSnooze('15, 60'), [15, 60]);
	assert.equal(parseSnooze(''), undefined);
	assert.equal(parseSnooze(' , '), undefined);
});

test('snooze refuses anything that is not whole minutes', () => {
	assert.throws(() => parseSnooze('15, soon'), /got "soon"/);
	assert.throws(() => parseSnooze('1.5'), /got "1.5"/);
});

test('metadata pairs become an object without empty pairs', () => {
	assert.deepEqual(
		mapMetadata([
			{ key: 'env', value: 'prod' },
			{ key: '', value: '' },
			{ key: 'orphan', value: '' },
			{ key: '', value: 'orphan' },
			{ key: 'attempt', value: 3 },
		]),
		{ env: 'prod', attempt: '3' },
	);
	assert.equal(mapMetadata([{ key: '', value: '' }]), undefined);
	assert.equal(mapMetadata(undefined), undefined);
});

test('acknowledge fills acknowledge, tags and callback_url from the group', () => {
	assert.deepEqual(
		mapAcknowledge({
			repeatSeconds: 60,
			expireSeconds: 3600,
			actionTitle: 'Got it',
			tags: 'deploys, oncall',
			callbackUrl: 'https://example.com/ack',
		}),
		{
			acknowledge: { repeat_seconds: 60, expire_seconds: 3600, action_title: 'Got it' },
			tags: ['deploys', 'oncall'],
			callback_url: 'https://example.com/ack',
		},
	);
});

test('acknowledge sends nothing when the group is absent', () => {
	assert.deepEqual(mapAcknowledge(undefined), {});
});

test('acknowledge leaves out blank tags and callback URL', () => {
	assert.deepEqual(mapAcknowledge({ repeatSeconds: 30, tags: '', callbackUrl: '' }), {
		acknowledge: { repeat_seconds: 30 },
	});
});

test('media needs a URL', () => {
	assert.equal(mapMedia(undefined), undefined);
	assert.equal(mapMedia({ url: '', type: 'video' }), undefined);
	assert.deepEqual(mapMedia({ url: 'https://example.com/a.mp4', type: 'video' }), {
		url: 'https://example.com/a.mp4',
		type: 'video',
	});
});

test('target is omitted when empty and its lists are trimmed', () => {
	assert.equal(mapTarget(undefined), undefined);
	assert.equal(mapTarget({ groups: '', members: ' , ', tags: '' }), undefined);
	assert.deepEqual(mapTarget({ groups: ' oncall, sre ,', members: '', tags: 'rack' }), {
		groups: ['oncall', 'sre'],
		tags: ['rack'],
	});
});

test('the Idempotency-Key header is set only when non-empty', () => {
	assert.deepEqual(idempotencyHeaders('run-1'), { 'Idempotency-Key': 'run-1' });
	assert.deepEqual(idempotencyHeaders(''), {});
	assert.deepEqual(idempotencyHeaders('   '), {});
	assert.deepEqual(idempotencyHeaders(undefined), {});
});

test('notification options send nothing when nothing was set', () => {
	assert.deepEqual(notificationOptions({}, {}, {}), { body: {}, headers: {} });
});

test('notification options reach their wire keys', () => {
	assert.deepEqual(
		notificationOptions(
			{
				snooze: '5',
				idempotencyKey: 'k',
				metadata: { pair: [{ key: 'a', value: 'b' }] },
				media: { file: { url: 'https://example.com/a.png', type: 'image' } },
				target: { recipients: { groups: 'oncall' } },
			},
			{ button: [{ id: 'ok', title: 'OK' }] },
			{ settings: { repeatSeconds: 60 } },
		),
		{
			body: {
				actions: [{ id: 'ok', title: 'OK' }],
				acknowledge: { repeat_seconds: 60 },
				snooze: [5],
				metadata: { a: 'b' },
				media: { url: 'https://example.com/a.png', type: 'image' },
				target: { groups: ['oncall'] },
			},
			headers: { 'Idempotency-Key': 'k' },
		},
	);
});

test('a one-time schedule produces send_at and no recurrence', () => {
	assert.deepEqual(
		mapSchedule({ scheduleType: 'oneTime', sendAt: '2026-11-20T18:00:00Z' }, 'UTC').body,
		{ send_at: '2026-11-20T18:00:00.000Z' },
	);
});

test('a recurring schedule produces recurrence with count and no send_at', () => {
	assert.deepEqual(
		mapSchedule(
			{
				scheduleType: 'recurring',
				cron: '0 8 * * 1-5',
				timezone: 'Europe/Warsaw',
				recurrenceOptions: { count: 5 },
			},
			'UTC',
		).body,
		{ recurrence: { cron: '0 8 * * 1-5', timezone: 'Europe/Warsaw', count: 5 } },
	);
});

test('a recurring schedule produces recurrence with until as RFC 3339', () => {
	assert.deepEqual(
		mapSchedule(
			{
				scheduleType: 'recurring',
				cron: '@daily',
				timezone: 'UTC',
				recurrenceOptions: { until: '2026-12-31T23:00:00Z' },
			},
			'UTC',
		).body,
		{ recurrence: { cron: '@daily', timezone: 'UTC', until: '2026-12-31T23:00:00.000Z' } },
	);
});

test('a recurring schedule keeps send_at when given', () => {
	assert.deepEqual(
		mapSchedule(
			{
				scheduleType: 'recurring',
				cron: '@daily',
				timezone: 'UTC',
				recurrenceOptions: { sendAt: '2026-12-01T00:00:00Z' },
			},
			'UTC',
		).body,
		{
			send_at: '2026-12-01T00:00:00.000Z',
			recurrence: { cron: '@daily', timezone: 'UTC' },
		},
	);
});

test('dates become RFC 3339 text', () => {
	const rfc3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
	const instant = (value) => new Date(value).getTime();

	// the n8n date picker gives wall-clock text with no offset
	const winter = toRfc3339('2026-01-15T10:00:00', 'Europe/Warsaw');
	assert.match(winter, rfc3339);
	assert.equal(instant(winter), Date.UTC(2026, 0, 15, 9));
	const summer = toRfc3339('2026-07-15T10:00:00', 'Europe/Warsaw');
	assert.equal(instant(summer), Date.UTC(2026, 6, 15, 8));

	const withOffset = toRfc3339('2026-01-15T10:00:00+02:00', 'Europe/Warsaw');
	assert.equal(instant(withOffset), Date.UTC(2026, 0, 15, 8));

	const snapshot = toRfc3339({ isLuxonDateTime: true, ts: Date.UTC(2026, 0, 15, 9), o: 60 }, 'UTC');
	assert.match(snapshot, rfc3339);
	assert.equal(instant(snapshot), Date.UTC(2026, 0, 15, 9));

	assert.equal(
		instant(toRfc3339(new Date(Date.UTC(2026, 0, 15, 9)), 'Europe/Warsaw')),
		Date.UTC(2026, 0, 15, 9),
	);
	assert.equal(
		instant(toRfc3339(DateTime.fromMillis(Date.UTC(2026, 0, 15, 9)), 'UTC')),
		Date.UTC(2026, 0, 15, 9),
	);

	assert.equal(toRfc3339('', 'UTC'), undefined);
	assert.equal(toRfc3339(undefined, 'UTC'), undefined);
});

test('dates in mapped string fields become ISO text', () => {
	const at = (value) => mapMetadata([{ key: 'at', value }]).at;

	assert.equal(at(new Date(0)), '1970-01-01T00:00:00.000Z');
	assert.equal(at(DateTime.fromMillis(0, { zone: 60 })), '1970-01-01T01:00:00.000+01:00');
	// the vm expression engine passes a DateTime as a plain snapshot
	assert.equal(at({ isLuxonDateTime: true, ts: 0, o: 60 }), '1970-01-01T01:00:00.000+01:00');
	assert.equal(at({ isLuxonDateTime: true, invalid: { reason: 'x' }, ts: 0 }), 'Invalid DateTime');
	assert.equal(at({ a: 1 }), '{"a":1}');

	assert.deepEqual(mapActions([{ id: 'ok', title: 'OK', body: new Date(0) }]), [
		{ id: 'ok', title: 'OK', body: '1970-01-01T00:00:00.000Z' },
	]);
	assert.equal(
		mapAcknowledge({ callbackUrl: { isLuxonDateTime: true, ts: 0, o: 0 } }).callback_url,
		'1970-01-01T00:00:00.000Z',
	);
});

test('lists also take an array from an expression', () => {
	assert.deepEqual(mapAcknowledge({ tags: ['deploys', ' oncall', ''] }).tags, [
		'deploys',
		'oncall',
	]);
	assert.deepEqual(mapTarget({ groups: ['oncall', 'sre'], members: [] }), {
		groups: ['oncall', 'sre'],
	});
	assert.deepEqual(parseSnooze([15, 60]), [15, 60]);
	assert.throws(() => parseSnooze([15, 'soon']), /got "soon"/);
});

test('a date that cannot be read is refused', () => {
	assert.throws(() => toRfc3339('soon', 'UTC'));
	assert.throws(() => toRfc3339({ isLuxonDateTime: true, invalid: { reason: 'x' }, ts: 0 }, 'UTC'));
});
