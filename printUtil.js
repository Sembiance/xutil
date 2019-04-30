"use strict";

const XU = require("@sembiance/xu"),
	util = require("util"),
	chalk = require("chalk");

chalk.enabled = true;
chalk.level = 2;

exports.toSize = function toSize(num, precision=1)
{
	if(num<XU.KB)
		return num.toLocaleString() + " bytes";
	else if(num<XU.MB)
		return (num/XU.KB).toLocaleString("en", {minimumFractionDigits : precision, maximumFractionDigits : precision}) + "KB";
	else if(num<XU.GB)
		return (num/XU.MB).toLocaleString("en", {minimumFractionDigits : precision, maximumFractionDigits : precision}) + "MB";
	else if(num<XU.TB)
		return (num/XU.GB).toLocaleString("en", {minimumFractionDigits : precision, maximumFractionDigits : precision}) + "GB";
	else if(num<XU.PB)
		return (num/XU.TB).toLocaleString("en", {minimumFractionDigits : precision, maximumFractionDigits : precision}) + "TB";
};

exports.columnizeObject = function columnizeObject(o, options={})
{
	let rows = Object.reduce(o, (k, v, r) => { r.push([k, v]); return r; }, []);
	if(options.sorter)
		rows.sort(options.sorter);

	if(options.formatter)
		rows = rows.map(options.formatter);
	else
		rows = rows.map(row => { row[1] = (typeof row[1]==="number" ? row[1].toLocaleString() : row[1]); return row; });

	if(options.header)
		rows.splice(0, 0, options.header);

	if(options.alignment)
		options.alignment = options.alignment.map(a => a.substring(0, 1).toLowerCase());

	const maxColSizes = [];
	rows.forEach(row => { row.forEach((col, i) => { maxColSizes[i] = Math.max((maxColSizes[i] || 0), (""+col).length); }); });

	if(options.header)
		rows.splice(1, 0, maxColSizes.map(maxColSize => chalk.hex("#00FFFF")("-".repeat(maxColSize))));

	let result = "";

	const spacing = options.padding || 5;
	rows.forEach((row, rowNum) =>
	{
		let rowOut = "";
		row.forEach((_col, i) =>
		{
			const col = "" + _col;
			
			const a = (options.header && rowNum===0) ? "c" : (options.alignment ? (options.alignment[i] || "l") : "l");
			const colPadding = maxColSizes[i] - col.length;

			if(a==="c" || a==="r")
				rowOut += " ".repeat(Math.floor(colPadding/(a==="c" ? 2 : 1)));

			rowOut += col;

			if(a==="c" || a==="l")
				rowOut += " ".repeat(Math.round(colPadding/(a==="c" ? 2 : 1)));

			rowOut += " ".repeat(spacing);
		});

		result += rowOut + "\n";
	});

	return result;
};

exports.columnizeObjects = function columnizeObjects(objects, options={})
{
	const rows = XU.clone(objects);

	const colNames = options.colNames || rows.map(object => Object.keys(object)).flat().unique();
	const colNameMap = Object.merge(colNames.reduce((r, colName) => { r[colName] = colName.replace( /([A-Z])/g, " $1" ).toProperCase(); return r; }, {}), options.colNameMap || {});
	const alignmentDefault = options.alignmentDefault || "l";
	const colTypes = colNames.map(colName => { const v = rows[0][colName]; return Number.isNumber(v) ? "number" : typeof v; });
	const booleanValues = options.booleanValues || ["True", "False"];

	if(options.sorter)
		rows.sort(options.sorter);

	if(options.formatter)
		rows.forEach(object => colNames.forEach(colName => { object[colName] = options.formatter(colName, object[colName]); }));
	else
		rows.forEach(object => colNames.forEach((colName, i) => { const v=object[colName]; object[colName] = colTypes[i]==="boolean" ? booleanValues[v ? 0 : 1] : (colTypes[i]==="number" ? (typeof v==="number" ? v.toLocaleString() : 0) : v); }));

	const maxColSizeMap = {};

	rows.forEach(row => colNames.forEach(colName => { if(row.hasOwnProperty(colName)) { maxColSizeMap[colName] = Math.max((maxColSizeMap[colName] || 0), (""+row[colName]).length, colNameMap[colName].length); } }));	// eslint-disable-line curly

	rows.splice(0, 0, Object.map(colNameMap, (k, v) => v), Object.map(colNameMap, k => [k, chalk.hex("#00FFFF")("-".repeat(maxColSizeMap[k]))]));

	let result = "";

	const spacing = options.padding || 5;
	rows.forEach((row, rowNum) =>
	{
		let rowOut = "";
		colNames.forEach((colName, i) =>
		{
			const col = "" + row[colName];
			const a = rowNum===0 ? "c" : (options.alignment ? (options.alignment[colName] || alignmentDefault) : (colTypes[i]==="number" ? "r" : (colTypes[i]==="boolean" ? "c" : alignmentDefault)));
			const colPadding = maxColSizeMap[colName] - col.length;

			if(a==="c" || a==="r")
				rowOut += " ".repeat(Math.floor(colPadding/(a==="c" ? 2 : 1)));

			if(rowNum===0)
				rowOut += chalk.hex("#FFFFFF")(col);
			else
				rowOut += (options.color && options.color[colName] ? chalk.hex((typeof options.color[colName]==="function" ? options.color[colName](objects[(rowNum<=1 ? rowNum : (rowNum-2))][colName]) : options.color[colName]))(col) : col);

			if(a==="c" || a==="l")
				rowOut += " ".repeat(Math.round(colPadding/(a==="c" ? 2 : 1)));

			rowOut += " ".repeat(spacing);
		});

		result += rowOut + "\n";
	});

	return result;
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
	process.stdout.write(chalk.whiteBright(label) + ": ");
	process.stdout.write(chalk.hex("#FFFF00")(keys[0]));
	const firstValue = " " + values[0].toLocaleString() + " (" + Math.round((values[0]/TOTAL)*100) + "%)";
	process.stdout.write(firstValue);
	const secondValue = " " + values[1].toLocaleString() + " (" + Math.round((values[1]/TOTAL)*100) + "%)";
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
	const COLORS = ["#FF8700", "#AF5FD7", "#00FF5F", "#D7FF00", "#D70087", "#005FFF", "#BCBCBC"].pushCopyInPlace(10);
	const LINES = Object.entries(o).sort((a, b) => b[1]-a[1]);
	const TOTAL = Object.values(o).sum();
	const VALUES = LINES.map(line => line[1].toLocaleString() + " (" + Math.round((line[1]/TOTAL)*100) + "%)");
	const longestKey = LINES.map(line => line[0].length).sort((a, b) => b-a)[0];
	const barLength = lineLength-(longestKey+2);

	process.stdout.write(" ".repeat(Math.round((lineLength-label.length)/2)) + chalk.yellowBright(label) + "\n");
	process.stdout.write(chalk.cyanBright("=").repeat(lineLength) + "\n");

	LINES.forEach((LINE, i) =>
	{
		process.stdout.write(chalk.whiteBright(LINE[0].padStart(longestKey)) + ": ");
		process.stdout.write(chalk.hex(COLORS[i])("█".repeat(Math.max((LINE[1] > 0 ? 1 : 0), Math.round(barLength*(LINE[1]/TOTAL))))));
		process.stdout.write(" " + VALUES[i]);
		process.stdout.write("\n");
	});

	process.stdout.write("\n");
};

