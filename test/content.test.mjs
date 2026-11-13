import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { PushWard } from '../dist/nodes/PushWard/PushWard.node.js';
import { activityTemplates } from '../dist/nodes/PushWard/resources/activity/templates.js';
import { widgetTemplates } from '../dist/nodes/PushWard/resources/widget/templates.js';
import { mapContent, toRfc3339, toUnixSeconds } from '../dist/nodes/PushWard/shared/mappers.js';

const { NodeHelpers } = createRequire(import.meta.url)('n8n-workflow');

const { description } = new PushWard();

const activity = (name, values) =>
	mapContent(activityTemplates, name, values, (value) => toUnixSeconds(value, 'UTC'));
const widget = (name, values) =>
	mapContent(widgetTemplates, name, values, (value) => toRfc3339(value, 'UTC'));

const operationsOf = (resource) =>
	description.properties.find(
		({ name, displayOptions }) =>
			name === 'operation' && displayOptions.show.resource[0] === resource,
	).options;

const operation = (resource, value) =>
	operationsOf(resource).find((option) => option.value === value);

const mergePatch = { 'Content-Type': 'application/merge-patch+json' };

const context = (parameters, helpers = {}) => ({
	getNode: () => ({ id: '1', name: 'PushWard', type: 'x', typeVersion: 1, position: [0, 0] }),
	getNodeParameter: (name, fallback) => parameters[name] ?? fallback,
	getTimezone: () => 'UTC',
	helpers,
});

async function requestFor({ routing }, parameters, helpers) {
	let request = { body: { ...routing.request.body }, headers: { ...routing.request.headers } };
	for (const preSend of routing.send.preSend) {
		request = await preSend.call(context(parameters, helpers), request);
	}
	return request;
}

// every template with the wire keys its required fields must reach
const activityCases = {
	alert: [{ alertSeverity: 'critical' }, { severity: 'critical' }],
	approval: [
		{
			approvalOptions: {
				item: [
					{ id: 'yes', title: 'Yes' },
					{ id: 'no', title: 'No' },
				],
			},
		},
		{
			options: [
				{ id: 'yes', title: 'Yes' },
				{ id: 'no', title: 'No' },
			],
		},
	],
	board: [
		{ boardTiles: { item: [{ label: 'CPU', value: '42', trend: '' }] } },
		{ tiles: [{ label: 'CPU', value: '42' }] },
	],
	countdown: [{}, {}],
	gauge: [
		{ gaugeValue: 5, gaugeMinValue: 1, gaugeMaxValue: 10 },
		{ value: 5, min_value: 1, max_value: 10 },
	],
	generic: [{}, {}],
	log: [{ logLines: { item: [{ text: 'started', level: '' }] } }, { lines: [{ text: 'started' }] }],
	media: [{}, {}],
	steps: [
		{ stepsTotalSteps: 4, stepsCurrentStep: 1 },
		{ total_steps: 4, current_step: 1 },
	],
	timeline: [{ timelineValue: { item: [{ name: 'cpu', value: 42 }] } }, { value: { cpu: 42 } }],
};

const widgetCases = {
	battery: [
		{ batteryDevices: { item: [{ name: 'Phone', level: 80 }] } },
		{ devices: [{ name: 'Phone', level: 80 }] },
	],
	countdown: [
		{ countdownEndDate: '2026-11-20T18:00:00Z' },
		{ end_date: '2026-11-20T18:00:00.000Z' },
	],
	flow: [{ flowFlow: '{"output":{"rate":1}}' }, { flow: { output: { rate: 1 } } }],
	gauge: [
		{ gaugeValue: 5, gaugeMinValue: 1, gaugeMaxValue: 10 },
		{ value: 5, min_value: 1, max_value: 10 },
	],
	progress: [{ progressValue: 0.5 }, { value: 0.5 }],
	schedule: [
		{ schedulePeriods: { item: [{ start: '2026-11-20T18:00:00Z', value: 3, level: '' }] } },
		{ periods: [{ start: '2026-11-20T18:00:00.000Z', value: 3 }] },
	],
	stat_list: [
		{ statListStatRows: { item: [{ label: 'Up', value: '99' }] } },
		{ stat_rows: [{ label: 'Up', value: '99' }] },
	],
	status: [{}, {}],
	trend: [
		{ trendValue: 2, trendPoints: '1, 2.5' },
		{ value: 2, points: [1, 2.5] },
	],
	value: [{}, {}],
};

