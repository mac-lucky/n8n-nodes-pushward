import {
	NodeApiError,
	type IDataObject,
	type INodeExecutionData,
	type IPollFunctions,
	type JsonObject,
} from 'n8n-workflow';
import { list } from '../PushWard/shared/mappers';

const pageSize = 100;
const maxPages = 20;
const longPollSeconds = 25;

interface AnswerFeed {
	items: IDataObject[] | null;
	cursor: string;
}

async function getFeed(
	this: IPollFunctions,
	qs: IDataObject,
	timeout?: number,
): Promise<AnswerFeed> {
	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'pushWardApi', {
			method: 'GET',
			url: 'https://api.pushward.app/notifications/answers',
			qs,
			json: true,
			timeout,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

async function waitForAnswer(this: IPollFunctions): Promise<IDataObject[]> {
	const { cursor } = await getFeed.call(this, {});
	const { items } = await getFeed.call(
		this,
		{ after: cursor, wait: longPollSeconds },
		(longPollSeconds + 5) * 1000,
	);
	return items ?? [];
}

async function readNewAnswers(this: IPollFunctions): Promise<IDataObject[]> {
	const stored = this.getWorkflowStaticData('node');
	if (!stored.cursor) {
		stored.cursor = (await getFeed.call(this, {})).cursor;
		return [];
	}

	// Stored only after the last page: a page that fails must not lose the ones before it.
	let after = stored.cursor as string;
	const answers: IDataObject[] = [];
	for (let page = 0; page < maxPages; page++) {
		const feed = await getFeed.call(this, { after, limit: pageSize });
		const items = feed.items ?? [];
		answers.push(...items);
		after = feed.cursor;
		if (items.length < pageSize) break;
	}
	stored.cursor = after;
	return answers;
}

export async function pollAnswers(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
	const actionIds = list(this.getNodeParameter('actionIds', ''));
	const answers = await (this.getMode() === 'manual' ? waitForAnswer : readNewAnswers).call(this);
	const wanted = actionIds
		? answers.filter(({ action_id }) => actionIds.includes(action_id as string))
		: answers;
	return wanted.length ? [this.helpers.returnJsonArray(wanted)] : null;
}
