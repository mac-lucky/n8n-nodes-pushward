import { createCipheriv, hkdfSync, randomBytes } from 'node:crypto';
import type { IDataObject } from 'n8n-workflow';

// An envelope is at most 3072 characters: "pw1.<kid>." plus base64url of nonce, text and tag.
const maxPlaintextBytes = 2266;

const derive = (key: Buffer, info: string, length: number) =>
	Buffer.from(hkdfSync('sha256', key, Buffer.alloc(0), info, length));

export function seal(keyHex: string, plaintext: string, nonce: Buffer = randomBytes(12)): string {
	if (!/^[0-9a-f]{64}$/i.test(keyHex)) {
		throw new Error('The Encryption Key must be 64 hexadecimal characters');
	}
	const key = Buffer.from(keyHex, 'hex');
	const kid = derive(key, 'pushward/e2e/v1/kid', 4).toString('hex');
	const cipher = createCipheriv('aes-256-gcm', derive(key, 'pushward/e2e/v1/enc', 32), nonce);
	cipher.setAAD(Buffer.from(`pw1.${kid}`));
	const sealed = Buffer.concat([
		nonce,
		cipher.update(plaintext, 'utf8'),
		cipher.final(),
		cipher.getAuthTag(),
	]);
	return `pw1.${kid}.${sealed.toString('base64url')}`;
}

export function sealNotificationBody(
	keyHex: string,
	{ title, subtitle, body, url, ...rest }: IDataObject,
): IDataObject {
	// Once sealed the server cannot refuse a blank one, and the app will not open it.
	if (!title || !body) throw new Error('Encrypting a notification needs a Title and a Body');

	const json = JSON.stringify({ title, subtitle, body, url });
	const padded = json + ' '.repeat((64 - (Buffer.byteLength(json) % 64)) % 64);
	return {
		...rest,
		encrypted: seal(keyHex, Buffer.byteLength(padded) <= maxPlaintextBytes ? padded : json),
	};
}
