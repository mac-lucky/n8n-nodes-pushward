import type { INodeProperties } from 'n8n-workflow';

export const accountDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get the account of the integration key, with its usage and limits',
				action: 'Get the account',
				routing: {
					request: {
						method: 'GET',
						url: '/auth/me',
					},
				},
			},
		],
		default: 'get',
	},
];
