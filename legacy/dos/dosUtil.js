"use strict";

const XU = require("@sembiance/xu"),
	tiptoe = require("tiptoe"),
	fs = require("fs"),
	runUtil = require("./runUtil"),
	videoUtil = require("./videoUtil"),
	os = require("os"),
	fileUtil = require("./fileUtil"),
	path = require("path");

// Resources for controlling dosbox more via xdotool through xvfb:
// https://unix.stackexchange.com/questions/259294/use-xvfb-to-automate-x-program
// https://stackoverflow.com/questions/5094389/automation-using-xdotool-and-xvfb

class DOS
{
	constructor({masterHDFilePath=path.join(__dirname, "dos", "hd.img"), debug=false, recordVideoFilePath=null, timeout=XU.MINUTE*10, tmpDirPath=os.tmpdir()}={})
	{
		this.tmpDirPath = tmpDirPath;
		this.masterHDFilePath = masterHDFilePath;
		this.masterConfigFilePath = path.join(__dirname, "dos", "dosbox.conf");
		this.loopNum = null;
		this.setupDone = false;
		this.dosBoxCP = null;
		this.autoExecVanilla = null;
		this.exitCallbacks = [];
		this.timeout = timeout;
		this.debug = debug;
		if(recordVideoFilePath)
			this.recordVideoFilePath = recordVideoFilePath;
	}

	// Will create a temporary directory in RAM and copy the master HD image and config file over
	setup(cb)
	{
		if(this.setupDone)
			return;
		
		this.workDir = fileUtil.generateTempFilePath(this.tmpDirPath);
		this.hdFilePath = path.join(this.workDir, path.basename(this.masterHDFilePath));
		this.configFilePath = path.join(this.workDir, path.basename(this.masterConfigFilePath));
		this.hdMountDirPath = path.join(this.workDir, "hd");
		this.mountedAutoExecFilePath = path.join(this.hdMountDirPath, "AUTOEXEC.BAT");
		this.portNumFilePath = fileUtil.generateTempFilePath(this.tmpDirPath);

		const self=this;
		tiptoe(
			function mkWorkDir()
			{
				fs.mkdir(self.workDir, {recursive : true}, this);
			},
			function copyHDImgAndReadConfig()
			{
				fs.copyFile(self.masterHDFilePath, self.hdFilePath, this.parallel());
				fs.copyFile(self.masterConfigFilePath, self.configFilePath, this.parallel());
			},
			function addMountAndBootToConfig()
			{
				fs.appendFile(self.configFilePath, ["imgmount C " + self.hdFilePath + " -size 512,63,16,520 -t hdd -fs fat", "boot -l c"].join("\n"), XU.UTF8, this);
			},
			function recordAsSetup()
			{
				self.setupDone = true;
				this();
			},
			cb
		);
	}

	// Will copy a file to the DOS HD
	copyToHD(srcFilePath, dosFileSubPath, cb)
	{
		if(!this.setupDone)
			throw new Error("Setup hasn't been run yet!");
		
		if(path.basename(dosFileSubPath, path.extname(dosFileSubPath)).length>8 || path.extname(dosFileSubPath)>3)
			throw new Error("Invalid DOS 8.3 filename. Filename can't be longer than 8 chars, extension can't be longer than 3: " + path.basename(dosFileSubPath));

		const self=this;
		tiptoe(
			function mountHDIfNeeded()
			{
				self.mountHD(this);
			},
			function copyFile(hdMountDirPath, wasAlreadyMounted)
			{
				this.data.wasAlreadyMounted = wasAlreadyMounted;

				fs.copyFile(srcFilePath, path.join(hdMountDirPath, dosFileSubPath), this);
			},
			function unmountIfNeeded()
			{
				if(this.data.wasAlreadyMounted)
					this();
				else
					self.unmountHD(this);
			},
			cb
		);
	}

