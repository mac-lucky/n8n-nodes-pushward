import type { INodeProperties } from 'n8n-workflow';
import { notificationFields, valueIfSet } from '../../shared/descriptions';
import { applyNotificationOptions, sealNotification } from '../../shared/preSend';

const showOnlyForNotifications = {
	resource: ['notification'],
};

export const notificationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForNotifications,
		},
		options: [
			{
				name: 'Cancel Receipt',
				value: 'cancelReceipt',
				description: 'Stop an acknowledged notification from repeating',
				action: 'Cancel a receipt',
				routing: {
					request: {
						method: 'POST',
						url: '=/notifications/receipts/{{ encodeURIComponent($parameter.notificationId) }}/cancel',
					},
				},
			},
			{
				name: 'Cancel Receipts by Tag',
				value: 'cancelReceiptsByTag',
				description: 'Stop every active acknowledged notification sent with a tag',
				action: 'Cancel receipts by tag',
				routing: {
					request: {
						method: 'POST',
						url: '/notifications/receipts/cancel',
					},
				},
			},
			{
				name: 'Get Answer',
				value: 'getAnswer',
				description: 'Get which action the user tapped and any text they typed',
				action: 'Get an answer',
				routing: {
					request: {
						method: 'GET',
						url: '=/notifications/answers/{{ encodeURIComponent($parameter.notificationId) }}',
					},
				},
			},
			{
				name: 'Get Receipt',
				value: 'getReceipt',
				description: 'Get whether an acknowledged notification is still repeating',
				action: 'Get a receipt',
				routing: {
					request: {
						method: 'GET',
						url: '=/notifications/receipts/{{ encodeURIComponent($parameter.notificationId) }}',
					},
				},
			},
			{
				name: 'Retract',
				value: 'retract',
				description: 'Remove the notifications sent with a collapse ID from the devices',
				action: 'Retract notifications',
				routing: {
					request: {
						method: 'POST',
						url: '/notifications/retract',
					},
				},
			},
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
					send: {
						preSend: [applyNotificationOptions, sealNotification],
					},
				},
			},
		],
		default: 'send',
	},
	{
		displayName: 'Notification ID',
		name: 'notificationId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				...showOnlyForNotifications,
				operation: ['cancelReceipt', 'getAnswer', 'getReceipt'],
			},
		},
		default: '',
		description: 'ID returned when the notification was sent',
	},
	{
		displayName: 'Collapse ID',
		name: 'collapseId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				...showOnlyForNotifications,
				operation: ['retract'],
			},
		},
		default: '',
		description: 'Collapse ID the notifications were sent with, up to 64 characters',
		routing: {
			send: { type: 'body', property: 'collapse_id', value: valueIfSet },
		},
	},
	{
		displayName: 'Tag',
		name: 'tag',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				...showOnlyForNotifications,
				operation: ['cancelReceiptsByTag'],
			},
		},
		default: '',
		description: 'Tag the notifications were sent with, up to 64 printable ASCII characters',
		routing: {
			send: { type: 'body', property: 'tag', value: valueIfSet },
		},
	},
	...notificationFields({ ...showOnlyForNotifications, operation: ['send'] }),
];
