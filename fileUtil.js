"use strict";
const XU = require("@sembiance/xu"),
	fs = require("fs"),
	path = require("path"),
	os = require("os"),
	childProcess = require("child_process"),
	{performance} = require("perf_hooks"),
	globModule = require("glob"),	// eslint-disable-line node/no-restricted-require
	tiptoe = require("tiptoe");

// Glob has many built in issues, which is probably why the author wants to rewrite it: https://github.com/isaacs/node-glob/issues/405
// Further options: https://github.com/isaacs/node-glob
// This wrapper is an attempt to fix some of the issues that I myself have run into when using glob. sigh.
exports.glob = function glob(baseDirPath, matchPattern, _options, _cb)
{
	const {options, cb} = XU.optionscb(_options, _cb, {});

	// We always set dot to true, because it's not really obvious that it's going to exclude some files just because they start with a period
	// We also set the 'cwd' to the baseDirPath. Without this, if baseDirPath was part of the match pattern many characters would need to be manually escaped like brackets, question marks and other regex-like patterns.
	const globOptions = Object.assign({dot : true, cwd : baseDirPath}, options);
	globModule(matchPattern, globOptions, (err, results) =>
	{
		if(err)
			return setImmediate(() => cb(err));
		
		// Since we changed our cwd, we need to resolve our results relative to that
		cb(undefined, results.map(v => path.resolve(path.join(baseDirPath, v)) + (options.mark && v.endsWith("/") ? "/" : "")));
	});
};

// Sync version of glob above
exports.globSync = function globSync(baseDirPath, matchPattern, options={})
{
	return globModule.sync(matchPattern, Object.assign({dot : true, cwd : baseDirPath}, options)).map(v => path.resolve(path.join(baseDirPath, v)));
};

// Will safely write a file to disc by first writing to a tmp file and then renaming it
exports.writeFileSafe = function writeFileSafe(filePath, fileData, fileOptions, cb)
{
	const tmpFilePath = `${filePath}.tmp${Math.random()}`;
	tiptoe(
		function writeToTmpFile()
		{
			fs.writeFile(tmpFilePath, fileData, fileOptions, this);
		},
		function renameFile()
		{
			fs.rename(tmpFilePath, filePath, this);
		},
		cb
	);
};

// Same as above but sync version
exports.writeFileSafeSync = function writeFileSafeSync(filePath, fileData, fileOptions)
{
	const tmpFilePath = `${filePath}.tmp${Math.random()}`;
	fs.writeFileSync(tmpFilePath, fileData, fileOptions);
	fs.renameSync(tmpFilePath, filePath);
};

// Returns true if the target exists
exports.existsSync = function existsSync(target)
{
	try
	{
		fs.accessSync(target, fs.F_OK);
	}
	catch(err)
	{
		return false;
	}

	return true;
};

// Calls cb(err, true) if the target exists
exports.exists = function exists(target, cb)
{
	fs.access(target, fs.F_OK, err => cb(undefined, !err));
};

const TMP_DIR_PATH = exports.existsSync("/mnt/ram/tmp") ? "/mnt/ram/tmp" : os.tmpdir();
exports.generateTempFilePath = function generateTempFilePath(prefix=TMP_DIR_PATH, suffix=".tmp")
{
	let tempFilePath = null;
	const filePathPrefix = path.join(prefix.startsWith("/") ? "" : os.tmpdir(), prefix);

	do
		tempFilePath = path.join(filePathPrefix, ((`${performance.now()}`).replaceAll(".", "") + Math.randomInt(0, 1000000)) + suffix);
	while(exports.existsSync(tempFilePath));

	if(!tempFilePath)
		throw new Error("Failed to create temp file path.");

	return tempFilePath;
};

// Replaced the given findMe (which can be text or a regular expression) with replaceWith
exports.searchReplace = function searchReplace(filePath, findMe, replaceWith, cb)
{
	tiptoe(
		function checkFileExistance()
		{
			exports.exists(filePath, this);
		},
		function loadFile(fileExists)
		{
			if(!fileExists)
				return this.finish();

			fs.readFile(filePath, XU.UTF8, this);
		},
		function replaceAndSave(data)
		{
			fs.writeFile(filePath, data.toString("utf8")[typeof data==="string" ? "replaceAll" : "replace"](findMe, replaceWith), XU.UTF8, this);
		},
		cb
	);
};

// Copies a directory recursively from srcDirPath to destDirPath
exports.copyDirSync = function copyDirSync(srcDirPath, destDirPath)
{
	if(!exports.existsSync(destDirPath))
		fs.mkdirSync(destDirPath);
	
	if(fs.lstatSync(srcDirPath).isDirectory())
	{
		fs.readdirSync(srcDirPath).forEach(subFilename =>
		{
			const srcDirSubFilePath = path.join(srcDirPath, subFilename);
			if(fs.lstatSync(srcDirSubFilePath).isDirectory())
				exports.copyDirSync(srcDirSubFilePath, path.join(destDirPath, subFilename));
			else
				fs.copyFileSync(srcDirSubFilePath, path.join(destDirPath, subFilename));
		});
	}
};

