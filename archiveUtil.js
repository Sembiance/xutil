"use strict";

const XU = require("@sembiance/xu"),
	tiptoe = require("tiptoe"),
	fs = require("fs"),
	fileUtil = require("./fileUtil.js"),
	unicodeUtil = require("./unicodeUtil.js"),
	{DOS} = require("./dosUtil.js"),
	glob = require("glob"),
	runUtil = require("./runUtil.js"),
	path = require("path");

const RAM_DIR = "/mnt/ram";

function tscompExtract(filePath, extractionPath, cb)
{
	const dos = new DOS();

	tiptoe(
		function setup()
		{
			dos.setup(this);
		},
		function copyArchiveToHD()
		{
			dos.copyToHD(filePath, path.join("WORK", path.basename(filePath)), this);
		},
		function prepareListCmd()
		{
			dos.autoExec(["C:\\APP\\TSCOMP.EXE -l C:\\WORK\\" + path.basename(filePath) + " > C:\\TMP\\TSFILES.TXT", "REBOOT.COM"], this);
		},
		function readFileList()
		{
			dos.readFromHD("TMP/TSFILES.TXT", this);
		},
		function prepareExtractCmd(tscompOutput)
		{
			this.data.tscompFilenames = tscompOutput.toString("utf8").split("\n").filter(line => line.trim().startsWith("=>")).map(line => line.trim().substring(2));

			dos.autoExec(["cd WORK", ...this.data.tscompFilenames.map(fn => "C:\\APP\\TSCOMP.EXE -d " + path.basename(filePath) + " " + fn)], this);
		},
		function copyFileResults()
		{
			dos.copyFromHD(this.data.tscompFilenames.map(fn => path.join("WORK", fn)), extractionPath, this);
		},
		function cleanup()
		{
			dos.teardown(this);
		},
		cb
	);
}

function pcxlibExtract(filePath, extractionPath, cb)
{
	const dos = new DOS();

	tiptoe(
		function setup()
		{
			dos.setup(this);
		},
		function copyArchiveToHD()
		{
			dos.copyToHD(filePath, path.join("WORK", path.basename(filePath)), this);
		},
		function prepareExtractCmd()
		{
			dos.autoExec(["cd TMP", "C:\\APP\\PCXLIB.EXE C:\\WORK\\" + path.basename(filePath) + " /X"], this);
		},
		function mountHD()
		{
			dos.mountHD(this);
		},
		function findExtractedFiles(hdMountDirPath)
		{
			glob(path.join(hdMountDirPath, "TMP", "*"), this);
		},
		function copyFileResults(extractedFiles)
		{
			(extractedFiles || []).parallelForEach((extractedFile, subcb) => fileUtil.copy(extractedFile, path.join(extractionPath, path.basename(extractedFile)), subcb), this);
		},
		function cleanup()
		{
			dos.teardown(this);
		},
		cb
	);
}

function extractWithCommandAndSuffix(command, suffix, filePath, extractionPath, cb)
{
	const WORK_DIR = fileUtil.generateTempFilePath(RAM_DIR);
	const filenameWithSuffix = path.basename(filePath) + (filePath.endsWith(suffix) ? "" : suffix);
	const filenameWithoutSuffix = path.basename(filenameWithSuffix, suffix);
	
	tiptoe(
		function createWorkDir()
		{
			fileUtil.mkdirp(WORK_DIR, this);
		},
		function copyFileToWorkDirWithSuffix()
		{
			fileUtil.copy(filePath, path.join(WORK_DIR, filenameWithSuffix), this);
		},
		function performExtraction()
		{
			runUtil.run(command, [path.join(WORK_DIR, filenameWithSuffix)], runUtil.SILENT, this);
		},
		function moveFiles()
		{
			fileUtil.move(path.join(WORK_DIR, filenameWithoutSuffix), path.join(extractionPath, filenameWithoutSuffix), this);
		},
		function cleanup()
		{
			fileUtil.unlink(WORK_DIR, this);
		},
		cb
	);
}

function amosExtract(filePath, extractionPath, cb)
{
	const filename = path.basename(filePath);
	
	tiptoe(
		function performExtraction()
		{
			runUtil.run("listamos", [filePath], runUtil.SILENT, this.parallel());
			runUtil.run("dumpamos", [filePath], {silent : true, cwd : extractionPath}, this.parallel());
		},
		function saveSourceCode(sourceCodeRaw)
		{
			const sourceCode = (sourceCodeRaw || "").trim();
			if(sourceCode.length===0 || sourceCode.endsWith("not an AMOS source file"))
				return this();

			fs.writeFile(path.join(extractionPath, filename + "_sourceCode"), sourceCodeRaw.trim(), XU.UTF8, this);
		},
		cb
	);
}