test('both resources cover all 10 templates and their operations', () => {
	const values = (list) => list.map(({ value }) => value).sort();

	assert.deepEqual(values(activityTemplates), Object.keys(activityCases).sort());
	assert.deepEqual(values(widgetTemplates), Object.keys(widgetCases).sort());
	assert.deepEqual(values(operationsOf('activity')), [
		'delete',
		'end',
		'get',
		'getAll',
		'start',
		'update',
	]);
	assert.deepEqual(values(operationsOf('widget')), ['create', 'delete', 'get', 'getAll', 'update']);
});

test('notification stays the default resource', () => {
	const resource = description.properties.find(({ name }) => name === 'resource');
	assert.equal(resource.default, 'notification');
	assert.deepEqual(
		resource.options.map(({ value }) => value),
		['account', 'email', 'activity', 'notification', 'scheduledNotification', 'widget'],
	);
});

for (const [name, [values, wire]] of Object.entries(activityCases)) {
	test(`activity ${name} maps its required fields to wire keys`, () => {
		assert.deepEqual(activity(name, values), { template: name, ...wire });
	});
}

for (const [name, [values, wire]] of Object.entries(widgetCases)) {
	test(`widget ${name} maps its required fields to wire keys`, () => {
		assert.deepEqual(widget(name, values), { template: name, ...wire });
	});
}

test('zero values are kept and blank strings dropped', () => {
	assert.deepEqual(
		activity('gauge', { gaugeValue: 0, gaugeMinValue: 0, gaugeMaxValue: 0, gaugeUnit: '' }),
		{
			template: 'gauge',
			value: 0,
			min_value: 0,
			max_value: 0,
		},
	);
	assert.deepEqual(
		activity('generic', { genericProgress: 0, genericSubtitle: '', genericIcon: null }),
		{
			template: 'generic',
			progress: 0,
		},
	);
	assert.deepEqual(widget('progress', { progressValue: 0 }), { template: 'progress', value: 0 });
	assert.deepEqual(widget('trend', { trendValue: 0, trendMinValue: 0, trendPoints: '0, 0' }), {
		template: 'trend',
		value: 0,
		min_value: 0,
		points: [0, 0],
	});
	// a false the user added is sent, the card default is true
	assert.deepEqual(activity('countdown', { countdownShowRuler: false }), {
		template: 'countdown',
		show_ruler: false,
	});
});

test('numbers and booleans from an expression are coerced or refused', () => {
	assert.deepEqual(activity('gauge', { gaugeValue: '7.5', gaugeMinValue: ' ' }), {
		template: 'gauge',
		value: 7.5,
	});
	assert.throws(() => activity('gauge', { gaugeValue: 'hot' }), /Value takes a number, got "hot"/);
	assert.deepEqual(activity('generic', { genericLiveProgress: 'false' }), {
		template: 'generic',
		live_progress: false,
	});
});

test('a number field refuses anything but a number or numeric text', () => {
	for (const gaugeValue of [[], [5], true, {}]) {
		assert.throws(() => activity('gauge', { gaugeValue }), /Value takes a number/);
	}
});

test('a boolean field refuses anything but true or false', () => {
	for (const charging of [1, 'True', 'on']) {
		assert.throws(
			() =>
				widget('battery', { batteryDevices: { item: [{ name: 'Phone', level: 1, charging }] } }),
			/Charging takes true or false/,
		);
	}
	assert.throws(() => activity('countdown', { countdownAlarm: 0 }), /Alarm takes true or false/);
});

test('activity dates become Unix seconds', () => {
	assert.deepEqual(activity('countdown', { countdownEndDate: '2026-11-20T18:00:00Z' }), {
		template: 'countdown',
		end_date: Date.UTC(2026, 10, 20, 18) / 1000,
	});
	assert.deepEqual(
		activity('log', { logLines: { item: [{ text: 'x', at: '2026-11-20T18:00:00.750Z' }] } }).lines,
		[{ text: 'x', at: Date.UTC(2026, 10, 20, 18) / 1000 }],
	);
	assert.equal(
		toUnixSeconds('2026-01-15T10:00:00', 'Europe/Warsaw'),
		Date.UTC(2026, 0, 15, 9) / 1000,
	);
	assert.equal(toUnixSeconds('', 'UTC'), undefined);
	assert.throws(() => activity('countdown', { countdownEndDate: 'soon' }));
});

