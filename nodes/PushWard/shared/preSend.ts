import {
	NodeApiError,
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type JsonObject,
	type PreSendAction,
} from 'n8n-workflow';
import { activityTemplates } from '../resources/activity/templates';
import { widgetTemplates } from '../resources/widget/templates';
import { requiredParams, type ContentTemplate } from './contentTemplates';
import {
	mapActivityCreate,
	mapActivityEnd,
	mapActivityPatch,
	mapContent,
	mapSchedule,
	mapWidgetCreate,
	mapWidgetPatch,
	notificationOptions,
	toRfc3339,
	toUnixSeconds,
	type Mapped,
} from './mappers';

function refusing<T>(context: IExecuteSingleFunctions, map: () => T): T {
	try {
		return map();
	} catch (error) {
		throw new NodeOperationError(context.getNode(), error as Error);
	}
}

const merged = (
	requestOptions: IHttpRequestOptions,
	{ body, headers }: Mapped,
): IHttpRequestOptions => ({
	...requestOptions,
	body: { ...(requestOptions.body as IDataObject), ...body },
	headers: { ...requestOptions.headers, ...headers },
});

function mergeInto(build: (context: IExecuteSingleFunctions) => Mapped): PreSendAction {
	return async function (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions) {
		return merged(
			requestOptions,
			refusing(this, () => build(this)),
		);
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

const additionalFields = (context: IExecuteSingleFunctions) =>
	context.getNodeParameter('additionalFields', {}) as IDataObject;

function readContent(
	context: IExecuteSingleFunctions,
	templates: ContentTemplate[],
	toDate: (value: unknown, zone: string) => string | number | undefined,
	requiredAtTopLevel: boolean,
): IDataObject {
	const template = context.getNodeParameter('template') as string;
	const values = { ...(context.getNodeParameter('contentFields', {}) as IDataObject) };
	if (requiredAtTopLevel) {
		for (const name of requiredParams(templates, template)) {
			values[name] = context.getNodeParameter(name, '') as IDataObject[string];
		}
	}
	const zone = context.getTimezone();
	return mapContent(templates, template, values, (value) => toDate(value, zone));
}

// Everything is mapped before the POST, so a value the mapper refuses sends nothing at all.
export const startActivity: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	const { patch, create } = refusing(this, () => {
		const additional = additionalFields(this);
		return {
			patch: mapActivityPatch(
				readContent(this, activityTemplates, toUnixSeconds, true),
				additional,
			),
			create: mapActivityCreate(
				this.getNodeParameter('slug', ''),
				this.getNodeParameter('name', ''),
				additional,
			),
		};
	});

	try {
		await this.helpers.httpRequestWithAuthentication.call(this, 'pushWardApi', {
			method: 'POST',
			url: 'https://api.pushward.app/activities',
			body: create,
			json: true,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}

	return merged(requestOptions, { body: patch });
};

export const applyActivityUpdate = mergeInto((context) => ({
	body: mapActivityPatch(
		readContent(context, activityTemplates, toUnixSeconds, false),
		additionalFields(context),
	),
}));

export const applyActivityEnd = mergeInto((context) => ({
	body: mapActivityEnd(additionalFields(context)),
}));

export const applyWidgetCreate = mergeInto((context) => ({
	body: mapWidgetCreate(
		context.getNodeParameter('slug', ''),
		context.getNodeParameter('name', ''),
		readContent(context, widgetTemplates, toRfc3339, true),
		additionalFields(context),
	),
}));

export const applyWidgetUpdate = mergeInto((context) => ({
	body: mapWidgetPatch(
		readContent(context, widgetTemplates, toRfc3339, false),
		additionalFields(context),
	),
}));
