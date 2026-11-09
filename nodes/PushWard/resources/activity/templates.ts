import {
	commonFields,
	type ContentField,
	type ContentTemplate,
} from '../../shared/contentTemplates';

const percent = { minValue: 0, maxValue: 1, numberPrecision: 2 };
const seconds = { minValue: 0, maxValue: 604800 };

const liveProgress = (description: string): ContentField => ({
	key: 'live_progress',
	displayName: 'Live Progress',
	type: 'boolean',
	description,
});

const imageUrl: ContentField = {
	key: 'image_url',
	displayName: 'Image URL',
	type: 'string',
	description:
		'HTTPS URL of an image shown beside the icon, up to 2048 characters. The device downloads it, so the host must be publicly reachable.',
};

const duration: ContentField = {
	key: 'duration',
	displayName: 'Duration',
	type: 'string',
	placeholder: 'e.g. 5m',
	description:
		'Whole seconds or a duration such as 90s, 5m or 1h30m. End Date wins when both are set.',
};

const series = (description: string): ContentField => ({
	key: 'name',
	displayName: 'Series',
	type: 'string',
	required: true,
	description,
});

const templates: ContentTemplate[] = [
	{
		value: 'alert',
		name: 'Alert',
		description: 'One-shot alert with a severity level',
		fields: [
			{
				key: 'severity',
				displayName: 'Severity',
				type: 'options',
				options: ['critical', 'warning', 'info'],
				required: true,
				description: 'How serious the alert is',
			},
			{
				key: 'severity_label',
				displayName: 'Severity Label',
				type: 'string',
				description: 'Text shown in place of the severity badge, up to 40 characters',
			},
			{
				key: 'fired_at',
				displayName: 'Fired At',
				type: 'dateTime',
				description: 'When the alert fired, not in the future',
			},
		],
	},
	{
		value: 'approval',
		name: 'Approval',
		description: 'Question card with answer buttons',
		fields: [
			{
				key: 'options',
				displayName: 'Options',
				type: 'rows',
				item: 'Option',
				required: true,
				description: 'Answer buttons, from 2 to 4',
				fields: [
					{
						key: 'id',
						displayName: 'ID',
						type: 'string',
						required: true,
						description:
							'Identifier recorded when this option is chosen, up to 64 letters, digits, hyphens or underscores, starting with a letter or digit',
					},
					{
						key: 'title',
						displayName: 'Title',
						type: 'string',
						required: true,
						description: 'Button label, up to 24 characters',
					},
					{
						key: 'icon',
						displayName: 'Icon',
						type: 'string',
						description: 'SF Symbol name, up to 64 characters. Required with 3 or more options.',
					},
				],
			},
			{
				key: 'source',
				displayName: 'Source',
				type: 'string',
				description: 'Badge in the card header saying who asks, up to 24 characters',
			},
			{
				key: 'details',
				displayName: 'Details',
				type: 'rows',
				item: 'Detail',
				description: 'Context rows between the question and the buttons, up to 2',
				fields: [
					{
						key: 'label',
						displayName: 'Label',
						type: 'string',
						required: true,
						description: 'Row label, up to 24 characters',
					},
					{
						key: 'value',
						displayName: 'Value',
						type: 'string',
						required: true,
						description: 'Row value, up to 64 characters',
					},
				],
			},
			{
				key: 'end_date',
				displayName: 'End Date',
				type: 'dateTime',
				description: 'Deadline, shown as a countdown on the card',
			},
			{
				key: 'on_expire',
				displayName: 'On Expire',
				type: 'string',
				description:
					'ID of the option recorded at End Date when nobody answered, or none to just expire. Needs End Date.',
			},
		],
	},
	{
		value: 'board',
		name: 'Board',
		description: 'Grid of labeled tiles',
		fields: [
			{
				key: 'tiles',
				displayName: 'Tiles',
				type: 'rows',
				item: 'Tile',
				required: true,
				description: 'Tiles of the grid, from 1 to 4',
				fields: [
					{
						key: 'label',
						displayName: 'Label',
						type: 'string',
						required: true,
						description: 'Tile label, up to 32 characters',
					},
					{
						key: 'value',
						displayName: 'Value',
						type: 'string',
						required: true,
						description: 'Tile value, up to 16 characters',
					},
					{
						key: 'unit',
						displayName: 'Unit',
						type: 'string',
						description: 'Unit shown after the value, up to 8 characters',
					},
					{
						key: 'icon',
						displayName: 'Icon',
						type: 'string',
						description: 'SF Symbol name or mdi: icon, up to 128 characters',
					},
					{
						key: 'color',
						displayName: 'Color',
						type: 'string',
						description: 'Named color or hex (#RRGGBB or #RRGGBBAA)',
					},
					{
						key: 'trend',
						displayName: 'Trend',
						type: 'options',
						options: ['up', 'down', 'flat'],
						description: 'Trend arrow shown on the tile',
					},
				],
			},
		],
	},
	{
		value: 'countdown',
		name: 'Countdown',
		description: 'Timer counting down to an end date, or up from a start date',
		fields: [
			{
				key: 'end_date',
				displayName: 'End Date',
				type: 'dateTime',
				description: 'When the countdown ends. Set this or Duration unless Direction is Up.',
			},
			duration,
			{
				key: 'direction',
				displayName: 'Direction',
				type: 'options',
				options: ['down', 'up'],
				description: 'Up counts from Start Date and takes no End Date or Duration',
			},
			{
				key: 'start_date',
				displayName: 'Start Date',
				type: 'dateTime',
				description: 'When the countdown began, or the instant an up clock counts from',
			},
			{
				key: 'alarm',
				displayName: 'Alarm',
				type: 'boolean',
				description: 'Whether to schedule an iOS alarm at End Date. Needs End Date and iOS 26.',
			},
			{
				key: 'warning_threshold',
				displayName: 'Warning Threshold',
				type: 'number',
				typeOptions: { minValue: 0 },
				description: 'Seconds before End Date when a warning push is sent',
			},
			{
				key: 'completion_message',
				displayName: 'Completion Message',
				type: 'string',
				description: 'Text shown when the countdown expires, up to 512 characters',
			},
			{
				key: 'snooze_seconds',
				displayName: 'Snooze Seconds',
				type: 'number',
				typeOptions: { minValue: 60, maxValue: 3600 },
				default: 300,
				description: 'Seconds a snooze adds to the alarm, from 60 to 3600',
			},
			{
				key: 'show_ruler',
				displayName: 'Show Ruler',
				type: 'boolean',
				default: true,
				description: 'Whether the card draws its ruler',
			},
		],
	},
	{
		value: 'gauge',
		name: 'Gauge',
		description: 'One value on a scale',
		fields: [
			{
				key: 'value',
				displayName: 'Value',
				type: 'number',
				required: true,
				description: 'Value to show, between Min Value and Max Value',
			},
			{
				key: 'min_value',
				displayName: 'Min Value',
				type: 'number',
				required: true,
				description: 'Bottom of the scale, below Max Value',
			},
			{
				key: 'max_value',
				displayName: 'Max Value',
				type: 'number',
				required: true,
				default: 100,
				description: 'Top of the scale, above Min Value',
			},
			{
				key: 'unit',
				displayName: 'Unit',
				type: 'string',
				description: 'Unit shown after the value, up to 32 characters',
			},
			{
				key: 'decimals',
				displayName: 'Decimals',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 10 },
				description: 'Decimal places shown, from 0 to 10',
			},
		],
	},
	{
		value: 'generic',
		name: 'Generic',
		description: 'Status card with optional progress',
		fields: [
			{
				key: 'progress',
				displayName: 'Progress',
				type: 'number',
				typeOptions: percent,
				description: 'Progress from 0 to 1',
			},
			imageUrl,
			{
				key: 'end_date',
				displayName: 'End Date',
				type: 'dateTime',
				description: 'When the tracked work is expected to finish',
			},
			duration,
			liveProgress(
				'Whether the device animates the progress toward End Date between updates. Needs End Date.',
			),
		],
	},
	{
		value: 'log',
		name: 'Log',
		description: 'Recent log lines',
		fields: [
			{
				key: 'lines',
				displayName: 'Lines',
				type: 'rows',
				item: 'Line',
				required: true,
				description: 'Log lines, newest first, from 1 to 20',
				fields: [
					{
						key: 'text',
						displayName: 'Text',
						type: 'string',
						required: true,
						description: 'Text of the line, up to 512 characters',
					},
					{
						key: 'at',
						displayName: 'At',
						type: 'dateTime',
						description: 'When the line was logged, not in the future',
					},
					{
						key: 'level',
						displayName: 'Level',
						type: 'options',
						options: ['info', 'warn', 'error'],
						description: 'Severity of the line',
					},
				],
			},
		],
	},
	{
		value: 'media',
		name: 'Media',
		description: 'Now-playing card',
		fields: [
			{
				key: 'media_title',
				displayName: 'Media Title',
				type: 'string',
				description: 'Track, episode or channel name, up to 128 characters',
			},
			{
				key: 'playback_state',
				displayName: 'Playback State',
				type: 'options',
				options: ['playing', 'paused', 'stopped', 'buffering'],
				description: 'Only Playing moves the scrubber',
			},
			{
				key: 'position_seconds',
				displayName: 'Position Seconds',
				type: 'number',
				typeOptions: seconds,
				description: 'Playhead position in seconds, up to 7 days',
			},
			{
				key: 'duration_seconds',
				displayName: 'Duration Seconds',
				type: 'number',
				typeOptions: seconds,
				description: 'Total length in seconds, up to 7 days. Leave out for live streams.',
			},
			imageUrl,
		],
	},
	{
		value: 'steps',
		name: 'Steps',
		description: 'Multi-step progress',
		fields: [
			{
				key: 'total_steps',
				displayName: 'Total Steps',
				type: 'number',
				required: true,
				typeOptions: { minValue: 1, maxValue: 64 },
				default: 1,
				description: 'Number of steps, from 1 to 64',
			},
			{
				key: 'current_step',
				displayName: 'Current Step',
				type: 'number',
				required: true,
				typeOptions: { minValue: 0, maxValue: 64 },
				description: 'Step running now, counting from 1, or 0 for not started',
			},
			{
				key: 'step_labels',
				displayName: 'Step Labels',
				type: 'stringList',
				placeholder: 'e.g. Build, Test, Deploy',
				description: 'Comma-separated labels, one per step, each up to 32 characters',
			},
			liveProgress(
				'Whether the device animates the current step between updates. Needs end_date, set through Extra Content.',
			),
		],
	},
	{
		value: 'timeline',
		name: 'Timeline',
		description: 'Sparkline of labeled series',
		fields: [
			{
				key: 'value',
				displayName: 'Values',
				type: 'rows',
				item: 'Series',
				keyedByName: true,
				required: true,
				description: 'Current value of each series, up to 10 series',
				fields: [
					series('Name of the series, up to 32 characters'),
					{
						key: 'value',
						displayName: 'Value',
						type: 'number',
						description: 'Current value of the series',
					},
				],
			},
			{
				key: 'units',
				displayName: 'Units',
				type: 'rows',
				item: 'Series',
				keyedByName: true,
				description: 'Unit of each series, up to 10 series',
				fields: [
					series('Name of a series from Values'),
					{
						key: 'value',
						displayName: 'Unit',
						type: 'string',
						description: 'Unit of the series, up to 32 characters',
					},
				],
			},
			{
				key: 'scale',
				displayName: 'Scale',
				type: 'options',
				options: ['linear', 'logarithmic'],
				description: 'Y-axis scale',
			},
			{
				key: 'primary_series',
				displayName: 'Primary Series',
				type: 'string',
				description:
					'Series that drives the headline number, up to 32 characters. Defaults to the first by name.',
			},
		],
	},
];