test('widget dates become RFC 3339', () => {
	assert.deepEqual(widget('progress', { progressStartDate: '2026-11-20T18:00:00Z' }), {
		template: 'progress',
		start_date: '2026-11-20T18:00:00.000Z',
	});
});

test('fixed collections unwrap, blank sub-fields drop and empty rows vanish', () => {
	assert.deepEqual(
		activity('board', {
			boardTiles: {
				item: [
					{ label: 'CPU', value: 0, unit: '', icon: '', color: '', trend: 'up' },
					{ label: '', value: '', unit: '' },
				],
			},
		}),
		{ template: 'board', tiles: [{ label: 'CPU', value: '0', trend: 'up' }] },
	);
	assert.deepEqual(activity('board', { boardTiles: { item: [{ label: '' }] } }), {
		template: 'board',
	});
	assert.deepEqual(activity('board', { boardTiles: {} }), { template: 'board' });
	assert.deepEqual(
		activity('timeline', {
			timelineValue: {
				item: [
					{ name: 'cpu', value: 0 },
					{ name: '', value: 5 },
					{ name: 'mem', value: '' },
				],
			},
			timelineUnits: { item: [{ name: 'cpu', value: '%' }] },
		}),
		{ template: 'timeline', value: { cpu: 0 }, units: { cpu: '%' } },
	);
	assert.deepEqual(
		widget('battery', {
			batteryDevices: { item: [{ name: 'Phone', level: 0, charging: false, icon: '', color: '' }] },
		}).devices,
		[{ name: 'Phone', level: 0, charging: false }],
	);
});

test('comma lists parse and a non-numeric point is refused', () => {
	assert.deepEqual(activity('steps', { stepsStepLabels: 'Build, Test ,, Deploy' }), {
		template: 'steps',
		step_labels: ['Build', 'Test', 'Deploy'],
	});
	assert.deepEqual(widget('trend', { trendPoints: ' 1,2.5 ,-3 ' }).points, [1, 2.5, -3]);
	assert.deepEqual(widget('trend', { trendPoints: [1, '2'] }).points, [1, 2]);
	assert.equal(widget('trend', { trendPoints: ' , ' }).points, undefined);
	assert.equal(widget('trend', { trendPoints: [] }).points, undefined);
	assert.throws(() => widget('trend', { trendPoints: '1,two' }), /got "two"/);
	assert.throws(() => widget('trend', { trendPoints: '1,,3' }), /Points has a blank entry/);
	assert.throws(() => widget('trend', { trendPoints: [1, null, 3] }), /Points has a blank entry/);
});

test('Extra Content merges last and drops server-owned keys', () => {
	assert.deepEqual(
		activity('gauge', {
			gaugeValue: 1,
			gaugeUnit: 'mapped',
			extraContent: '{"unit":"extra","tap_action":{"url":"https://example.com"},"answer":{"x":1}}',
		}),
		{ template: 'gauge', value: 1, unit: 'extra', tap_action: { url: 'https://example.com' } },
	);
	assert.deepEqual(widget('value', { extraContent: { tap_action: { url: 'x' } } }), {
		template: 'value',
		tap_action: { url: 'x' },
	});
	assert.deepEqual(activity('generic', { extraContent: '' }), { template: 'generic' });
	assert.deepEqual(activity('generic', { extraContent: '{}' }), { template: 'generic' });
});

for (const [label, extraContent, message] of [
	['invalid JSON', '{nope', /not valid JSON/],
	['a JSON array', '[1]', /must be a JSON object/],
	['JSON null', 'null', /must be a JSON object/],
	['a JSON number', '1', /must be a JSON object/],
]) {
	test(`Extra Content as ${label} is refused`, () => {
		assert.throws(() => activity('generic', { extraContent }), message);
	});
}

test('a Flow value that is not a JSON object is refused', () => {
	assert.throws(() => widget('flow', { flowFlow: '[]' }), /Flow \(JSON\) must be a JSON object/);
});

const started = {
	slug: 'build-42',
	name: 'Build 42',
	template: 'gauge',
	gaugeValue: 0,
	gaugeMinValue: 0,
	gaugeMaxValue: 10,
	contentFields: { gaugeUnit: '%' },
	additionalFields: {
		priority: 0,
		endedTtl: 300,
		staleTtl: 600,
		dismissalTtl: 0,
		sound: 'chime',
		target: { recipients: { groups: 'ops' } },
	},
};

