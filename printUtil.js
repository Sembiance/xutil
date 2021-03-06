"use strict";
const XU = require("@sembiance/xu"),
	chalk = require("chalk");

chalk.level = 2;

exports.toSize = function toSize(num, precision=1)
{
	if(num<XU.KB)
		return `${num.toLocaleString()} bytes`;
	else if(num<XU.MB)
		return `${(num/XU.KB).toLocaleString("en", {minimumFractionDigits : precision, maximumFractionDigits : precision})}KB`;
	else if(num<XU.GB)
		return `${(num/XU.MB).toLocaleString("en", {minimumFractionDigits : precision, maximumFractionDigits : precision})}MB`;
	else if(num<XU.TB)
		return `${(num/XU.GB).toLocaleString("en", {minimumFractionDigits : precision, maximumFractionDigits : precision})}GB`;
	else if(num<XU.PB)
		return `${(num/XU.TB).toLocaleString("en", {minimumFractionDigits : precision, maximumFractionDigits : precision})}TB`;
};

exports.columnizeObject = function columnizeObject(o, options={})
{
	let rows = Object.reduce(o, (k, v, r) => { r.push([k, v]); return r; }, []);
	if(options.sorter)
		rows.sort(options.sorter);

	rows = options.formatter ? rows.map(options.formatter) : rows.map(row => { row[1] = (typeof row[1]==="number" ? row[1].toLocaleString() : row[1]); return row; });

	if(options.header)
		rows.unshift(options.header);

	if(options.alignment)
		options.alignment = options.alignment.map(a => a.charAt(0).toLowerCase());

	const maxColSizes = [];
	rows.forEach(row => row.forEach((col, i) => { maxColSizes[i] = Math.max((maxColSizes[i] || 0), (`${col}`).length); }));

	if(options.header)
		rows.splice(1, 0, maxColSizes.map(maxColSize => chalk.hex("#00FFFF")("-".repeat(maxColSize))));

	let result = "";

	const spacing = options.padding || 5;
	rows.forEach((row, rowNum) =>
	{
		let rowOut = "";
		row.forEach((_col, i) =>
		{
			const col = `${_col}`;
			
			const a = (options.header && rowNum===0) ? "c" : (options.alignment ? (options.alignment[i] || "l") : "l");
			const colPadding = maxColSizes[i] - col.length;

			if(a==="c" || a==="r")
				rowOut += " ".repeat(Math.floor(colPadding/(a==="c" ? 2 : 1)));

			rowOut += col;

			if(a==="c" || a==="l")
				rowOut += " ".repeat(Math.round(colPadding/(a==="c" ? 2 : 1)));

			rowOut += " ".repeat(spacing);
		});

		result += `${rowOut}\n`;
	});

	return result;
};

exports.columnizeObjects = function columnizeObjects(objects, options={})
{
	const rows = XU.clone(objects);
	chalk.level = (options.noColor ? 0 : 2);

	const colNames = options.colNames || rows.flatMap(object => Object.keys(object).filter(k => !k.startsWith("_"))).unique();
	const colNameMap = Object.assign(colNames.reduce((r, colName) => { r[colName] = colName.replace( /([A-Z])/g, " $1" ).toProperCase(); return r; }, {}), options.colNameMap || {});	// eslint-disable-line prefer-named-capture-group
	const alignmentDefault = options.alignmentDefault || "l";
	const colTypes = colNames.map(colName => (typeof rows[0][colName]));
	const booleanValues = options.booleanValues || ["True", "False"];

	if(options.sorter)
		rows.sort(options.sorter);

	function defaultFormatter(k, v, o, i)
	{
		if(colTypes[i]==="boolean")
			return booleanValues[v ? 0 : 1];
		if(colTypes[i]==="number")
			return (typeof v==="number" ? v.toLocaleString() : 0);

		return typeof v==="undefined" ? "" : v;
	}

	rows.forEach(object => colNames.forEach((colName, i) => { object[colName] = (options.formatter || defaultFormatter)(colName, object[colName], object, i); }));

	const maxColSizeMap = {};

	rows.forEach(row => colNames.forEach(colName => { if(row.hasOwnProperty(colName)) { maxColSizeMap[colName] = Math.max((maxColSizeMap[colName] || 0), (`${row[colName]}`).length, colNameMap[colName].length); } }));	// eslint-disable-line curly

	rows.unshift(Object.map(colNameMap, (k, v) => v), Object.map(colNameMap, k => [k, chalk.hex("#00FFFF")("-".repeat(maxColSizeMap[k]))]));

	let result = "";

	rows.forEach((row, rowNum) =>
	{
		let rowOut = "";
		colNames.forEach((colName, i) =>
		{
			const col = `${row[colName]}`;
			const a = rowNum===0 ? "c" : (options.alignment ? (options.alignment[colName] || alignmentDefault) : (colTypes[i]==="number" ? "r" : (colTypes[i]==="boolean" ? "c" : alignmentDefault)));
			const colPadding = maxColSizeMap[colName] - col.length;

			if(a==="c" || a==="r")
				rowOut += " ".repeat(Math.floor(colPadding/(a==="c" ? 2 : 1)));

			let color = rowNum===0 ? "#FFFFFF" : null;
			if(rowNum>1 && options && options.color && options.color[colName])
				color = (typeof options.color[colName]==="function") ? options.color[colName](objects[rowNum-2][colName], objects[rowNum-2]) : options.color[colName];

			rowOut += (color ? chalk.hex(color)(col) : col);

			if(a==="c" || a==="l")
				rowOut += " ".repeat(Math.round(colPadding/(a==="c" ? 2 : 1)));

			rowOut += " ".repeat((options.padding ? (typeof options.padding==="function" ? options.padding(colName) : (Object.isObject(options.padding) ? (options.padding[colName] || 5) : options.padding)) : 5));
		});

		result += `${rowOut + (row.hasOwnProperty("_suffix") ? row._suffix : "")}\n`;
	});

	return (options.noHeader ? result.split("\n").slice(2).join("\n") : result);
};