exports.copyDir = function copyDir(srcDirPath, destDirPath, cb)
{
	tiptoe(
		function collectInfo()
		{
			exports.exists(destDirPath, this.parallel());
			fs.lstat(srcDirPath, this.parallel());
		},
		function makeDirIfNeeded(destDirExists, srcDirStat)
		{
			if(!srcDirStat.isDirectory())
				return this.finish();

			if(!destDirExists)
				fs.mkdir(destDirPath, this);
			else
				this();
		},
		function readSrcDir()
		{
			fs.readdir(srcDirPath, this);
		},
		function copyFilesAndDirs(srcDirFilenames)
		{
			srcDirFilenames.serialForEach((srcDirFilename, subcb) =>
			{
				const srcDirSubFilePath = path.join(srcDirPath, srcDirFilename);
				if(fs.lstatSync(srcDirSubFilePath).isDirectory())
					exports.copyDir(srcDirSubFilePath, path.join(destDirPath, srcDirFilename), subcb);
				else
					fs.copyFile(srcDirSubFilePath, path.join(destDirPath, srcDirFilename), subcb);
			}, this);
		},
		cb
	);
};

// Concatenates the _files array to dest
// suffix : Text to add to end of file
exports.concat = function concat(_files, dest, _options, _cb)
{
	const {options, cb} = XU.optionscb(_options, _cb);

	let writeSeperator = 1;

	const files = _files.slice();

	if(options.verbose)
		console.log("Combining to [%s] files: %s", dest, files.join(" "));

	const output = fs.createWriteStream(dest);

	let first = true;
	function concatNext()
	{
		if(first && options.prefix)
			output.write(options.prefix);

		if(options.filePrefixes && files.length)
			output.write(options.filePrefixes[writeSeperator-1]);

		first = false;

		if(options.seperator && (writeSeperator%2)===0)
			output.write(options.seperator);

		writeSeperator++;

		if(!files.length)
		{
			if(options.suffix)
				output.write(options.suffix, () => output.end(cb));
			else
				output.end(cb);
			
			return;
		}

		const input = fs.createReadStream(files.shift());
		input.pipe(output, { end : false });
		input.on("end", concatNext);
	}

	concatNext();
};

// Moves a file from src to dest, works even across disks
exports.move = function move(src, dest, cb)
{
	if(src===dest)
		return cb(new Error(`src and dest are identical: ${src}`));

	tiptoe(
		function checkExisting()
		{
			exports.exists(dest, this);
		},
		function removeExisting(exists)
		{
			if(exists)
				fs.unlink(dest, this);
			else
				this();
		},
		function tryRename()
		{
			this.capture();
			fs.rename(src, dest, this);
		},
		function copyFile(err)
		{
			if(!err)
				return this.finish();

			fs.copyFile(src, dest, this);
		},
		function removeFile()
		{
			fs.unlink(src, this);
		},
		cb
	);
};

// Deletes the target from disk, if it's a directory, will remove the entire directory and all sub directories and files
exports.unlink = function unlink(targetPath, cb)
{
	fs.rm(targetPath, {force : true, maxRetries : 1, recursive : true}, cb);
};

// Deletes the target from disk, if it's a directory, will remove the entire directory and all sub directories and files
exports.unlinkSync = function unlinkSync(targetPath)
{
	fs.rmSync(targetPath, {force : true, maxRetries : 1, recursive : true});
};

// Empties the dirPath, deleting anything in it
exports.emptyDir = function emptyDir(dirPath, cb)
{
	tiptoe(
		function findFilesAndDirs()
		{
			exports.glob(dirPath, "*", this);
		},
		function deleteFilesAndDirs(fileAndDirPaths)
		{
			fileAndDirPaths.parallelForEach((fileAndDirPath, subcb) => exports.unlink(fileAndDirPath, subcb), this);
		},
		cb
	);
};

// Returns the first letter of a file that can be used for dir breaking up
exports.getFirstLetterDir = function getFirstLetterDir(filePath)
{
	const firstLetter = filePath.charAt(0).toLowerCase();

	// Return the first letter if it's 'a' through 'z'
	if([].pushSequence(97, 122).map(v => String.fromCharCode(v)).includes(firstLetter))
		return firstLetter;
	
	// If the first letter is a number, return '0'
	if([].pushSequence(0, 9).map(v => (`${v}`)).includes(firstLetter))
		return "0";
	
	// Otherwise return underscore
	return "_";
};

// Returns true if files a and b are equals. Calls out to 'cmp' due to how optimized that program is for speed
exports.areEqual = function areEqual(a, b, cb)
{
	tiptoe(
		function runCMP()
		{
			childProcess.execFile("cmp", ["--silent", a, b], this);
		},
		function returnResult(err)
		{
			// If they are not equal, the exit code is 1, which execFile() treats as an error
			cb(undefined, !err);
		}
	);
};
