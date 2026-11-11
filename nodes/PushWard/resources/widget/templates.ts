import {
	commonFields,
	type ContentField,
	type ContentTemplate,
} from '../../shared/contentTemplates';

const value: ContentField = {
	key: 'value',
	displayName: 'Value',
	type: 'number',
	description: 'Number shown on the widget',
};

const requiredValue: ContentField = { ...value, required: true };

const minValue: ContentField = {
	key: 'min_value',
	displayName: 'Min Value',
	type: 'number',
	description: 'Bottom of the scale, below Max Value',
};

const maxValue: ContentField = {
	key: 'max_value',
	displayName: 'Max Value',
	type: 'number',
	default: 100,
	description: 'Top of the scale, above Min Value',
};

const unit: ContentField = {
	key: 'unit',
	displayName: 'Unit',
	type: 'string',
	description: 'Unit shown after the value, up to 32 characters',
};

const trend: ContentField = {
	key: 'trend',
	displayName: 'Trend',
	type: 'options',
	options: ['up', 'down', 'flat'],
	description: 'Trend arrow',
};

const severity: ContentField = {
	key: 'severity',
	displayName: 'Severity',
	type: 'options',
	options: ['info', 'success', 'warning', 'critical'],
	description: 'Severity color of the widget',
};

const startDate: ContentField = {
	key: 'start_date',
	displayName: 'Start Date',
	type: 'dateTime',
	description: 'Start of the window, before End Date',
};

const endDate: ContentField = {
	key: 'end_date',
	displayName: 'End Date',
	type: 'dateTime',
	description: 'End of the window',
};

// Sent as { size: value }. On Update the object replaces the stored one, so list every size to keep.
const bySize = (key: string, of: ContentField): ContentField => ({
	key,
	displayName: `${of.displayName} by Size`,
	type: 'rows',
	item: 'Size',
	keyedByName: true,
	description: `${of.displayName} for one size, over ${of.displayName}. Update replaces every size set before; Extra Content {"${key}": null} clears them.`,
	fields: [
		{
			key: 'name',
			displayName: 'Size',
			type: 'options',
			options: ['small', 'medium', 'large', 'lock_screen'],
			required: true,
			description:
				'Small, Medium and Large are the Home Screen sizes. Lock Screen covers every Lock Screen size; Android has none.',
		},
		{ ...of, key: 'value', required: true, description: `${of.displayName} at that size` },
	],
});

const density: ContentField = {
	key: 'density',
	displayName: 'Row Density',
	type: 'options',
	options: ['auto', 'compact', 'comfortable'],
	description:
		'Row spacing of the list. A density set here overrides the Row Density picked in the PushWard app. Update without it keeps the current one, and Extra Content {"density": null} clears it. Clear it (and density_by_size) in the same update that moves the widget to another template, or the update is refused.',
};

