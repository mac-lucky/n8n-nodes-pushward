import {
	NodeConnectionTypes,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
} from 'n8n-workflow';
import { pollAnswers } from './pollAnswers';

export class PushWardTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PushWard Trigger',
		name: 'pushWardTrigger',
		icon: { light: 'file:../../icons/pushward.svg', dark: 'file:../../icons/pushward.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["actionIds"] || "Every answer"}}',
		description: 'Starts a workflow when someone taps a notification button or sends a reply',
		defaults: {
			name: 'PushWard Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'pushWardApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Action IDs',
				name: 'actionIds',
				type: 'string',
				default: '',
				placeholder: 'e.g. approve, reject',
				description: 'Comma-separated button IDs to react to. Leave blank for every answer.',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		return await pollAnswers.call(this);
	}
}
