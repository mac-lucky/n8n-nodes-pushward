import type { INodeProperties } from 'n8n-workflow';

const showOnlyForGetMany = {
	operation: ['getAll'],
	resource: ['scheduledNotification'],
};

// Return All comes first: its limit of 100 is the page size, and Limit overrides it when shown.
export const scheduledNotificationGetManyDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: showOnlyForGetMany,
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
							// n8n replaces the whole query with this one, so status and limit are repeated
							qs: {
								status: '={{ $request.qs?.status }}',
								limit: '={{ $request.qs?.limit }}',
								cursor: '={{ $response.body?.next_cursor }}',
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
				...showOnlyForGetMany,
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
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		displayOptions: {
			show: showOnlyForGetMany,
		},
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Canceled', value: 'canceled' },
			{ name: 'Failed', value: 'failed' },
			{ name: 'Scheduled', value: 'scheduled' },
			{ name: 'Sent', value: 'sent' },
		],
		default: 'scheduled',
		description:
			'Which scheduled notifications to list. Sent and failed ones are kept 7 days, canceled ones 24 hours.',
		routing: {
			send: {
				type: 'query',
				property: 'status',
			},
		},
	},
];