	// Will copy a file off the dos HD
	copyFromHD(dosFilesSubPath, destPath, cb)
	{
		if(!this.setupDone)
			throw new Error("Setup hasn't been run yet!");

		Array.force(dosFilesSubPath).forEach(dosFileSubPath =>
		{
			if(path.basename(dosFileSubPath, path.extname(dosFileSubPath)).length>8 || path.extname(dosFileSubPath)>3)
				throw new Error("Invalid DOS 8.3 filename. Filename can't be longer than 8 chars, extension can't be longer than 3: " + path.basename(dosFileSubPath));
		});

		const self=this;
		tiptoe(
			function mountHDIfNeeded()
			{
				self.mountHD(this);
			},
			function copyFile(hdMountDirPath, wasAlreadyMounted)
			{
				this.data.wasAlreadyMounted = wasAlreadyMounted;

				if(Array.isArray(dosFilesSubPath))
					dosFilesSubPath.parallelForEach((dosFileSubPath, subcb) => fs.copyFile(path.join(hdMountDirPath, dosFileSubPath), path.join(destPath, path.basename(dosFileSubPath)), subcb), this);
				else
					fs.copyFile(path.join(hdMountDirPath, dosFilesSubPath), destPath, this);
			},
			function unmountIfNeeded()
			{
				if(this.data.wasAlreadyMounted)
					this();
				else
					self.unmountHD(this);
			},
			cb
		);
	}

	// Will read a file from the HD
	readFromHD(dosFileSubPath, cb)
	{
		if(!this.setupDone)
			throw new Error("Setup hasn't been run yet!");

		const self=this;
		tiptoe(
			function mountHDIfNeeded()
			{
				self.mountHD(this);
			},
			function copyFile(hdMountDirPath, wasAlreadyMounted)
			{
				this.data.wasAlreadyMounted = wasAlreadyMounted;

				fs.readFile(path.join(hdMountDirPath, dosFileSubPath), this);
			},
			function unmountIfNeeded(dataRaw)
			{
				this.data.dataRaw = dataRaw;

				if(this.data.wasAlreadyMounted)
					this();
				else
					self.unmountHD(this);
			},
			function returnData()
			{
				this(undefined, this.data.dataRaw);
			},
			cb
		);
	}

	// Will mount our HD so we can perform operations on it
	mountHD(cb)
	{
		if(this.loopNum!==null)
			return setImmediate(() => cb(undefined, this.hdMountDirPath, true));

		if(this.dosBoxCP!==null)
			throw new Error("DOSBox currently running!");

		const self=this;
		tiptoe(
			function createMountDir()
			{
				fs.mkdir(self.hdMountDirPath, {recursive : true}, this);
			},
			function attachLoopDevice()
			{
				runUtil.run("losetup", ["-Pf", "--show", self.hdFilePath], runUtil.SILENT, this);
			},
			function mountHDImage(rawOut)
			{
				try
				{
					self.loopNum = +rawOut.toString("utf8").trim().match(/^\/dev\/loop(?<loopNum>\d+)/).groups.loopNum;
				}
				catch(err)
				{
					XU.log`Failed to call 'losetup -Pf --show ${self.hdFilePath}' ${rawOut}`;
				}
				
				runUtil.run("sudo", ["mount", "-t", "vfat", "-o", "uid=7777", "/dev/loop" + self.loopNum + "p1", self.hdMountDirPath], runUtil.SILENT, this);
			},
			function returnMountPath(err)
			{
				this(undefined, self.hdMountDirPath, false);
			},
			cb
		);
	}

	// Un mounts our HD
	unmountHD(cb)
	{
		if(this.loopNum===null)
			return setImmediate(cb);
		
		const self=this;
		tiptoe(
			function unmountHDImage()
			{
				runUtil.run("sudo", ["umount", self.hdMountDirPath], runUtil.SILENT, this);
			},
			function detachLoopDevice()
			{
				runUtil.run("losetup", ["-d", "/dev/loop" + self.loopNum], runUtil.SILENT, this);
			},
			function unrecordLoopNum()
			{
				self.loopNum = null;
				this();
			},
			cb
		);
	}

