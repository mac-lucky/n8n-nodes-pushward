import type { INodeProperties } from 'n8n-workflow';
import { contentProperties } from '../../shared/contentTemplates';
import { targetField } from '../../shared/descriptions';
import { applyWidgetCreate, applyWidgetUpdate } from '../../shared/preSend';
import { widgetTemplates } from './templates';

const showOnlyForWidgets = {
	resource: ['widget'],
};

const widgetUrl = '=/widgets/{{ encodeURIComponent($parameter.slug) }}';

const pushThrottle: INodeProperties = {
	displayName: 'Push Throttle',
	name: 'pushThrottle',
	type: 'number',
	typeOptions: {
		minValue: 1,
		maxValue: 3600,
	},
	default: 60,
	description: 'Minimum seconds between pushes for this widget, from 1 to 3600',
};

const staleAfter: INodeProperties = {
	displayName: 'Stale After',
	name: 'staleAfter',
	type: 'number',
	typeOptions: {
		minValue: 60,
		maxValue: 604800,
	},
	default: 3600,
	description: 'Seconds after the last update before the widget shows as stale, from 60 to 604800',
};

export const widgetDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForWidgets,
		},
		options: [
			{
				name: 'Create or Replace',
				value: 'create',
				description: 'Create a widget or fully overwrite the one with this slug',
				action: 'Create or replace a widget',
				routing: {
					request: {
						method: 'POST',
						url: '/widgets',
					},
					send: {
						preSend: [applyWidgetCreate],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a widget',
				action: 'Delete a widget',
				routing: {
					request: {
						method: 'DELETE',
						url: widgetUrl,
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "slug": $parameter.slug, "deleted": true } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get one widget',
				action: 'Get a widget',
				routing: {
					request: {
						method: 'GET',
						url: widgetUrl,
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many widgets',
				action: 'Get many widgets',
				routing: {
					request: {
						method: 'GET',
						url: '/widgets',
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
			{
				name: 'Update',
				value: 'update',
				description: 'Change the content or settings of a widget',
				action: 'Update a widget',
				routing: {
					request: {
						method: 'PATCH',
						url: widgetUrl,
						headers: {
							'Content-Type': 'application/merge-patch+json',
						},
					},
					send: {
						preSend: [applyWidgetUpdate],
					},
				},
			},
		],
		default: 'create',
	},
	{
		displayName: 'Slug',
		name: 'slug',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				...showOnlyForWidgets,
				operation: ['create', 'delete', 'get', 'update'],
			},
		},
		default: '',
		placeholder: 'e.g. home-energy',
		description:
			'Unique widget identifier, up to 128 letters, digits, hyphens or underscores, starting with a letter or digit',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				...showOnlyForWidgets,
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name shown in the widget picker of the app, from 1 to 256 characters',
	},
	...contentProperties(widgetTemplates, 'widget', 'create', 'value'),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				...showOnlyForWidgets,
				operation: ['create'],
			},
		},
		default: {},
		options: [targetField, pushThrottle, staleAfter],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				...showOnlyForWidgets,
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name shown in the widget picker of the app, from 1 to 256 characters',
			},
			pushThrottle,
			staleAfter,
		],
	},
];
