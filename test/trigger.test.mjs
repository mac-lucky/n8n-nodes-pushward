import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PushWardTrigger } from '../dist/nodes/PushWardTrigger/PushWardTrigger.node.js';
import { pollAnswers } from '../dist/nodes/PushWardTrigger/pollAnswers.js';

const url = 'https://api.pushward.app/notifications/answers';
const answer = (id, action_id = 'approve') => ({ notification_id: id, status: 'answered', action_id });
const fullPage = (cursor) => ({
	items: Array.from({ length: 100 }, (_, index) => answer(index)),
	cursor,
});

function poller({ mode = 'trigger', stored = {}, actionIds = '', pages = [] }) {
	const calls = [];
	return {
		calls,
		stored,
		getMode: () => mode,
		getNode: () => ({ id: '1', name: 'PushWard Trigger', type: 'x', typeVersion: 1, position: [0, 0] }),
		getNodeParameter: (name, fallback) => (name === 'actionIds' ? actionIds : fallback),
		getWorkflowStaticData: (scope) => {
			assert.equal(scope, 'node');
			if (mode === 'manual') assert.fail('manual mode must not touch the stored cursor');
			return stored;
		},
		helpers: {
			httpRequestWithAuthentication: async (credential, options) => {
				assert.equal(credential, 'pushWardApi');
				calls.push(options);
				const page = pages.shift();
				if (page instanceof Error) throw page;
				return page;
			},
			returnJsonArray: (items) => items.map((json) => ({ json })),
		},
	};
}

test('the trigger is a polling node with no inputs and no tool mode', () => {
	const { description } = new PushWardTrigger();

	assert.equal(description.name, 'pushWardTrigger');
	assert.equal(description.displayName, 'PushWard Trigger');
	assert.equal(description.polling, true);
	assert.deepEqual(description.group, ['trigger']);
	assert.deepEqual(description.inputs, []);
	assert.equal(description.usableAsTool, undefined);
	assert.deepEqual(
		description.credentials.map(({ name }) => name),
		['pushWardApi'],
	);
});

test('a cold start stores the cursor and emits nothing', async () => {
	const context = poller({ pages: [{ items: [], cursor: '41' }] });

	assert.equal(await pollAnswers.call(context), null);
	assert.deepEqual(context.stored, { cursor: '41' });
	assert.equal(context.calls.length, 1);
	assert.equal(context.calls[0].url, url);
	assert.deepEqual(context.calls[0].qs, {});
});

test('a later poll reads after the cursor, emits oldest first and stores the new cursor', async () => {
	const context = poller({
		stored: { cursor: '41' },
		pages: [{ items: [answer(1), answer(2)], cursor: '43' }],
	});

	assert.deepEqual(await pollAnswers.call(context), [
		[{ json: answer(1) }, { json: answer(2) }],
	]);
	assert.deepEqual(context.calls[0].qs, { after: '41', limit: 100 });
	assert.deepEqual(context.stored, { cursor: '43' });
});

test('a full page is followed by another call from its cursor', async () => {
	const context = poller({
		stored: { cursor: '1' },
		pages: [fullPage('101'), { items: [answer(500)], cursor: '102' }],
	});

	const [items] = await pollAnswers.call(context);

	assert.equal(items.length, 101);
	assert.deepEqual(
		context.calls.map(({ qs }) => qs.after),
		['1', '101'],
	);
	assert.deepEqual(context.stored, { cursor: '102' });
});

test('the page cap stops the loop and the next poll continues from its cursor', async () => {
	const pages = Array.from({ length: 25 }, (_, index) => fullPage(String(index + 2)));
	const context = poller({ stored: { cursor: '1' }, pages });

	const [items] = await pollAnswers.call(context);

	assert.equal(context.calls.length, 20);
	assert.equal(items.length, 2000);
	assert.deepEqual(context.stored, { cursor: '21' });
});

test('Action IDs drops other answers while the cursor still advances', async () => {
	const context = poller({
		stored: { cursor: '1' },
		actionIds: 'approve, reject',
		pages: [{ items: [answer(1), answer(2, 'snooze'), answer(3, 'reject')], cursor: '4' }],
	});

	assert.deepEqual(await pollAnswers.call(context), [
		[{ json: answer(1) }, { json: answer(3, 'reject') }],
	]);
	assert.deepEqual(context.stored, { cursor: '4' });
});

test('a poll whose answers are all filtered out returns null and still advances', async () => {
	const context = poller({
		stored: { cursor: '1' },
		actionIds: 'approve',
		pages: [{ items: [answer(1, 'snooze')], cursor: '2' }],
	});

	assert.equal(await pollAnswers.call(context), null);
	assert.deepEqual(context.stored, { cursor: '2' });
});

test('an empty poll returns null and keeps the cursor', async () => {
	for (const items of [[], null]) {
		const context = poller({ stored: { cursor: '7' }, pages: [{ items, cursor: '7' }] });

		assert.equal(await pollAnswers.call(context), null);
		assert.deepEqual(context.stored, { cursor: '7' });
	}
});

test('manual mode takes a fresh cursor, long-polls and leaves stored data untouched', async () => {
	const context = poller({
		mode: 'manual',
		stored: { cursor: '7' },
		pages: [
			{ items: [], cursor: '90' },
			{ items: [answer(1)], cursor: '91' },
		],
	});

	assert.deepEqual(await pollAnswers.call(context), [[{ json: answer(1) }]]);
	assert.deepEqual(context.calls[0].qs, {});
	assert.deepEqual(context.calls[1].qs, { after: '90', wait: 25 });
	assert.ok(context.calls[1].timeout > 25000);
	assert.deepEqual(context.stored, { cursor: '7' });
});

test('manual mode with no tap returns null', async () => {
	const context = poller({
		mode: 'manual',
		pages: [
			{ items: [], cursor: '90' },
			{ items: [], cursor: '90' },
		],
	});

	assert.equal(await pollAnswers.call(context), null);
});

test('a failed page surfaces as NodeApiError and does not move the cursor', async () => {
	const context = poller({
		stored: { cursor: '1' },
		pages: [fullPage('101'), new Error('boom')],
	});

	await assert.rejects(pollAnswers.call(context), { name: 'NodeApiError' });
	assert.deepEqual(context.stored, { cursor: '1' });
});