const templates: ContentTemplate[] = [
	{
		value: 'battery',
		name: 'Battery',
		description: 'Charge rings of several devices',
		fields: [
			{
				key: 'devices',
				displayName: 'Devices',
				type: 'rows',
				item: 'Device',
				required: true,
				description: 'Devices to show, from 1 to 8',
				fields: [
					{
						key: 'name',
						displayName: 'Name',
						type: 'string',
						required: true,
						description: 'Device label, up to 32 characters',
					},
					{
						key: 'level',
						displayName: 'Level',
						type: 'number',
						required: true,
						typeOptions: { minValue: 0, maxValue: 100 },
						description: 'Charge percentage, from 0 to 100',
					},
					{
						key: 'charging',
						displayName: 'Charging',
						type: 'boolean',
						description: 'Whether a charging bolt is shown on the ring',
					},
					{
						key: 'icon',
						displayName: 'Icon',
						type: 'string',
						description: 'SF Symbol shown inside the ring, up to 128 characters',
					},
					{
						key: 'color',
						displayName: 'Color',
						type: 'string',
						description: 'Ring color, named or hex (#RRGGBB or #RRGGBBAA)',
					},
				],
			},
		],
	},
	{
		value: 'countdown',
		name: 'Countdown',
		description: 'Time left until a date',
		fields: [
			{ ...endDate, required: true, description: 'When the countdown ends' },
			startDate,
			{
				key: 'expired_text',
				displayName: 'Expired Text',
				type: 'string',
				description: 'Text shown after the end date, up to 64 characters',
			},
		],
	},
	{
		value: 'flow',
		name: 'Flow',
		description: 'Flow between inputs, storage, exchange and output',
		fields: [
			{
				key: 'flow',
				displayName: 'Flow (JSON)',
				type: 'json',
				required: true,
				description:
					'JSON object with inputs (up to 3), output, storage and exchange. Each node needs a rate.',
			},
		],
	},
	{
		value: 'gauge',
		name: 'Gauge',
		description: 'One value on a scale',
		fields: [
			requiredValue,
			{ ...minValue, required: true },
			{ ...maxValue, required: true },
			unit,
			trend,
			severity,
		],
	},
	{
		value: 'heatmap',
		name: 'Heatmap',
		description: 'Calendar grid of daily values',
		fields: [
			{
				key: 'cells',
				displayName: 'Cells',
				type: 'numberList',
				nullable: true,
				required: true,
				placeholder: 'e.g. 3, 0, null, 5, 2, 8, 1',
				description:
					'Comma-separated daily values, oldest first, from 7 to 154. An empty entry or null is a day with no data; a comma after the last value is ignored.',
			},
			{ ...value, description: 'Headline number shown next to the label' },
			{ ...minValue, description: 'Values at or below it get the faintest color. Defaults to 0.' },
			{
				...maxValue,
				description:
					'Value that gets the full color, above Min Value. The field starts at 100; leave it out to use the largest cell.',
			},
			unit,
			{ ...endDate, description: 'Day of the last cell. Defaults to the day of the last update.' },
		],
	},
	{
		value: 'progress',
		name: 'Progress',
		description: 'Progress bar',
		fields: [
			{
				...value,
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				description: 'Progress from 0 to 1. Not needed when Start Date and End Date are both set.',
			},
			startDate,
			endDate,
		],
	},
	{
		value: 'schedule',
		name: 'Schedule',
		description: 'Timeline of periods such as hourly prices',
		fields: [
			{
				key: 'periods',
				displayName: 'Periods',
				type: 'rows',
				item: 'Period',
				required: true,
				description: 'Periods in strictly increasing order of start, from 1 to 48',
				fields: [
					{
						key: 'start',
						displayName: 'Start',
						type: 'dateTime',
						required: true,
						description: 'When the period starts. It lasts until the next one.',
					},
					{
						key: 'value',
						displayName: 'Value',
						type: 'number',
						required: true,
						description: 'Value for the period',
					},
					{
						key: 'level',
						displayName: 'Level',
						type: 'options',
						options: ['low', 'medium', 'high'],
						description: 'Band of the period. Clients derive it from the range when blank.',
					},
				],
			},
			unit,
		],
	},
	{
		value: 'stat_list',
		name: 'Stat List',
		description: 'List of labeled values',
		fields: [
			{
				key: 'stat_rows',
				displayName: 'Stat Rows',
				type: 'rows',
				item: 'Row',
				required: true,
				description: 'Rows of the list, from 1 to 6',
				fields: [
					{
						key: 'label',
						displayName: 'Label',
						type: 'string',
						required: true,
						description: 'Row label, up to 32 characters',
					},
					{
						key: 'value',
						displayName: 'Value',
						type: 'string',
						required: true,
						description: 'Row value, up to 32 characters',
					},
					{
						key: 'unit',
						displayName: 'Unit',
						type: 'string',
						description: 'Unit shown after the value, up to 16 characters',
					},
				],
			},
			density,
			bySize('density_by_size', density),
		],
	},
	{
		value: 'status',
		name: 'Status',
		description: 'Single status with a severity',
		fields: [severity],
	},
	{
		value: 'trend',
		name: 'Trend',
		description: 'Value with a sparkline',
		fields: [
			requiredValue,
			{
				key: 'points',
				displayName: 'Points',
				type: 'numberList',
				required: true,
				placeholder: 'e.g. 3, 5, 4, 8',
				description: 'Comma-separated numbers drawn as the sparkline, from 2 to 48',
			},
			minValue,
			maxValue,
			unit,
			trend,
		],
	},
	{
		value: 'value',
		name: 'Value',
		description: 'One number with an optional trend',
		fields: [value, unit, trend, severity],
	},
];

const widgetCommon: ContentField[] = [
	...commonFields,
	{
		key: 'label',
		displayName: 'Label',
		type: 'string',
		description: 'Label of the widget, up to 256 characters',
	},
];

const style: ContentField = {
	key: 'style',
	displayName: 'Style',
	type: 'options',
	options: ['standard', 'bold', 'classic'],
	// 0.3.0 saved these names. n8n still runs a node holding one (the editor only marks it), so send the new name.
	renamed: { refined: 'standard', rethink: 'bold', original: 'classic' },
	description:
		'Standard is the default look, Bold lays the same data out differently and Classic is the earlier design. A style set here overrides the one picked in the PushWard app. Create without it lets the app decide; Update without it keeps the current style, and Extra Content {"style": null} clears it.',
};

export const widgetTemplates: ContentTemplate[] = templates.map((template) => ({
	...template,
	fields: [...template.fields, style, bySize('style_by_size', style), ...widgetCommon],
}));