	// Automatically executes the lines and returns when all done
	autoExec(lines, cb)
	{
		const self=this;
		tiptoe(
			function appendLines()
			{
				const autoExecLines = Array.from(lines);
				if(self.debug)
					autoExecLines.push("choice /N /Ty,10");
				autoExecLines.push("REBOOT.COM");

				self.appendToAutoExec(autoExecLines, this);
				//self.appendToAutoExec(lines, this);	// Comment out above line and uncomment this to debug by not rebooting the DOS window
			},
			function runEm()
			{
				self.start(undefined, this);
			},
			cb
		);
	}

	// Writes the lines to the autoexec that takes place in the dos config
	appendToAutoExec(lines, cb)
	{
		const self=this;
		tiptoe(
			function mountIfNeeded()
			{
				self.mountHD(this);
			},
			function resetIfNeeded(hdMountDirPath, wasAlreadyMounted)
			{
				this.data.wasAlreadyMounted = wasAlreadyMounted;
				this.data.hdMountDirPath = hdMountDirPath;

				// If we've called this before, let's reset the autoexec bat to vanilla first
				if(self.autoExecVanilla)
					fs.writeFile(self.mountedAutoExecFilePath, self.autoExecVanilla, XU.UTF8, this);
				else
					fs.readFile(self.mountedAutoExecFilePath, XU.UTF8, this);
			},
			function appendLines(autoExecVanilla)
			{
				if(!self.autoExecVanilla)
					self.autoExecVanilla = autoExecVanilla;

				fs.appendFile(self.mountedAutoExecFilePath, Array.force(lines).join("\r\n"), XU.UTF8, this);
			},
			function unmountIfNeeded()
			{
				if(this.data.wasAlreadyMounted)
					this();
				else
					self.unmountHD(this);
			},
			cb
		);
	}

	// Will send the keys to the virtual doesbox window with the given delay then call the cb. Only works if virtualX was set
	sendKeys(keys, _options, _cb)
	{
		const {options, cb} = XU.optionscb(_options, _cb, {interval : XU.SECOND, delay : XU.SECOND*15});
	
		const self=this;
		setTimeout(() =>
		{
			if(!fileUtil.existsSync(self.portNumFilePath))
				return setImmediate(cb);

			const xPortNum = fs.readFileSync(self.portNumFilePath, XU.UTF8).trim();

			Array.force(keys).serialForEach((key, subcb) =>
			{
				if(Object.isObject(key) && key.delay)
					return setTimeout(subcb, key.delay), undefined;

				tiptoe(
					function sendKey()
					{
						runUtil.run("xdotool", ["search", "--class", "dosbox", "windowfocus", Array.isArray(key) ? "key" : "type", "--delay", "100", Array.isArray(key) ? key[0] : key], {silent : true, env : {"DISPLAY" : ":" + xPortNum}}, this);
					},
					function waitDelay()
					{
						if(!options.interval)
							return this();

						setTimeout(this, options.interval);
					},
					subcb
				);
			}, cb);
		}, options.delay);
	}

	// Will start up DOSBox
	start(_cb, exitcb)
	{
		if(this.dosBoxCP!==null)
			throw new Error("DOSBox already running!");
		if(this.loopNum!==null)
			throw new Error("HD currently mounted!");
		
		const cb = _cb || (() => {});

		const self=this;
		tiptoe(
			function runDOSBox()
			{
				const runArgs = {detached : true};
				runArgs.silent = !self.debug;
				runArgs.virtualX = !self.debug;
				runArgs.virtualXPortNumFile = self.portNumFilePath;
				runArgs.timeout = self.timeout;

				if(self.recordVideoFilePath)
					runArgs.recordVirtualX = self.recordVideoFilePath;

				runUtil.run("dosbox", ["-conf", self.configFilePath], runArgs, this);
			},
			function recordChildProcess(cp)
			{
				self.dosBoxCP = cp;
				self.dosBoxCP.on("exit", self.exitHandler.bind(self));

				if(exitcb)
					self.registerExitCallback(exitcb);

				this();
			},
			cb
		);
	}

