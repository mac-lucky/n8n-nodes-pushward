import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type PreSendAction,
} from 'n8n-workflow';
import { mapSchedule, notificationOptions, type Mapped } from './mappers';

function mergeInto(build: (context: IExecuteSingleFunctions) => Mapped): PreSendAction {
	return async function (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions) {
		try {
			const { body, headers } = build(this);
			return {
				...requestOptions,
				body: { ...(requestOptions.body as IDataObject), ...body },
				headers: { ...requestOptions.headers, ...headers },
			};
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error);
		}
	};
}

export const applyNotificationOptions = mergeInto((context) =>
	notificationOptions(
		context.getNodeParameter('additionalFields', {}) as IDataObject,
		context.getNodeParameter('actions', {}) as IDataObject,
		context.getNodeParameter('acknowledge', {}) as IDataObject,
	),
);

export const applySchedule = mergeInto((context) =>
	mapSchedule(
		{
			scheduleType: context.getNodeParameter('scheduleType', 'oneTime'),
			sendAt: context.getNodeParameter('sendAt', ''),
			cron: context.getNodeParameter('cron', ''),
			timezone: context.getNodeParameter('timezone', ''),
			recurrenceOptions: context.getNodeParameter('recurrenceOptions', {}),
		} as IDataObject,
		context.getTimezone(),
	),
);
