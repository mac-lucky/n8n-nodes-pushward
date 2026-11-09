import type { INodeProperties } from 'n8n-workflow';
import { contentProperties } from '../../shared/contentTemplates';
import { targetField } from '../../shared/descriptions';
import { applyActivityEnd, applyActivityUpdate, startActivity } from '../../shared/preSend';
import { activityTemplates } from './templates';

const showOnlyForActivities = {
	resource: ['activity'],
};

const activityUrl = '=/activities/{{ encodeURIComponent($parameter.slug) }}';
const mergePatch = { 'Content-Type': 'application/merge-patch+json' };

const dismissalTtl: INodeProperties = {
	displayName: 'Dismissal TTL',
	name: 'dismissalTtl',
	type: 'number',
	typeOptions: {
		minValue: 0,
		maxValue: 14400,
	},
	default: 0,
	description:
		'Seconds the ended activity stays on the Lock Screen, up to 14400. 0 removes it at once.',
};

const sound: INodeProperties = {
	displayName: 'Sound',
	name: 'sound',
	type: 'options',
	options: [
		{ name: 'Alert', value: 'alert' },
		{ name: 'Bell', value: 'bell' },
		{ name: 'Buzz', value: 'buzz' },
		{ name: 'Chime', value: 'chime' },
		{ name: 'Default', value: 'default' },
		{ name: 'Ding', value: 'ding' },
		{ name: 'Notification', value: 'notification' },
		{ name: 'Success', value: 'success' },
		{ name: 'Warning', value: 'warning' },
	],
	default: 'default',
	description: 'Sound played with this update',
};

export const activityDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForActivities,
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a live activity',
				action: 'Delete a live activity',
				routing: {
					request: {
						method: 'DELETE',
						url: activityUrl,
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "slug": $parameter.slug, "deleted": true } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'End',
				value: 'end',
				description: 'End a live activity',
				action: 'End a live activity',
				routing: {
					request: {
						method: 'PATCH',
						url: activityUrl,
						headers: mergePatch,
						body: {
							state: 'ended',
						},
					},
					send: {
						preSend: [applyActivityEnd],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get one live activity',
				action: 'Get a live activity',
				routing: {
					request: {
						method: 'GET',
						url: activityUrl,
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many live activities',
				action: 'Get many live activities',
				routing: {
					request: {
						method: 'GET',
						url: '/activities',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'items',
								},
							},
						],
					},
				},
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Create a live activity if needed and set it ongoing with its content',
				action: 'Start a live activity',
				routing: {
					request: {
						method: 'PATCH',
						url: activityUrl,
						headers: mergePatch,
						body: {
							state: 'ongoing',
						},
					},
					send: {
						preSend: [startActivity],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change the content of a live activity',
				action: 'Update a live activity',
				routing: {
					request: {
						method: 'PATCH',
						url: activityUrl,
						headers: mergePatch,
					},
					send: {
						preSend: [applyActivityUpdate],
					},
				},
			},
		],
		default: 'start',
	},
	{
		displayName: 'Slug',
		name: 'slug',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				...showOnlyForActivities,
				operation: ['delete', 'end', 'get', 'start', 'update'],
			},
		},
		default: '',
		placeholder: 'e.g. build-42',
		description:
			'Unique activity identifier, up to 128 letters, digits, hyphens or underscores, starting with a letter or digit',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				...showOnlyForActivities,
				operation: ['start'],
			},
		},
		default: '',
		description: 'Name of the activity, from 1 to 256 characters',
	},
	...contentProperties(activityTemplates, 'activity', 'start', 'generic'),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				...showOnlyForActivities,
				operation: ['start'],
			},
		},
		default: {},
		options: [
			dismissalTtl,
			{
				displayName: 'Ended TTL',
				name: 'endedTtl',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 2592000,
				},
				default: 300,
				description: 'Seconds after ending before the activity is deleted, up to 30 days',
			},
			targetField,
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 10,
				},
				default: 0,
				description: 'Eviction priority from 0, the lowest, to 10',
			},
			sound,
			{
				displayName: 'Stale TTL',
				name: 'staleTtl',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 2592000,
				},
				default: 3600,
				description: 'Seconds without an update before the activity ends itself, up to 30 days',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				...showOnlyForActivities,
				operation: ['update'],
			},
		},
		default: {},
		options: [sound],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				...showOnlyForActivities,
				operation: ['end'],
			},
		},
		default: {},
		options: [dismissalTtl],
	},
	// Return All comes first: its limit of 100 is the page size, and Limit overrides it when shown.
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				...showOnlyForActivities,
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		routing: {
			send: {
				paginate: '={{ $value }}',
				type: 'query',
				property: 'limit',
				value: '100',
			},
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ !!$response.body?.next_cursor }}',
						request: {
							// n8n replaces the whole query with this one, so limit is repeated
							qs: {
								limit: '={{ $request.qs?.limit }}',
								after: '={{ $response.body?.next_cursor }}',
							},
						},
					},
				},
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				...showOnlyForActivities,
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
			output: {
				maxResults: '={{$value}}',
			},
		},
	},
];
