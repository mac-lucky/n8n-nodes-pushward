import assert from 'node:assert/strict';
import { createDecipheriv, hkdfSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { PushWardApi } from '../dist/credentials/PushWardApi.credentials.js';
import { PushWard } from '../dist/nodes/PushWard/PushWard.node.js';
import { seal, sealNotificationBody } from '../dist/nodes/PushWard/shared/encryption.js';
import { sealNotification } from '../dist/nodes/PushWard/shared/preSend.js';

const vectors = JSON.parse(readFileSync(new URL('./e2e-vectors-v1.json', import.meta.url), 'utf8'));
const { key_hex: keyHex, kid } = vectors.seal[0];

function open(envelope, hex = keyHex) {
	const [, envelopeKid, data] = envelope.split('.');
	const raw = Buffer.from(data, 'base64url');
	const enc = hkdfSync(
		'sha256',
		Buffer.from(hex, 'hex'),
		Buffer.alloc(0),
		'pushward/e2e/v1/enc',
		32,
	);
	const decipher = createDecipheriv('aes-256-gcm', Buffer.from(enc), raw.subarray(0, 12));
	decipher.setAAD(Buffer.from(`pw1.${envelopeKid}`));
	decipher.setAuthTag(raw.subarray(-16));
	return Buffer.concat([decipher.update(raw.subarray(12, -16)), decipher.final()]);
}

for (const vector of vectors.seal) {
	test(`seal matches the shared vector ${vector.name}`, () => {
		assert.equal(
			seal(vector.key_hex, vector.plaintext, Buffer.from(vector.nonce_hex, 'hex')),
			vector.envelope,
		);
	});
}

test('a sealed notification opens to the same JSON, in wire order and padded', () => {
	const { encrypted } = sealNotificationBody(keyHex, {
		url: 'https://example.com/1',
		body: 'caf\u{e9} \u{1F525}',
		title: 'Deploy',
		subtitle: 'prod',
	});

	assert.match(encrypted, new RegExp(`^pw1\\.${kid}\\.[A-Za-z0-9_-]+$`));
	const opened = open(encrypted);
	assert.equal(opened.length % 64, 0);
	assert.equal(
		opened.toString().trimEnd(),
		'{"title":"Deploy","subtitle":"prod","body":"caf\u{e9} \u{1F525}","url":"https://example.com/1"}',
	);
});

test('only the fields that are set are sealed', () => {
	const { encrypted } = sealNotificationBody(keyHex, {
		title: 'T',
		subtitle: undefined,
		body: 'B',
	});

	assert.equal(open(encrypted).toString().trimEnd(), '{"title":"T","body":"B"}');
});

test('padding is left off when it would overflow the envelope', () => {
	const body = 'x'.repeat(2241);
	const { encrypted } = sealNotificationBody(keyHex, { title: 'T', body });

	assert.equal(open(encrypted).length, 2264);
	assert.ok(encrypted.length <= 3072);
});

test('two sends of the same text use different nonces', () => {
	const fields = { title: 'T', body: 'B' };

	assert.notEqual(
		sealNotificationBody(keyHex, fields).encrypted,
		sealNotificationBody(keyHex, fields).encrypted,
	);
});

const { description } = new PushWard();
const operation = (resource, value) =>
	description.properties
		.find(
			({ name, displayOptions }) =>
				name === 'operation' && displayOptions.show.resource[0] === resource,
		)
		.options.find((option) => option.value === value);

test('Send and scheduled Create offer Encrypt, on by default', () => {
	for (const [resource, op] of [
		['notification', 'send'],
		['scheduledNotification', 'create'],
	]) {
		const encrypt = description.properties
			.find(
				({ name, displayOptions }) =>
					name === 'additionalFields' &&
					displayOptions.show.resource.includes(resource) &&
					displayOptions.show.operation.includes(op),
			)
			.options.find(({ name }) => name === 'encrypt');

		assert.equal(encrypt.type, 'boolean');
		assert.equal(encrypt.default, true);
	}
});

const context = (credentials, additionalFields = {}) => ({
	getCredentials: async (name) => {
		assert.equal(name, 'pushWardApi');
		return credentials;
	},
	getNode: () => ({ id: '1', name: 'PushWard', type: 'x', typeVersion: 1, position: [0, 0] }),
	getNodeParameter: (name, fallback) => {
		const parameters = {
			additionalFields,
			scheduleType: 'oneTime',
			sendAt: '2026-12-01T00:00:00Z',
		};
		return parameters[name] ?? fallback;
	},
	getTimezone: () => 'UTC',
});

const assembled = () => ({
	body: {
		source: 'n8n',
		title: 'Deploy',
		subtitle: 'prod',
		body: 'Build 42',
		url: 'https://example.com/42',
		level: 'active',
		send_at: '2026-12-01T00:00:00.000Z',
	},
	headers: { 'Idempotency-Key': 'run-1' },
});

test('Send and scheduled Create seal last and keep everything else', async () => {
	for (const op of [operation('notification', 'send'), operation('scheduledNotification', 'create')]) {
		const steps = op.routing.send.preSend;
		assert.equal(steps.at(-1), sealNotification);

		let request = assembled();
		for (const step of steps) {
			request = await step.call(context({ apiKey: 'k', encryptionKey: keyHex }), request);
		}

		const { encrypted, ...rest } = request.body;
		assert.deepEqual(rest, { source: 'n8n', level: 'active', send_at: '2026-12-01T00:00:00.000Z' });
		assert.deepEqual(request.headers, { 'Idempotency-Key': 'run-1' });
		assert.deepEqual(JSON.parse(open(encrypted).toString()), {
			title: 'Deploy',
			subtitle: 'prod',
			body: 'Build 42',
			url: 'https://example.com/42',
		});
	}
});

for (const [label, credentials, additional] of [
	['with no key', { apiKey: 'k', encryptionKey: '' }, {}],
	['with a credential saved before the field existed', { apiKey: 'k' }, {}],
	['with a key and Encrypt off', { apiKey: 'k', encryptionKey: keyHex }, { encrypt: false }],
]) {
	test(`the body is left alone ${label}`, async () => {
		const request = assembled();

		assert.equal(await sealNotification.call(context(credentials, additional), request), request);
		assert.deepEqual(request, assembled());
	});
}

for (const [label, badKey] of [
	['too short', 'ab'.repeat(31)],
	['too long', 'ab'.repeat(33)],
	['not hex', 'zq'.repeat(32)],
]) {
	test(`a key that is ${label} stops the send without naming the key`, async () => {
		await assert.rejects(
			sealNotification.call(context({ encryptionKey: badKey }), assembled()),
			(error) => {
				assert.equal(error.name, 'NodeOperationError');
				assert.match(error.message, /64 hexadecimal/);
				assert.ok(!JSON.stringify([error.message, error.description]).includes(badKey));
				return true;
			},
		);
	});
}

test('a sealed notification with no title or body is refused', async () => {
	for (const body of [
		{ body: 'only a body' },
		{ title: 'only a title' },
		{ title: 'T', body: undefined },
	]) {
		await assert.rejects(
			sealNotification.call(context({ encryptionKey: keyHex }), { body, headers: {} }),
			{ name: 'NodeOperationError', message: /Title and a Body/ },
		);
	}
});

test('the credential field is optional and masked', () => {
	const { properties, authenticate, test: credentialTest } = new PushWardApi();
	const field = properties.find(({ name }) => name === 'encryptionKey');

	assert.equal(field.type, 'string');
	assert.deepEqual(field.typeOptions, { password: true });
	assert.equal(field.default, '');
	assert.ok(!field.required);
	assert.deepEqual(authenticate.properties.headers, {
		Authorization: '=Bearer {{$credentials.apiKey}}',
	});
	assert.equal(credentialTest.request.url, '/auth/me');
});