// An advanced log function that supports padded length strings and numbers and color
// %10s : Will pad the left side of the string with spaces to at least 10 length. Can also pad all other values such as %7d
// %D   : Auto formats the string with .toLocaleString()
// %j   : Outputs colorized JSON on 1 line
// %J	: Outputs colorized JSON over multiple lines
// %#FFFFFFs : Outputs the string (or digit or whatever) in the given hex color.
// %#FFFFFF[bdiuvsh] : Outputs the string in the given color with the letter modifier, see MODIFIERS map below
// %0.2f : Output a float formatted value
exports.log = function log(s, ...args)
{
	const MODIFIERS =
	{
		b   : "bold",
		m   : "dim",
		i   : "italic",
		u   : "underline",
		v   : "inverse",
		"-" : "strikethrough",
		h   : "hidden"
	};
	let codeNum = 0;

	for(let i=0;i<s.length;i++)
	{
		const part = s.substring(i);
		const code = part.match(/^%(#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f])?([bmiuvh-])?([0-9]+)?[.]?([0-9]+)?([sdDjJf%])/);
		if(code)
		{
			let v = "";
			switch(code[5])
			{
				case "%":
					v = "%";
					break;
				case "d":
					v = +args[codeNum++];
					break;
				case "f":
					v = args[codeNum++].toFixed(+code[4]);
					break;
				case "D":
					v = (+args[codeNum++]).toLocaleString();
					break;
				case "s":
					v = args[codeNum++];
					break;
				case "j":
					v = util.inspect(args[codeNum++], {colors : true, depth : Infinity, breakLength : Infinity});
					break;
				case "J":
					v = util.inspect(args[codeNum++], {colors : true, depth : Infinity});
					break;
			}

			if(code[3] && (code[3]-v.length)>0)
				v = v.padStart(code[3], " ");

			if(code[1] && code[2])
				process.stdout.write(chalk.hex(code[1])[MODIFIERS[code[2]]](v));
			else if(code[1])
				process.stdout.write(chalk.hex(code[1])(v));
			else
				process.stdout.write(chalk.reset(v));

			i += code[0].length-1;
			continue;
		}

		process.stdout.write(chalk.reset(s.charAt(i)));
	}

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

	exports.log("%#00FFFFs", "/" + "-".repeat(text.length+2) + "\\");
	exports.log("%#00FFFFs %" + (options.color || "#FFFFFF") + "s %#00FFFFs", "|", text, "|");
	exports.log("%#00FFFFs", "\\" + "-".repeat(text.length+2) + "/");

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

	exports.log("%" + (options.color || "#FFFFFF") + "s", text);
	exports.log("%#00FFFFs", "-".repeat(text.length));

	if(options.suffix)
		process.stdout.write(options.suffix);
};

// Prints out a list of items with an optional "header" in options
exports.list = function list(items, options={})
{
	if(options.prefix)
		process.stdout.write(options.prefix);

	if(options.header)
		exports[(options.headerType==="major" ? "major" : "minor") + "Header"](options.header, (options.headerColor ? { color : options.headerColor } : undefined));

	items.forEach(item => process.stdout.write(" ".repeat(options.indent || 2) + "* " + item + "\n"));

	if(options.suffix)
		process.stdout.write(options.suffix);
};
