import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { PushWard } from '../dist/nodes/PushWard/PushWard.node.js';

// n8n-workflow's ESM build has extensionless imports that node cannot resolve
const { NodeHelpers } = createRequire(import.meta.url)('n8n-workflow');

const { description } = new PushWard();

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
const { resource, operation, ...sparseParameters } = savedParameters;

for (const [label, parameters] of [
	['with every parameter', savedParameters],
	['with defaults left out', sparseParameters],
]) {
	test(`a workflow saved on 0.1.x ${label} still resolves to Send without issues`, () => {
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
		assert.equal(resolved.resource, resource);
		assert.equal(resolved.operation, operation);
		assert.equal(resolved.title, savedParameters.title);
		assert.equal(resolved.body, savedParameters.body);
		assert.deepEqual(resolved.additionalFields, savedParameters.additionalFields);
		assert.equal(
			NodeHelpers.getNodeParametersIssues(description.properties, node, description),
			null,
		);
	});
}

test('Send keeps its action and its source values', () => {
	const send = description.properties
		.find(
			({ name, displayOptions }) =>
				name === 'operation' && displayOptions.show.resource[0] === 'notification',
		)
		.options.find(({ value }) => value === 'send');

	assert.equal(send.action, 'Send notification');
	assert.deepEqual(send.routing.request.body, { source: 'n8n', source_display_name: 'n8n' });
});
