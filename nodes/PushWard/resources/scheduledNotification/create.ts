import type { INodeProperties } from 'n8n-workflow';
import { notificationFields } from '../../shared/descriptions';

const showOnlyForCreate = {
	operation: ['create'],
	resource: ['scheduledNotification'],
};

const showOnlyForRecurring = {
	...showOnlyForCreate,
	scheduleType: ['recurring'],
};

export const scheduledNotificationCreateDescription: INodeProperties[] = [
	{
		displayName: 'Schedule',
		name: 'scheduleType',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForCreate,
		},
		options: [
			{
				name: 'One Time',
				value: 'oneTime',
			},
			{
				name: 'Recurring',
				value: 'recurring',
			},
		],
		default: 'oneTime',
		description: 'Whether to send once or repeat on a cron schedule',
	},
	{
		displayName: 'Send At',
		name: 'sendAt',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				...showOnlyForCreate,
				scheduleType: ['oneTime'],
			},
		},
		default: '',
		description:
			'When to send it, in the future and at most 365 days ahead. A time without an offset is read in the workflow time zone.',
	},
	{
		displayName: 'Cron',
		name: 'cron',
		type: 'string',
		required: true,
		displayOptions: {
			show: showOnlyForRecurring,
		},
		default: '',
		placeholder: 'e.g. 0 8 * * 1-5',
		description:
			'Five-field cron expression, or @hourly, @daily, @weekly, @monthly or @yearly. Up to 128 characters. Sends must be at least 15 minutes apart.',
	},
	{
		displayName: 'Time Zone',
		name: 'timezone',
		type: 'string',
		required: true,
		displayOptions: {
			show: showOnlyForRecurring,
		},
		default: '',
		placeholder: 'e.g. Europe/Warsaw',
		description: 'IANA time zone the cron expression is evaluated in',
	},
	{
		displayName: 'Recurrence Options',
		name: 'recurrenceOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: showOnlyForRecurring,
		},
		default: {},
		options: [
			{
				displayName: 'Count',
				name: 'count',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				default: 1,
				description: 'Total number of sends, up to 1000. Cannot be combined with Until.',
			},
			{
				displayName: 'First Send At',
				name: 'sendAt',
				type: 'dateTime',
				default: '',
				description:
					'The first send is the first cron match at or after this time, at most 365 days ahead. Defaults to now.',
			},
			{
				displayName: 'Until',
				name: 'until',
				type: 'dateTime',
				default: '',
				description: 'Last allowed send time, inclusive. Cannot be combined with Count.',
			},
		],
	},
	...notificationFields(showOnlyForCreate),
];
