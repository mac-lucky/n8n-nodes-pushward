import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PushWardApi implements ICredentialType {
	name = 'pushWardApi';

	displayName = 'PushWard API';

	icon: Icon = { light: 'file:../icons/pushward.svg', dark: 'file:../icons/pushward.dark.svg' };

	documentationUrl = 'https://pushward.app/docs/api/authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'Integration Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Integration key from the PushWard app, under Settings > Integration Key',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.pushward.app',
			url: '/auth/me',
			method: 'GET',
		},
	};
}
