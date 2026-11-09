import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { PushWard } from '../dist/nodes/PushWard/PushWard.node.js';

// n8n-workflow's ESM build has extensionless imports that node cannot resolve
const { NodeHelpers, Workflow } = createRequire(import.meta.url)('n8n-workflow');

const { description } = new PushWard();

const nodeWith = (parameters) => ({
	id: '1',
	name: 'PushWard',
	type: 'n8n-nodes-pushward.pushWard',
	typeVersion: 1,
	position: [0, 0],
	parameters,
});

const operation = (resourceName, value) =>
	description.properties
		.find(
			({ name, displayOptions }) =>
				name === 'operation' && displayOptions.show.resource[0] === resourceName,
		)
		.options.find((option) => option.value === value);

const savedParameters = {
	resource: 'notification',
	operation: 'send',
	title: 'Deploy finished',
	body: 'Build 42 is live',
	additionalFields: {
		collapseId: 'deploy',
		level: 'time-sensitive',
		subtitle: 'prod',
		threadId: 'deploys',
		url: 'https://example.com/deploys/42',
	},
};

test('the node identity saved workflows depend on is unchanged', () => {
	assert.equal(description.name, 'pushWard');
	assert.equal(description.version, 1);
	assert.equal(description.usableAsTool, true);
	assert.deepEqual(
		description.credentials.map(({ name }) => name),
		['pushWardApi'],
	);
});

// n8n leaves default values out of a saved workflow, so resource and operation can be absent
const { resource, operation: savedOperation, ...sparseParameters } = savedParameters;

for (const [label, parameters] of [
	['with every parameter', savedParameters],
	['with defaults left out', sparseParameters],
]) {
	test(`a workflow saved on 0.1.x ${label} still resolves to Send without issues`, () => {
		const node = nodeWith(parameters);

		const resolved = NodeHelpers.getNodeParameters(
			description.properties,
			parameters,
			true,
			false,
			node,
			description,
		);
		assert.equal(resolved.resource, resource);
		assert.equal(resolved.operation, savedOperation);
		assert.equal(resolved.title, savedParameters.title);
		assert.equal(resolved.body, savedParameters.body);
		assert.deepEqual(resolved.additionalFields, savedParameters.additionalFields);
		assert.equal(
			NodeHelpers.getNodeParametersIssues(
				description.properties,
				{ ...node, parameters: resolved },
				description,
			),
			null,
		);
	});
}

test('Send keeps its action and its source values', () => {
	const send = operation('notification', 'send');

	assert.equal(send.action, 'Send notification');
	assert.deepEqual(send.routing.request.body, { source: 'n8n', source_display_name: 'n8n' });
});

test('Return All repeats status and page size next to the cursor', () => {
	const node = nodeWith({});
	const workflow = new Workflow({
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes: { getByNameAndVersion: () => ({ description }) },
	});
	const { pagination } = description.properties.find(({ name }) => name === 'returnAll').routing
		.operations;

	// n8n sends { ...options, ...request }, so this qs is the whole query of every page
	const query = ($response) =>
		workflow.expression.getParameterValue(
			pagination.properties.request,
			null,
			0,
			0,
			node.name,
			[{ json: {} }],
			'manual',
			{ $request: { qs: { status: 'sent', limit: '100' } }, $response },
			undefined,
			false,
		).qs;

	assert.deepEqual(query({}), { status: 'sent', limit: '100', cursor: undefined });
	assert.deepEqual(query({ body: { next_cursor: 'abc' } }), {
		status: 'sent',
		limit: '100',
		cursor: 'abc',
	});
});

async function requestFor({ routing }, parameters) {
	const context = {
		getCredentials: async () => ({ apiKey: 'k' }),
		getNode: () => nodeWith(parameters),
		getNodeParameter: (name, fallback) => parameters[name] ?? fallback,
		getTimezone: () => 'UTC',
	};
	let request = { body: { ...routing.request.body }, headers: {} };
	for (const preSend of routing.send.preSend) {
		request = await preSend.call(context, request);
	}
	return request;
}

const source = { source: 'n8n', source_display_name: 'n8n' };

test('Send merges its mapped options into the request', async () => {
	assert.deepEqual(
		await requestFor(operation('notification', 'send'), {
			actions: { button: [{ id: 'ok', title: 'OK' }] },
			acknowledge: { settings: { repeatSeconds: 60, tags: 'deploys' } },
			additionalFields: { idempotencyKey: 'run-1' },
		}),
		{
			body: {
				...source,
				actions: [{ id: 'ok', title: 'OK' }],
				acknowledge: { repeat_seconds: 60 },
				tags: ['deploys'],
			},
			headers: { 'Idempotency-Key': 'run-1' },
		},
	);
});

test('Create merges a recurring schedule and the options into the request', async () => {
	assert.deepEqual(
		await requestFor(operation('scheduledNotification', 'create'), {
			scheduleType: 'recurring',
			cron: '@daily',
			timezone: 'Europe/Warsaw',
			recurrenceOptions: {
				count: 3,
				sendAt: '2026-12-01T00:00:00Z',
				until: '2026-12-31T00:00:00Z',
			},
			acknowledge: { settings: { repeatSeconds: 60, callbackUrl: 'https://example.com/ack' } },
			additionalFields: { idempotencyKey: 'run-1' },
		}),
		{
			body: {
				...source,
				acknowledge: { repeat_seconds: 60 },
				callback_url: 'https://example.com/ack',
				send_at: '2026-12-01T00:00:00.000Z',
				recurrence: {
					cron: '@daily',
					timezone: 'Europe/Warsaw',
					count: 3,
					until: '2026-12-31T00:00:00.000Z',
				},
			},
			headers: { 'Idempotency-Key': 'run-1' },
		},
	);
});

test('Create reads a one-time send time in the workflow time zone', async () => {
	const { body } = await requestFor(operation('scheduledNotification', 'create'), {
		scheduleType: 'oneTime',
		sendAt: '2026-11-20T18:00:00',
	});

	assert.deepEqual(body, { ...source, send_at: '2026-11-20T18:00:00.000Z' });
});

test('a value a mapper refuses fails the item with a node error', async () => {
	await assert.rejects(
		requestFor(operation('notification', 'send'), { additionalFields: { snooze: 'soon' } }),
		{ name: 'NodeOperationError', message: /got "soon"/ },
	);
});
