import type { INodeProperties } from 'n8n-workflow';
import { valueIfSet } from '../../shared/descriptions';

const showOnlyForEmailSend = {
	operation: ['send'],
	resource: ['email'],
};

export const emailDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['email'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send an email to a verified recipient of your account',
				action: 'Send an email',
				routing: {
					request: {
						method: 'POST',
						url: '/emails',
					},
				},
			},
		],
		default: 'send',
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		required: true,
		displayOptions: {
			show: showOnlyForEmailSend,
		},
		default: '',
		placeholder: 'e.g. nathan@example.com',
		description: 'Verified, non-unsubscribed recipient address, up to 254 characters',
		routing: {
			send: { type: 'body', property: 'to', value: valueIfSet },
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		displayOptions: {
			show: showOnlyForEmailSend,
		},
		default: '',
		description: 'Subject line, up to 256 characters',
		routing: {
			send: { type: 'body', property: 'subject', value: valueIfSet },
		},
	},
	{
		displayName: 'Text Body',
		name: 'textBody',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: showOnlyForEmailSend,
		},
		default: '',
		description: 'Plain-text body, up to 65536 characters. Set this, HTML Body, or both.',
		routing: {
			send: { type: 'body', property: 'text_body', value: valueIfSet },
		},
	},
	{
		displayName: 'HTML Body',
		name: 'htmlBody',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: showOnlyForEmailSend,
		},
		default: '',
		description: 'HTML body, up to 262144 characters. Set this, Text Body, or both.',
		routing: {
			send: { type: 'body', property: 'html_body', value: valueIfSet },
		},
	},
];
