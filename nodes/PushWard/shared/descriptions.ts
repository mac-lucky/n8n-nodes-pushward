import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

// The API takes only strings but an expression can resolve to any type. Objects become JSON text
// unless they have a text form of their own (dates). n8n's vm expression engine passes a DateTime
// as a plain snapshot, so it is rebuilt to keep its ISO text. An invalid one holds the current time
// in ts, so it needs its own text. undefined drops out of the JSON body.
export const valueIfSet =
	'={{ $value === "" || $value == null ? undefined : $value.isLuxonDateTime ? ($value.invalid ? "Invalid DateTime" : DateTime.fromMillis($value.ts, { zone: $value.o }).toISO()) : typeof $value === "object" && !$value.toJSON ? JSON.stringify($value) : String($value) }}';

// The content of a notification, shared by Send and scheduled Create.
export function notificationFields(show: IDisplayOptions['show']): INodeProperties[] {
	const displayOptions = { show };

	return [
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			required: true,
			displayOptions,
			default: '',
			description: 'Title of the notification, up to 256 characters',
			routing: {
				send: {
					type: 'body',
					property: 'title',
					value: valueIfSet,
				},
			},
		},
		{
			displayName: 'Body',
			name: 'body',
			type: 'string',
			typeOptions: {
				rows: 4,
			},
			required: true,
			displayOptions,
			default: '',
			description: 'Text of the notification, up to 4096 characters',
			routing: {
				send: {
					type: 'body',
					property: 'body',
					value: valueIfSet,
				},
			},
		},
		{
			displayName: 'Action Buttons',
			name: 'actions',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
				multipleValueButtonText: 'Add Button',
			},
			placeholder: 'Add Button',
			displayOptions,
			default: {},
			description: 'Buttons shown on the notification, up to 10',
			options: [
				{
					displayName: 'Button',
					name: 'button',
					values: [
						{
							displayName: 'Authentication Required',
							name: 'authenticationRequired',
							type: 'boolean',
							default: false,
							description: 'Whether the device must be unlocked before the action runs',
						},
						{
							displayName: 'Body',
							name: 'body',
							type: 'string',
							default: '',
							description: 'Request body for an HTTP or HTTPS URL, up to 1024 characters',
						},
						{
							displayName: 'Destructive',
							name: 'destructive',
							type: 'boolean',
							default: false,
							description: 'Whether the label is shown in red',
						},
						{
							displayName: 'Foreground',
							name: 'foreground',
							type: 'boolean',
							default: false,
							description: 'Whether tapping the button brings the app to the foreground',
						},
						{
							displayName: 'Icon',
							name: 'icon',
							type: 'string',
							default: '',
							placeholder: 'e.g. checkmark.circle',
							description: 'SF Symbol name, up to 64 characters',
						},
						{
							displayName: 'ID',
							name: 'id',
							type: 'string',
							required: true,
							default: '',
							placeholder: 'e.g. approve',
							description: 'Identifier returned when the button is tapped, up to 64 characters',
						},
						{
							displayName: 'Method',
							name: 'method',
							type: 'string',
							default: '',
							placeholder: 'e.g. POST',
							description:
								'HTTP method for an HTTP or HTTPS URL: GET, POST, PUT, PATCH, DELETE or HEAD. The API uses GET when blank.',
						},
						{
							displayName: 'Text Input',
							name: 'textInput',
							type: 'boolean',
							default: false,
							description:
								'Whether tapping shows a reply field. Needs a button that does not open the app.',
						},
						{
							displayName: 'Text Input Button Title',
							name: 'textInputButtonTitle',
							type: 'string',
							default: '',
							description: 'Label of the send button next to the reply field, up to 64 characters',
						},
						{
							displayName: 'Text Input Placeholder',
							name: 'textInputPlaceholder',
							type: 'string',
							default: '',
							description: 'Placeholder of the reply field, up to 64 characters',
						},
						{
							displayName: 'Title',
							name: 'title',
							type: 'string',
							required: true,
							default: '',
							description: 'Label of the button, up to 64 characters',
						},
						{
							displayName: 'URL',
							name: 'url',
							type: 'string',
							default: '',
							description:
								'URL opened or called on tap, up to 2048 characters. On a button that does not open the app, leave it blank to have PushWard record the tap for Get Answer.',
						},
					],
				},
			],
		},
		{
			displayName: 'Acknowledge',
			name: 'acknowledge',
			type: 'fixedCollection',
			placeholder: 'Add Acknowledge',
			displayOptions,
			default: {},
			description:
				'Repeat the notification until someone acknowledges it. Not with Send Push off, passive level or Snooze. At most 25 active per account.',
			options: [
				{
					displayName: 'Settings',
					name: 'settings',
					values: [
						{
							displayName: 'Action Title',
							name: 'actionTitle',
							type: 'string',
							default: 'Acknowledge',
							description:
								'Label of the button PushWard adds when no button without a URL is present, up to 64 characters',
						},
						{
							displayName: 'Callback URL',
							name: 'callbackUrl',
							type: 'string',
							default: '',
							description:
								'HTTPS URL that gets a signed POST once the notification is acknowledged or expires, up to 2048 characters',
						},
						{
							displayName: 'Expire Seconds',
							name: 'expireSeconds',
							type: 'number',
							typeOptions: {
								minValue: 60,
								maxValue: 10800,
							},
							default: 3600,
							description: 'Seconds after which the repeats stop, from 60 to 10800',
						},
						{
							displayName: 'Repeat Seconds',
							name: 'repeatSeconds',
							type: 'number',
							typeOptions: {
								minValue: 30,
								maxValue: 3600,
							},
							default: 60,
							description: 'Seconds between repeats, from 30 to 3600. At most 50 repeats are sent.',
						},
						{
							displayName: 'Tags',
							name: 'tags',
							type: 'string',
							default: '',
							placeholder: 'e.g. deploys, oncall',
							description:
								'Comma-separated labels for Cancel Receipts by Tag, up to 10, each up to 64 printable ASCII characters without spaces',
						},
					],
				},
			],
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add Field',
			displayOptions,
			default: {},
			options: [
				{
					displayName: 'Collapse ID',
					name: 'collapseId',
					type: 'string',
					default: '',
					description:
						'A later notification with the same ID replaces this one on the devices, up to 64 characters',
					routing: {
						send: { type: 'body', property: 'collapse_id', value: valueIfSet },
					},
				},
				{
					displayName: 'Critical Volume',
					name: 'volume',
					type: 'number',
					typeOptions: {
						minValue: 0,
						maxValue: 1,
						numberPrecision: 2,
					},
					default: 1,
					description: 'Volume of a critical alert, from 0 to 1',
					routing: {
						send: { type: 'body', property: 'volume' },
					},
				},
				{
					displayName: 'Icon URL',
					name: 'iconUrl',
					type: 'string',
					default: '',
					description:
						'HTTP or HTTPS URL of the sender avatar, up to 2048 characters. The iOS app rejects images over 512 KB.',
					routing: {
						send: { type: 'body', property: 'icon_url', value: valueIfSet },
					},
				},
				{
					displayName: 'Idempotency Key',
					name: 'idempotencyKey',
					type: 'string',
					default: '',
					description:
						'A repeated request with the same key does not send twice. Use a new value for each send, up to 128 printable ASCII characters without spaces.',
				},
				{
					displayName: 'Level',
					name: 'level',
					type: 'options',
					options: [
						{
							name: 'Passive',
							value: 'passive',
							description: 'No sound or banner, goes straight to the notification list',
						},
						{
							name: 'Active',
							value: 'active',
							description: 'Banner, sound and lock screen',
						},
						{
							name: 'Time Sensitive',
							value: 'time-sensitive',
							description: 'Breaks through Focus modes other than Do Not Disturb',
						},
						{
							name: 'Critical',
							value: 'critical',
							description: 'Sounds through mute and Focus, needs the Critical Alerts permission',
						},
					],
					default: 'active',
					description: 'How strongly the notification interrupts the user',
					routing: {
						send: { type: 'body', property: 'level', value: valueIfSet },
					},
				},
				{
					displayName: 'Media',
					name: 'media',
					type: 'fixedCollection',
					placeholder: 'Add Media',
					default: {},
					description: 'Image, video or audio attached to the notification',
					options: [
						{
							displayName: 'File',
							name: 'file',
							values: [
								{
									displayName: 'Type',
									name: 'type',
									type: 'options',
									options: [
										{ name: 'Audio', value: 'audio' },
										{ name: 'Image', value: 'image' },
										{ name: 'Video', value: 'video' },
									],
									default: 'image',
									description: 'Kind of file at the URL',
								},
								{
									displayName: 'URL',
									name: 'url',
									type: 'string',
									default: '',
									description: 'HTTPS URL of the file, up to 2048 characters',
								},
							],
						},
					],
				},
				{
					displayName: 'Metadata',
					name: 'metadata',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
						multipleValueButtonText: 'Add Pair',
					},
					placeholder: 'Add Pair',
					default: {},
					description: 'Key and value pairs stored with the notification',
					options: [
						{
							displayName: 'Pair',
							name: 'pair',
							values: [
								{
									displayName: 'Key',
									name: 'key',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Value',
									name: 'value',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
				{
					displayName: 'Organization Target',
					name: 'target',
					type: 'fixedCollection',
					placeholder: 'Add Target',
					default: {},
					description: 'Organization keys only: who receives it, narrowing the routing rules',
					options: [
						{
							displayName: 'Recipients',
							name: 'recipients',
							values: [
								{
									displayName: 'Device Tags',
									name: 'tags',
									type: 'string',
									default: '',
									description: 'Comma-separated device tag names, up to 20',
								},
								{
									displayName: 'Groups',
									name: 'groups',
									type: 'string',
									default: '',
									description: 'Comma-separated group names, up to 20',
								},
								{
									displayName: 'Members',
									name: 'members',
									type: 'string',
									default: '',
									description: 'Comma-separated member user IDs, up to 100',
								},
							],
						},
					],
				},
				{
					displayName: 'Send Push',
					name: 'push',
					type: 'boolean',
					default: true,
					description: 'Whether to push to the devices. Turn off to keep it in the inbox only.',
					routing: {
						send: { type: 'body', property: 'push' },
					},
				},
				{
					displayName: 'Snooze',
					name: 'snooze',
					type: 'string',
					default: '',
					placeholder: 'e.g. 15, 60',
					description:
						'Comma-separated snooze durations in minutes: 1 to 3 different values, each from 1 to 1440. Not with Acknowledge.',
				},
				{
					displayName: 'Subtitle',
					name: 'subtitle',
					type: 'string',
					default: '',
					description: 'Line shown under the title, up to 256 characters',
					routing: {
						send: { type: 'body', property: 'subtitle', value: valueIfSet },
					},
				},
				{
					displayName: 'Thread ID',
					name: 'threadId',
					type: 'string',
					default: '',
					description: 'Notifications with the same ID are grouped, up to 128 characters',
					routing: {
						send: { type: 'body', property: 'thread_id', value: valueIfSet },
					},
				},
				{
					displayName: 'URL',
					name: 'url',
					type: 'string',
					default: '',
					placeholder: 'e.g. https://example.com/deploys/42',
					description: 'Link opened when the notification is tapped, up to 2048 characters',
					routing: {
						send: { type: 'body', property: 'url', value: valueIfSet },
					},
				},
			],
		},
	];
}
