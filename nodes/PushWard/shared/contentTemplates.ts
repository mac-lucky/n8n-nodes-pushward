import type { IDisplayOptions, INodeProperties, NodeParameterValue } from 'n8n-workflow';

export interface ContentField {
	key: string;
	displayName: string;
	type:
		| 'boolean'
		| 'dateTime'
		| 'json'
		| 'number'
		| 'numberList'
		| 'options'
		| 'rows'
		| 'string'
		| 'stringList';
	description: string;
	required?: boolean;
	default?: NodeParameterValue;
	placeholder?: string;
	typeOptions?: INodeProperties['typeOptions'];
	options?: string[];
	// rows: the label of one entry, and the sub-fields of each entry
	item?: string;
	fields?: ContentField[];
	// rows: send { name: value } instead of an array
	keyedByName?: boolean;
}

export interface ContentTemplate {
	value: string;
	name: string;
	description: string;
	fields: ContentField[];
}

export const commonFields: ContentField[] = [
	{
		key: 'accent_color',
		displayName: 'Accent Color',
		type: 'string',
		description: 'Named color or hex (#RRGGBB or #RRGGBBAA)',
	},
	{
		key: 'background_color',
		displayName: 'Background Color',
		type: 'string',
		description: 'Named color or hex (#RRGGBB or #RRGGBBAA)',
	},
	{
		key: 'icon',
		displayName: 'Icon',
		type: 'string',
		placeholder: 'e.g. flame',
		description:
			'SF Symbol name, or a Material Design icon with the mdi: prefix, up to 128 characters',
	},
	{
		key: 'subtitle',
		displayName: 'Subtitle',
		type: 'string',
		description: 'Secondary line, up to 256 characters',
	},
	{
		key: 'text_color',
		displayName: 'Text Color',
		type: 'string',
		description: 'Named color or hex (#RRGGBB or #RRGGBBAA)',
	},
];

// Names carry the template so a value left over from another template is never read.
export const paramName = (template: string, key: string) =>
	`${template}_${key}`.replace(/_(\w)/g, (_, letter: string) => letter.toUpperCase());

export function findTemplate(templates: ContentTemplate[], name: string): ContentTemplate {
	const template = templates.find(({ value }) => value === name);
	if (!template) throw new Error(`Unknown template "${name}"`);
	return template;
}

export const requiredParams = (templates: ContentTemplate[], name: string) =>
	findTemplate(templates, name)
		.fields.filter(({ required }) => required)
		.map(({ key }) => paramName(name, key));

const alphabetical = (a: INodeProperties, b: INodeProperties) =>
	a.displayName.localeCompare(b.displayName);

const optionName = (value: string) => (value ? value[0].toUpperCase() + value.slice(1) : 'None');

const defaults = {
	boolean: false,
	dateTime: '',
	json: '{}',
	number: 0,
	numberList: '',
	string: '',
	stringList: '',
};

function property(
	field: ContentField,
	name: string,
	show?: IDisplayOptions['show'],
): INodeProperties {
	const base = {
		displayName: field.displayName,
		name,
		description: field.description,
		...(field.required && { required: true }),
		...(field.placeholder && { placeholder: field.placeholder }),
		...(field.typeOptions && { typeOptions: field.typeOptions }),
		...(show && { displayOptions: { show } }),
	};

	switch (field.type) {
		case 'rows': {
			const button = `Add ${field.item}`;
			return {
				...base,
				type: 'fixedCollection',
				placeholder: button,
				typeOptions: { multipleValues: true, multipleValueButtonText: button },
				default: {},
				options: [
					{
						displayName: field.item as string,
						name: 'item',
						values: (field.fields ?? []).map(entryProperty).sort(alphabetical),
					},
				],
			};
		}
		case 'options':
			return {
				...base,
				type: 'options',
				options: (field.options ?? []).map((value) => ({ name: optionName(value), value })),
				default: field.default ?? (field.options ?? [])[0],
			};
		default:
			return {
				...base,
				type: field.type === 'numberList' || field.type === 'stringList' ? 'string' : field.type,
				default: field.default ?? defaults[field.type],
			};
	}
}

// Every entry of a fixed collection stores all its sub-fields, so an optional enum needs a blank.
function entryProperty(field: ContentField): INodeProperties {
	const blankable = field.type === 'options' && !field.required;
	return property(
		blankable ? { ...field, options: ['', ...(field.options ?? [])], default: '' } : field,
		field.key,
	);
}

const extraContent: INodeProperties = {
	displayName: 'Extra Content (JSON)',
	name: 'extraContent',
	type: 'json',
	default: '{}',
	description: 'JSON object merged last over the content, for keys this node does not expose',
};

export function contentProperties(
	templates: ContentTemplate[],
	resource: string,
	createOperation: string,
	defaultTemplate: string,
): INodeProperties[] {
	const shownFor = (...operation: string[]) => ({ resource: [resource], operation });

	const contentFields = (
		operation: string,
		include: (field: ContentField) => boolean,
	): INodeProperties => ({
		displayName: 'Content Fields',
		name: 'contentFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: shownFor(operation) },
		default: {},
		options: [
			...templates.flatMap((template) =>
				template.fields.filter(include).map((field) =>
					property({ ...field, required: false }, paramName(template.value, field.key), {
						'/template': [template.value],
					}),
				),
			),
			extraContent,
		].sort(alphabetical),
	});

	return [
		{
			displayName: 'Template',
			name: 'template',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: shownFor(createOperation, 'update') },
			options: templates.map(({ name, value, description }) => ({ name, value, description })),
			default: defaultTemplate,
			description: 'Layout of the content',
		},
		...templates.flatMap((template) =>
			template.fields
				.filter(({ required }) => required)
				.map((field) =>
					property(field, paramName(template.value, field.key), {
						...shownFor(createOperation),
						template: [template.value],
					}),
				),
		),
		contentFields(createOperation, ({ required }) => !required),
		contentFields('update', () => true),
	];
}
