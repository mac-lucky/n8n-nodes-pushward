import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

const showOnlyForSend = {
	resource: ['notification'],
	operation: ['send'],
};

// The API takes only strings but an expression can resolve to any type. Objects become JSON text
// unless they have a text form of their own (dates). n8n's vm expression engine passes a DateTime
// as a plain snapshot, so it is rebuilt to keep its ISO text. An invalid one holds the current time
// in ts, so it needs its own text. undefined drops out of the JSON body.
const valueIfSet =
	'={{ $value === "" || $value == null ? undefined : $value.isLuxonDateTime ? ($value.invalid ? "Invalid DateTime" : DateTime.fromMillis($value.ts, { zone: $value.o }).toISO()) : typeof $value === "object" && !$value.toJSON ? JSON.stringify($value) : String($value) }}';

export class PushWard implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PushWard',
		name: 'pushWard',
		icon: { light: 'file:../../icons/pushward.svg', dark: 'file:../../icons/pushward.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send push notifications with PushWard',
		defaults: {
			name: 'PushWard',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'pushWardApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.pushward.app',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Notification',
						value: 'notification',
					},
				],
				default: 'notification',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['notification'],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send a push notification to your devices',
							action: 'Send notification',
						routing: {
							request: {
								method: 'POST',
								url: '/notifications',
								body: {
									source: 'n8n',
									source_display_name: 'n8n',
								},
							},
						},
					},
				],
				default: 'send',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				displayOptions: {
					show: showOnlyForSend,
				},
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
				displayOptions: {
					show: showOnlyForSend,
				},
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
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: showOnlyForSend,
				},
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
		],
	};
}