test('Start posts the activity first, then returns the merge-patch with ongoing', async () => {
	const calls = [];
	const request = await requestFor(operation('activity', 'start'), started, {
		httpRequestWithAuthentication: async (credential, options) => {
			calls.push({ credential, options });
		},
	});

	assert.deepEqual(calls, [
		{
			credential: 'pushWardApi',
			options: {
				method: 'POST',
				url: 'https://api.pushward.app/activities',
				body: {
					slug: 'build-42',
					name: 'Build 42',
					priority: 0,
					ended_ttl: 300,
					stale_ttl: 600,
					dismissal_ttl: 0,
					target: { groups: ['ops'] },
				},
				json: true,
			},
		},
	]);
	assert.deepEqual(request, {
		body: {
			state: 'ongoing',
			content: { template: 'gauge', value: 0, min_value: 0, max_value: 10, unit: '%' },
			sound: 'chime',
		},
		headers: mergePatch,
	});
});

test('Start without optional fields posts only slug and name', async () => {
	const calls = [];
	await requestFor(
		operation('activity', 'start'),
		{ slug: 'a', name: 'A', template: 'generic' },
		{
			httpRequestWithAuthentication: async (_, options) => {
				calls.push(options.body);
			},
		},
	);
	assert.deepEqual(calls, [{ slug: 'a', name: 'A' }]);
});

test('a failed POST stops Start with a NodeApiError and no PATCH', async () => {
	await assert.rejects(
		requestFor(operation('activity', 'start'), started, {
			httpRequestWithAuthentication: async () => {
				throw new Error('boom');
			},
		}),
		{ name: 'NodeApiError' },
	);
});

test('a value the mapper refuses stops Start before the POST', async () => {
	let posts = 0;
	await assert.rejects(
		requestFor(
			operation('activity', 'start'),
			{ ...started, contentFields: { extraContent: '{nope' } },
			{
				httpRequestWithAuthentication: async () => {
					posts += 1;
				},
			},
		),
		{ name: 'NodeOperationError', message: /not valid JSON/ },
	);
	assert.equal(posts, 0);
});

for (const [template, parameters] of [
	['approval', { approvalOptions: {} }],
	['board', {}],
	['log', { logLines: { item: [{ text: '', level: '' }] } }],
	['timeline', { timelineValue: { item: [{ name: '', value: 1 }] } }],
]) {
	test(`Start refuses ${template} without its required list and sends nothing`, async () => {
		let posts = 0;
		await assert.rejects(
			requestFor(
				operation('activity', 'start'),
				{ slug: 'a', name: 'A', template, ...parameters },
				{
					httpRequestWithAuthentication: async () => {
						posts += 1;
					},
				},
			),
			{ name: 'NodeOperationError', message: /template needs/ },
		);
		assert.equal(posts, 0);
	});
}

test('Extra Content can supply a required key on Start', async () => {
	let posts = 0;
	const tiles = [{ label: 'CPU', value: '42' }];
	const request = await requestFor(
		operation('activity', 'start'),
		{
			slug: 'a',
			name: 'A',
			template: 'board',
			contentFields: { extraContent: JSON.stringify({ tiles }) },
		},
		{
			httpRequestWithAuthentication: async () => {
				posts += 1;
			},
		},
	);
	assert.equal(posts, 1);
	assert.deepEqual(request.body.content, { template: 'board', tiles });
});

test('Create refuses a template without its required content', async () => {
	const create = (parameters) =>
		requestFor(operation('widget', 'create'), { slug: 'a', name: 'A', ...parameters });

	await assert.rejects(create({ template: 'battery' }), {
		name: 'NodeOperationError',
		message: /Battery template needs Devices/,
	});
	await assert.rejects(create({ template: 'flow', flowFlow: '{}' }), {
		name: 'NodeOperationError',
		message: /Flow template needs Flow \(JSON\)/,
	});
});

test('each operation sends the dates its resource takes', async () => {
	const at = '2026-11-20T18:00:00Z';
	const seconds = Date.UTC(2026, 10, 20, 18) / 1000;
	const rfc3339 = '2026-11-20T18:00:00.000Z';
	const inContentFields = { template: 'countdown', contentFields: { countdownEndDate: at } };
	const endDate = async (resource, value, parameters) =>
		(
			await requestFor(operation(resource, value), parameters, {
				httpRequestWithAuthentication: async () => {},
			})
		).body.content.end_date;

	assert.equal(
		await endDate('activity', 'start', { slug: 'a', name: 'A', ...inContentFields }),
		seconds,
	);
	assert.equal(await endDate('activity', 'update', inContentFields), seconds);
	assert.equal(
		await endDate('widget', 'create', {
			slug: 'a',
			name: 'A',
			template: 'countdown',
			countdownEndDate: at,
		}),
		rfc3339,
	);
	assert.equal(await endDate('widget', 'update', inContentFields), rfc3339);
});

