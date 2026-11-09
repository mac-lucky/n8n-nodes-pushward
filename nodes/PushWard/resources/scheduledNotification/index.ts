import type { INodeProperties } from 'n8n-workflow';
import { applyNotificationOptions, applySchedule, sealNotification } from '../../shared/preSend';
import { scheduledNotificationCreateDescription } from './create';
import { scheduledNotificationGetManyDescription } from './getAll';

const showOnlyForScheduledNotifications = {
	resource: ['scheduledNotification'],
};

export const scheduledNotificationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForScheduledNotifications,
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a pending scheduled notification or stop a repeating one',
				action: 'Cancel a scheduled notification',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/notifications/scheduled/{{ encodeURIComponent($parameter.scheduledNotificationId) }}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "id": $parameter.scheduledNotificationId, "canceled": true } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Schedule a notification once or on a cron schedule',
				action: 'Create a scheduled notification',
				routing: {
					request: {
						method: 'POST',
						url: '/notifications/scheduled',
						body: {
							source: 'n8n',
							source_display_name: 'n8n',
						},
					},
					send: {
						preSend: [applyNotificationOptions, applySchedule, sealNotification],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get one scheduled notification and its send outcome',
				action: 'Get a scheduled notification',
				routing: {
					request: {
						method: 'GET',
						url: '=/notifications/scheduled/{{ encodeURIComponent($parameter.scheduledNotificationId) }}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many scheduled notifications',
				action: 'Get many scheduled notifications',
				routing: {
					request: {
						method: 'GET',
						url: '/notifications/scheduled',
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
		],
		default: 'create',
	},
	{
		displayName: 'Scheduled Notification ID',
		name: 'scheduledNotificationId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				...showOnlyForScheduledNotifications,
				operation: ['cancel', 'get'],
			},
		},
		default: '',
		description: 'ID returned when the notification was scheduled',
	},
	...scheduledNotificationCreateDescription,
	...scheduledNotificationGetManyDescription,
];
