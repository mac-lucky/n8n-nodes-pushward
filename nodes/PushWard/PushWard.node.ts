import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { accountDescription } from './resources/account';
import { emailDescription } from './resources/email';
import { notificationDescription } from './resources/notification';
import { scheduledNotificationDescription } from './resources/scheduledNotification';

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
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Notification',
						value: 'notification',
					},
					{
						name: 'Scheduled Notification',
						value: 'scheduledNotification',
					},
				],
				default: 'notification',
			},
			...notificationDescription,
			...scheduledNotificationDescription,
			...emailDescription,
			...accountDescription,
		],
	};
}