test('Start, Update and End go out as PATCH', () => {
	for (const [resource, value] of [
		['activity', 'start'],
		['activity', 'update'],
		['activity', 'end'],
		['widget', 'update'],
	]) {
		assert.equal(
			operation(resource, value).routing.request.method,
			'PATCH',
			`${resource} ${value}`,
		);
	}
});

test('Keep Current sends no template, so the stored layout survives', async () => {
	assert.deepEqual(
		await requestFor(operation('activity', 'update'), {
			template: '',
			contentFields: { extraContent: '{"state":"Halfway"}' },
		}),
		{ body: { content: { state: 'Halfway' } }, headers: mergePatch },
	);
	assert.deepEqual(
		await requestFor(operation('widget', 'update'), {
			template: '',
			contentFields: {},
			additionalFields: { name: 'Energy' },
		}),
		{ body: { name: 'Energy' }, headers: mergePatch },
	);
});

test('Update defaults to Keep Current and Start and Create to a real template', () => {
	const defaultOf = (resource, operationName) =>
		description.properties.find(
			({ name, displayOptions }) =>
				name === 'template' &&
				displayOptions.show.resource.includes(resource) &&
				displayOptions.show.operation.includes(operationName),
		).default;

	assert.equal(defaultOf('activity', 'update'), '');
	assert.equal(defaultOf('widget', 'update'), '');
	assert.equal(defaultOf('activity', 'start'), 'generic');
	assert.equal(defaultOf('widget', 'create'), 'value');
});

test('Update sends template plus only the added fields', async () => {
	assert.deepEqual(
		await requestFor(operation('activity', 'update'), {
			template: 'gauge',
			contentFields: { gaugeValue: 0 },
			additionalFields: { sound: 'ding' },
		}),
		{ body: { content: { template: 'gauge', value: 0 }, sound: 'ding' }, headers: mergePatch },
	);
	assert.deepEqual(
		await requestFor(operation('activity', 'update'), { template: 'steps', contentFields: {} }),
		{ body: { content: { template: 'steps' } }, headers: mergePatch },
	);
	assert.deepEqual(
		await requestFor(operation('widget', 'update'), {
			template: 'trend',
			contentFields: { trendUnit: 'kWh' },
			additionalFields: { name: 'Energy', pushThrottle: 60, staleAfter: 3600 },
		}),
		{
			body: {
				content: { template: 'trend', unit: 'kWh' },
				name: 'Energy',
				push_throttle: 60,
				stale_after: 3600,
			},
			headers: mergePatch,
		},
	);
});

test('End sends ended, and dismissal_ttl only when given', async () => {
	assert.deepEqual(
		await requestFor(operation('activity', 'end'), { additionalFields: { dismissalTtl: 0 } }),
		{ body: { state: 'ended', dismissal_ttl: 0 }, headers: mergePatch },
	);
	assert.deepEqual(await requestFor(operation('activity', 'end'), {}), {
		body: { state: 'ended' },
		headers: mergePatch,
	});
});

test('widget Create posts slug, name, content and settings', async () => {
	const { routing } = operation('widget', 'create');

	assert.deepEqual(routing.request, { method: 'POST', url: '/widgets' });
	assert.deepEqual(
		await requestFor(operation('widget', 'create'), {
			slug: 'home',
			name: 'Home',
			template: 'gauge',
			gaugeValue: 0,
			gaugeMinValue: 0,
			gaugeMaxValue: 100,
			additionalFields: {
				pushThrottle: 60,
				staleAfter: 3600,
				target: { recipients: { tags: 'rack' } },
			},
		}),
		{
			body: {
				slug: 'home',
				name: 'Home',
				content: { template: 'gauge', value: 0, min_value: 0, max_value: 100 },
				push_throttle: 60,
				stale_after: 3600,
				target: { tags: ['rack'] },
			},
			headers: {},
		},
	);
});