exports.singleLineBooleanPie = function singleLineBooleanPie(o, label="Label", lineLength=120)
{
	const COLORS = ["#FF5F00", "#AF5FD7", "#D7FF00", "#005FFF"];
	const barLength = lineLength-(label.length+2);
	const keys = Object.keys(o);
	const values = Object.values(o);
	const TOTAL = Object.values(o).sum();

	if(keys.length===1)
		keys.push(keys[0]==="true" ? "false" : "true");
	if(values.length===1)
		values.push(0);

	// Labels
	process.stdout.write(`${chalk.whiteBright(label)}: `);
	process.stdout.write(chalk.hex("#FFFF00")(keys[0]));
	const firstValue = ` ${values[0].toLocaleString()} (${Math.round((values[0]/TOTAL)*100)}%)`;
	process.stdout.write(firstValue);
	const secondValue = ` ${values[1].toLocaleString()} (${Math.round((values[1]/TOTAL)*100)}%)`;
	process.stdout.write(" ".repeat(barLength-((keys[0].length+keys[1].length+firstValue.length+secondValue.length)-1)));
	process.stdout.write(chalk.hex("#FFFF00")(keys[1]));
	process.stdout.write(secondValue);
	process.stdout.write("\n");

	// Pie
	process.stdout.write(" ".repeat(label.length+1) + chalk.cyanBright("["));
	values.forEach((v, i) => process.stdout.write(chalk.hex(COLORS[i])("█".repeat(barLength*(v/TOTAL)))));
	process.stdout.write(chalk.cyanBright("]"));

	process.stdout.write("\n\n");
};

exports.multiLineBarChart = function multiLineBarChart(o, label="Label", lineLength=120)
{
	if(!o)
		return;

	const COLORS = ["#FF8700", "#AF5FD7", "#00FF5F", "#D7FF00", "#D70087", "#005FFF", "#BCBCBC"].pushCopyInPlace(100);
	const LINES = Object.entries(o).sort((a, b) => b[1]-a[1]);
	const TOTAL = Object.values(o).sum();
	const VALUES = LINES.map(line => `${line[1].toLocaleString()} (${Math.round((line[1]/TOTAL)*100)}%)`);
	const longestKey = LINES.map(line => line[0].length).sort((a, b) => b-a)[0];
	const barLength = lineLength-(longestKey+2);

	process.stdout.write(`${" ".repeat(Math.round((lineLength-label.length)/2)) + chalk.yellowBright(label)}\n`);
	process.stdout.write(`${chalk.cyanBright("=").repeat(lineLength)}\n`);

	LINES.forEach((LINE, i) =>
	{
		process.stdout.write(`${chalk.whiteBright(LINE[0].padStart(longestKey))}: `);
		process.stdout.write(chalk.hex(COLORS[i])("█".repeat(Math.max((LINE[1] > 0 ? 1 : 0), Math.round(barLength*(LINE[1]/TOTAL))))));
		process.stdout.write(` ${VALUES[i]}`);
		process.stdout.write("\n");
	});

	process.stdout.write("\n");
};

// Prints out a major header that looks like this:
// /--------------\
// | Major Header |
// \--------------/
exports.majorHeader = function majorHeader(text, options={})
{
	if(options.prefix)
		process.stdout.write(options.prefix);

	XU.log`${`${XU.c.fg.cyan}/${"-".repeat(text.length+2)}\\`}`;
	XU.log`${`${XU.c.fg.cyan}|`} ${XU.c.fg.white + text} ${`${XU.c.fg.cyan}|`}`;
	XU.log`${`${XU.c.fg.cyan}\\${"-".repeat(text.length+2)}/`}`;

	if(options.suffix)
		process.stdout.write(options.suffix);
};

// Prints out a minor header that looks like this:
// Minor Header
// ------------
exports.minorHeader = function minorHeader(text, options={})
{
	if(options.prefix)
		process.stdout.write(options.prefix);

	XU.log`${XU.c.fg.white + text}`;
	XU.log`${XU.c.fg.cyan + "-".repeat(text.length)}`;

	if(options.suffix)
		process.stdout.write(options.suffix);
};

// Prints out a list of items with an optional "header" in options
exports.list = function list(items, options={})
{
	if(options.prefix)
		process.stdout.write(options.prefix);

	if(options.header)
		exports[`${options.headerType==="major" ? "major" : "minor"}Header`](options.header, (options.headerColor ? { color : options.headerColor } : undefined));

	items.forEach(item => process.stdout.write(`${" ".repeat(options.indent || 2)}* ${item}\n`));

	if(options.suffix)
		process.stdout.write(options.suffix);
};