// Extracts the files in the given filePath if supported
exports.extract = function extract(archiveType, filePath, extractionPath, cb)
{
	const filenameWithExt = path.basename(filePath);
	const ext = path.extname(filenameWithExt);
	
	tiptoe(
		function getBeforeFiles()
		{
			glob(path.join(extractionPath, "**"), {nodir : true}, this);
		},
		function extractFiles(beforeFiles)
		{
			this.data.beforeFiles = beforeFiles.subtractAll(extractionPath);

			switch(archiveType)
			{
				case "zip":
					runUtil.run("unzip", ["-qod", extractionPath, "-P", "nopasswd", filePath], runUtil.SILENT, this);	// By passing a password to -P it avoids the program hanging when a file requires a password
					break;
				case "iso":
					runUtil.run("uniso", [filePath, extractionPath], runUtil.SILENT, this);
					break;
				case "lha":
					runUtil.run("lha", ["-x", "-w=" + extractionPath, filePath], runUtil.SILENT, this);
					break;
				case "arc":
					runUtil.run("arc", ["x", filePath], {cwd : extractionPath, silent : true}, this);
					break;
				case "lbr":
					runUtil.run("lbrate", [filePath], {cwd : extractionPath, silent : true}, this);
					break;
				case "rar":
					runUtil.run("unrar", ["x", "-p-", filePath, extractionPath], runUtil.SILENT, this);
					break;
				case "mscompress":
					extractWithCommandAndSuffix("msexpand", "_", filePath, extractionPath, this);
					break;
				case "tscomp":
					tscompExtract(filePath, extractionPath, this);
					break;
				case "pcxlib":
					pcxlibExtract(filePath, extractionPath, this);
					break;
				case "ico":
					runUtil.run("convert", [filePath, path.join(extractionPath, filenameWithExt + ".png")], runUtil.SILENT, this);
					break;
				case "xpk":
					runUtil.run("amigadepacker", ["-o", path.join(extractionPath, (ext===".xpk" ? path.basename(filenameWithExt, ext) : (filenameWithExt + ".unpacked"))), filePath], runUtil.SILENT, this);
					break;
				case "tar":
					runUtil.run("tar", ["-xf", filePath, "-C", extractionPath], runUtil.SILENT, this);
					break;
				case "gz":
					extractWithCommandAndSuffix("gunzip", ".gz", filePath, extractionPath, this);
					break;
				case "bz2":
					extractWithCommandAndSuffix("bunzip2", ".bz2", filePath, extractionPath, this);
					break;
				case "ttcomp":
					runUtil.run("ttdecomp", [filePath, path.join(extractionPath, filenameWithExt + ".unpacked")], runUtil.SILENT, this);
					break;
				case "powerpack":	// was before: app-arch/ppunpack  runUtil.run("ppunpack", [filePath, path.join(extractionPath, (ext===".pp" ? path.basename(filenameWithExt, ext) : (filenameWithExt + ".unpacked")))], runUtil.SILENT, this);
				case "dms":
				case "lzx":
				case "sit":
					runUtil.run("unar", ["-o", extractionPath, filePath], runUtil.SILENT, this);
					break;
				case "amos":
					amosExtract(filePath, extractionPath, this);
					break;
				case "adf":
					runUtil.run("xdftool", [filePath, "unpack", extractionPath], runUtil.SILENT, this);
					break;

				default:
					return cb(new Error("Unsuported archive type " + archiveType + " for file: " + filePath));
			}
		},
		function fixPermissions()
		{
			runUtil.run("fixPerms", [], {silent : true, cwd : extractionPath}, this);
		},
		function fixEncodings()
		{
			// Encodings out of archives can often be in something other than UTF-8. So we convert to UTF8 so that glob actually WORKS, as v8 chokes on anything other than UTF8 encoded filenames/dirs
			unicodeUtil.fixDirEncodings(extractionPath, this);
		},
		function getAfterFiles()
		{
			glob(path.join(extractionPath, "**"), {nodir : true}, this);
		},
		function returnResults(err, afterFiles)
		{
			if(err)
				return cb(err);

			cb(undefined, afterFiles.subtractAll([extractionPath, ...this.data.beforeFiles]).map(v => path.relative(extractionPath, v)).filterEmpty());
		}
	);
};

// Will zip the given filePaths into zipPath
// Can rename files on the fly with renameMap and can set the cwd in options as well
exports.zipFiles = function zipFiles(_filePaths, zipPath, options, cb)
{
	if(!cb)
	{
		cb = options;	// eslint-disable-line no-param-reassign
		options = { };	// eslint-disable-line no-param-reassign
	}

	const filePaths = _filePaths.slice();

	tiptoe(
		function createRenameDir()
		{
			if(!options.renameMap)
				return this();

			this.data.tmpRenameDir = fileUtil.generateTempFilePath();

			fs.mkdir(this.data.tmpRenameDir, this);
		},
		function copyFiles()
		{
			if(!options.renameMap)
				return this();
			
			filePaths.parallelForEach((filePath, subcb, i) =>
			{
				const renameTo = options.renameMap[path.basename(filePath)];
				if(!renameTo)
					return setImmediate(subcb);

				const destFilePath = path.join(this.data.tmpRenameDir, renameTo);
				filePaths[i] = destFilePath;
				
				fileUtil.copy(path.join((options.cwd || ""), filePath), destFilePath, subcb);
			}, this);
		},
		function createZip()
		{
			const cwd = options.cwd || path.dirname(filePaths[0]);
			const zipArgs = ["-r"];
			if(options.junkPaths)
				zipArgs.push("-j");
			zipArgs.push(zipPath, ...filePaths);

			runUtil.run("zip", zipArgs, { cwd, silent : true }, this);
		},
		function cleanupTmpDir()
		{
			if(!options.renameMap)
				return this();

			fileUtil.unlink(this.data.tmpRenameDir, this);
		},
		cb
	);
};