test('slugs are URL-encoded in every path', () => {
	for (const [resource, values] of [
		['activity', ['delete', 'end', 'get', 'start', 'update']],
		['widget', ['delete', 'get', 'update']],
	]) {
		for (const value of values) {
			assert.match(
				operation(resource, value).routing.request.url,
				/encodeURIComponent\(\$parameter\.slug\)/,
			);
		}
	}
});

test('Get Many unwraps items, and activities page with after', () => {
	const items = { type: 'rootProperty', properties: { property: 'items' } };

	assert.deepEqual(operation('activity', 'getAll').routing.output.postReceive, [items]);
	assert.deepEqual(operation('widget', 'getAll').routing.output.postReceive, [items]);

	const shownFor = (resource) =>
		description.properties.filter(
			({ name, displayOptions }) =>
				['returnAll', 'limit'].includes(name) && displayOptions.show.resource?.[0] === resource,
		);
	assert.equal(shownFor('widget').length, 0);
	const [returnAll] = shownFor('activity');
	assert.deepEqual(returnAll.routing.operations.pagination.properties.request.qs, {
		limit: '={{ $request.qs?.limit }}',
		after: '={{ $response.body?.next_cursor }}',
	});
});

test('Delete returns a confirmation item for the empty response', () => {
	for (const resource of ['activity', 'widget']) {
		assert.deepEqual(operation(resource, 'delete').routing.output.postReceive, [
			{
				type: 'set',
				properties: { value: '={{ { "slug": $parameter.slug, "deleted": true } }}' },
			},
		]);
	}
});

function assertUniqueNames(properties) {
	const seen = new Set();
	for (const property of properties) {
		const key = JSON.stringify([property.name, property.displayOptions]);
		assert.equal(seen.has(key), false, `duplicate ${key}`);
		seen.add(key);
		for (const nested of [property.options, property.values]) {
			if (nested?.[0]?.displayName) assertUniqueNames(nested);
		}
		for (const group of property.options ?? []) {
			if (group.values) assertUniqueNames(group.values);
		}
	}
}

test('generated properties have unique names per display condition', () => {
	assertUniqueNames(description.properties);

	// the two resources share template names, the display conditions tell them apart
	const gauge = description.properties.filter(({ name }) => name === 'gaugeValue');
	assert.deepEqual(
		gauge.map(({ displayOptions }) => displayOptions.show.resource[0]),
		['activity', 'widget'],
	);
});

const requiredByTemplate = (resource, createOperation) => {
	const found = {};
	for (const { name, required, displayOptions } of description.properties) {
		const show = displayOptions?.show;
		if (!required || show?.resource?.[0] !== resource || !show.template) continue;
		assert.deepEqual(show.operation, [createOperation]);
		(found[show.template[0]] ??= []).push(name);
	}
	return found;
};

test('Start and Create require exactly the required fields of the template', () => {
	assert.deepEqual(requiredByTemplate('activity', 'start'), {
		alert: ['alertSeverity'],
		approval: ['approvalOptions'],
		board: ['boardTiles'],
		gauge: ['gaugeValue', 'gaugeMinValue', 'gaugeMaxValue'],
		log: ['logLines'],
		steps: ['stepsTotalSteps', 'stepsCurrentStep'],
		timeline: ['timelineValue'],
	});
	assert.deepEqual(requiredByTemplate('widget', 'create'), {
		battery: ['batteryDevices'],
		countdown: ['countdownEndDate'],
		flow: ['flowFlow'],
		gauge: ['gaugeValue', 'gaugeMinValue', 'gaugeMaxValue'],
		schedule: ['schedulePeriods'],
		stat_list: ['statListStatRows'],
		trend: ['trendValue', 'trendPoints'],
	});
});

const contentFields = (resource, operationValue) =>
	description.properties.find(
		({ name, displayOptions }) =>
			name === 'contentFields' &&
			displayOptions.show.resource[0] === resource &&
			displayOptions.show.operation[0] === operationValue,
	).options;

test('the Content Fields collections hold the optional fields, Update every field', () => {
	const start = contentFields('activity', 'start').map(({ name }) => name);
	const update = contentFields('activity', 'update').map(({ name }) => name);

	assert.equal(start.includes('gaugeValue'), false);
	assert.equal(start.includes('gaugeUnit'), true);
	assert.equal(update.includes('gaugeValue'), true);
	assert.equal(start.includes('extraContent'), true);
	assert.equal(update.includes('extraContent'), true);
	assert.equal(start.includes('approvalUrl'), false);
	assert.equal(update.includes('approvalUrl'), false);
	assert.equal(update.includes('genericUrl'), true);

	for (const option of contentFields('activity', 'update')) {
		assert.equal(option.required, undefined, option.name);
	}
});