	// Registers a cb to be called when DOSBox exits
	registerExitCallback(cb)
	{
		if(this.dosBoxCP===null)
			return setImmediate(cb);
			
		this.exitCallbacks.push(cb);
	}

	// Called when DOSBox exits
	exitHandler()
	{
		this.dosBoxCP = null;

		this.exitCallbacks.splice(0, this.exitCallbacks.length).forEach(exitCallback => setImmediate(exitCallback));
	}

	// Will stop DOSBox
	stop(cb)
	{
		if(this.dosBoxCP===null)
			throw new Error("DOSBox not running!");
		
		this.exitCallbacks.push(cb);
		this.dosBoxCP.kill();
	}

	// Will remove any files created in workDir
	teardown(cb)
	{
		const self=this;
		tiptoe(
			function unmountIfNeeded()
			{
				self.unmountHD(this);
			},
			function removeFiles()
			{
				fileUtil.unlink(self.workDir, this.parallel());
				fileUtil.unlink(self.portNumFilePath, this.parallel());
			},
			cb
		);
	}

	static quickOp({inFiles, outFiles, cmds, keys, keyOpts, timeout, screenshot=null, video=null, debug, tmpDirPath=os.tmpdir()}, cb)
	{
		const quickOpTmpDirPath = fileUtil.generateTempFilePath(this.tmpDirPath);
		const dosArgs = {tmpDirPath};
		if(video)
			dosArgs.recordVideoFilePath = video;
		if(screenshot)
			dosArgs.recordVideoFilePath = fileUtil.generateTempFilePath(this.tmpDirPath, ".mp4");
		if(timeout)
			dosArgs.timeout = timeout;
		if(debug)
			dosArgs.debug = debug;
		
		//if(!dosArgs.recordVideoFilePath)
		//{
		//	dosArgs.recordVideoFilePath = fileUtil.generateTempFilePath(this.tmpDirPath, ".mp4");
		//	console.log({inFiles, outFiles, cmds, vidDebug : dosArgs.recordVideoFilePath});
		//}

		const dos = new DOS(dosArgs);
		
		tiptoe(
			function createTmpDir()
			{
				fs.mkdir(quickOpTmpDirPath, {recursive : true}, this);
			},
			function setup()
			{
				dos.setup(this);
			},
			function copyInFilesToHD()
			{
				Object.entries(inFiles).serialForEach(([diskFilePath, dosFilePath], subcb) => dos.copyToHD(diskFilePath, dosFilePath, subcb), this);
			},
			function execCommands()
			{
				dos.autoExec(Array.force(cmds), this.parallel());
				if(keys)
					dos.sendKeys(Array.force(keys), keyOpts || {}, this.parallel());
			},
			function copyFileResult()
			{
				this.capture();	// We might not have an output file, so we just catch the error and ignore it
				Object.entries(outFiles).serialForEach(([dosFilePath, diskFilePath], subcb) => dos.copyFromHD(dosFilePath, diskFilePath, subcb), this);
			},
			function copyScreenshot()
			{
				if(!screenshot)
					return this();

				videoUtil.extractFrame(dosArgs.recordVideoFilePath, screenshot.filePath, "" + screenshot.loc, this);
			},
			function teardown()
			{
				dos.teardown(this);
			},
			function cleanup()
			{
				if(screenshot)
					fileUtil.unlink(dosArgs.recordVideoFilePath, this.parallel());
				fileUtil.unlink(quickOpTmpDirPath, this.parallel());
			},
			cb
		);
	}
}

exports.DOS = DOS;