const activityCommon: ContentField[] = [
	...commonFields,
	{
		key: 'state',
		displayName: 'Status Text',
		type: 'string',
		description:
			'Short status line, up to 256 characters. On an approval card this is the question.',
	},
	{
		key: 'url',
		displayName: 'URL',
		type: 'string',
		description: 'Link of the primary button, up to 2048 characters',
	},
	{
		key: 'compact_label',
		displayName: 'Compact Label',
		type: 'string',
		description: 'Up to 4 characters in the compact leading ear of the Dynamic Island',
	},
	{
		key: 'compact_trailing_label',
		displayName: 'Compact Trailing Label',
		type: 'string',
		description: 'Up to 4 characters in the compact trailing ear, ahead of the trailing icon',
	},
	{
		key: 'compact_trailing_icon',
		displayName: 'Compact Trailing Icon',
		type: 'string',
		description: 'SF Symbol or mdi: icon in the compact trailing ear, up to 128 characters',
	},
];

// The API refuses url on an approval card.
const commonFor = (template: string) =>
	template === 'approval' ? activityCommon.filter(({ key }) => key !== 'url') : activityCommon;

export const activityTemplates: ContentTemplate[] = templates.map((template) => ({
	...template,
	fields: [...template.fields, ...commonFor(template.value)],
}));