test('Style offers refined and rethink on every widget, original only where the API keeps it', () => {
	for (const operationValue of ['create', 'update']) {
		const styles = contentFields('widget', operationValue).filter(
			({ displayName }) => displayName === 'Style',
		);
		const offered = Object.fromEntries(
			styles.map(({ displayOptions, options }) => [
				displayOptions.show['/template'][0],
				options.map(({ value }) => value),
			]),
		);
		assert.deepEqual(Object.keys(offered).sort(), Object.keys(widgetCases).sort());
		for (const [template, values] of Object.entries(offered)) {
			assert.deepEqual(
				values,
				['battery', 'flow', 'heatmap', 'stat_list', 'status'].includes(template)
					? ['original', 'refined', 'rethink']
					: ['refined', 'rethink'],
				`${operationValue} ${template}`,
			);
		}
		// added and left alone it must be refined, not the first option (original)
		for (const { name, default: picked } of styles) assert.equal(picked, 'refined', name);
	}
});

test('Style is sent only when added, and Extra Content null clears it on Update', async () => {
	const create = (template, fields) =>
		requestFor(operation('widget', 'create'), {
			slug: 'a',
			name: 'A',
			template,
			contentFields: fields,
		});
	const update = (template, fields) =>
		requestFor(operation('widget', 'update'), { template, contentFields: fields });

	assert.deepEqual((await create('status', {})).body.content, { template: 'status' });
	assert.deepEqual((await create('status', { statusStyle: 'original' })).body.content, {
		template: 'status',
		style: 'original',
	});
	// a style picked under another template is never read
	assert.deepEqual((await create('value', { statusStyle: 'original' })).body.content, {
		template: 'value',
	});
	assert.deepEqual(await update('value', { valueStyle: 'rethink' }), {
		body: { content: { template: 'value', style: 'rethink' } },
		headers: mergePatch,
	});
	assert.deepEqual(await update('', { extraContent: '{"style": null}' }), {
		body: { content: { style: null } },
		headers: mergePatch,
	});
});

test('n8n keeps the current template fields and drops another template', () => {
	const parameters = {
		resource: 'activity',
		operation: 'start',
		slug: 'a',
		name: 'A',
		template: 'gauge',
		gaugeValue: 1,
		gaugeMinValue: 0,
		gaugeMaxValue: 2,
		contentFields: { gaugeUnit: '%', timelineScale: 'linear' },
	};
	const node = {
		id: '1',
		name: 'PushWard',
		type: 'n8n-nodes-pushward.pushWard',
		typeVersion: 1,
		position: [0, 0],
		parameters,
	};

	const resolved = NodeHelpers.getNodeParameters(
		description.properties,
		parameters,
		true,
		false,
		node,
		description,
	);
	assert.deepEqual(resolved.contentFields, { gaugeUnit: '%' });
	assert.equal(resolved.gaugeValue, 1);
	assert.equal(
		NodeHelpers.getNodeParametersIssues(
			description.properties,
			{ ...node, parameters: resolved },
			description,
		),
		null,
	);

	const incomplete = { ...resolved, alertSeverity: undefined, template: 'trend' };
	const issues = NodeHelpers.getNodeParametersIssues(
		description.properties,
		{ ...node, parameters: { ...incomplete, resource: 'widget', operation: 'create' } },
		description,
	);
	assert.deepEqual(Object.keys(issues.parameters), ['trendPoints']);
});

test('option lists the linter sorts stay sorted and text stays ASCII', () => {
	const names = (list) => list.map(({ name }) => name);
	const template = (resource) =>
		description.properties.find(
			({ name, displayOptions }) =>
				name === 'template' && displayOptions.show.resource[0] === resource,
		).options;

	for (const resource of ['activity', 'widget']) {
		assert.deepEqual(names(template(resource)), names(template(resource)).slice().sort());
		const fields = contentFields(resource, 'update').map(({ displayName }) => displayName);
		assert.deepEqual(
			fields,
			fields.slice().sort((a, b) => a.localeCompare(b)),
		);
	}
	assert.doesNotMatch(JSON.stringify(description), /[^\x00-\x7F]/);
});
