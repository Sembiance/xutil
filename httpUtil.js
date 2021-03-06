"use strict";
const XU = require("@sembiance/xu"),
	fs = require("fs"),
	path = require("path"),
	fileUtil = require("./fileUtil.js"),
	http = require("http"),
	https = require("https"),
	progressStream = require("progress-stream"),
	hashUtil = require("./hashUtil.js"),
	querystring = require("querystring"),
	streamBuffers = require("stream-buffers");

// Default headers used for all requests
function getHeaders(extraHeaders)
{
	const headers =
	{
		"Accept"          : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Accept-Charset"  : "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
		"Accept-Language" : "en-US,en;q=0.8,fil;q=0.6",
		"Cache-Control"   : "no-cache",
		"Pragma"          : "no-cache",
		"User-Agent"      : "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2192.0 Safari/537.36"
	};

	return Object.assign(headers, extraHeaders || {});
}

/*
	Global options for all httpUtil.* methods:
 username & password		Specific a username and password for Basic authorization
     headers : {}		Allows you to manually include HTTP headers in the request
 contentType : ""		Specify what content-type of data is being sent. Not usually directly set by the you.
     timeout : ###		How many ms to allow the request to take before cancelling the request
ignoreErrors : false	Set to true to ignore any errors that take place
 progressBar : .		An NPM progress or multi-progress bar that should be tick updated was bytes come in
       retry : ###		How many times to retry the request if it fails
*/

// Will download the given targetURL to the given destinationPath. cb(err, headers, statusCode)
// resume : false		If set to true, and the destinationPath exists, it will attempt to 'resume' downloading using the HTTP "Range" header
exports.download = function download(targetURL, destinationPath, _options, _cb)
{
	const {options, cb} = XU.optionscb(_options, _cb, {method : "GET", downloadTo : destinationPath});
	return httpExecute(targetURL, options, cb);
};

// Will just do an HTTP HEAD. cb(err, headers, statusCode)
exports.head = function head(targetURL, _options, _cb)
{
	const {options, cb} = XU.optionscb(_options, _cb, {method : "HEAD"});
	return httpExecute(targetURL, options, cb);
};

// Will perform an HTTP GET. Special options:
// cacheBase : ""		A path to a directory that will include a cache of any httpUtil.get() requests made.
//   verbose : false	Specify true to have it output a log message on cache misses
exports.get = function get(targetURL, _options, _cb)
{
	let {options, cb} = XU.optionscb(_options, _cb, {method : "GET"});	// eslint-disable-line prefer-const

	let cachePath = "";
	if(_options.cacheBase)
	{
		["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"].forEach(v => fs.mkdirSync(path.join(_options.cacheBase, v), {recursive : true}));

		const hash = hashUtil.hash("sha256", targetURL);
		cachePath = path.join(_options.cacheBase, hash.charAt(0), hash);
		if(fileUtil.existsSync(cachePath))
			return fs.readFile(cachePath, XU.UTF8, cb);
	}

	if(cachePath)
	{
		if(options.verbose)
			console.log("Cache miss: %s vs %s", targetURL, cachePath);

		cb = function(err, data, headers, statusCode)
		{
			if(err || !data)
				return _cb(err, data, headers, statusCode);

			fs.writeFile(cachePath, data, XU.UTF8, fileErr => _cb(fileErr, data, headers, statusCode));
		};
	}

	return httpExecute(targetURL, options, cb);
};

// Will perform an HTTP POST of the given "postData". Special options:
// postAsBinary : false		Will treat the postData as binary content of contentType application/octet-stream
//   postAsJSON : false		Will tret the postData as a JSON object and will JSON.stringify() and set contentType application/json
// If NEITHER of the above are set, then postData should be an Object and it will be querystring.stringify()'ed as FORM data and sent as application/x-www-form-urlencoded
exports.post = function post(targetURL, postData, _options, _cb)
{
	const {options, cb} = XU.optionscb(_options, _cb, {method : "POST"});
	if(options.postAsBinary)
	{
		options.contentType = "application/octet-stream";
		options.postData = postData;
	}
	else
	{
		options.postData = options.postAsJSON ? JSON.stringify(postData) : querystring.stringify(postData);
		if(options.postAsJSON)
			options.contentType = "application/json";
	}

	return httpExecute(targetURL, options, cb || _options);
};

// Will perform an HTTP PUT. If the putData is a string, it will be sent as-is with text/plain. If it's a Buffer, it will be converted to a utf8 string.
// Otherwise if an object/array it will be stringify'ed
exports.put = function put(targetURL, putData, _options, _cb)
{
	const {options, cb} = XU.optionscb(_options, _cb, {
		method      : "PUT",
		contentType : (typeof putData==="string" || putData instanceof Buffer) ? "text/plain" : "application/json",
		postData    : typeof putData==="string" ? putData : (putData instanceof Buffer ? putData.toString("utf8") : JSON.stringify(putData))});

	return httpExecute(targetURL, options, cb || _options);
};

// The actual handler of all the above
function httpExecute(targetURL, options, cb)
{
	const uo = new URL(targetURL);

	const requestOptions =
	{
		hostname : uo.hostname,
		port     : uo.port || (uo.protocol.startsWith("https") ? 443 : 80),
		method   : options.method,
		path     : decodeURIComponent(uo.pathname).split("/").map(s => (!s || !s.length ? "" : encodeURI(s))).join("/") + (uo.search ? uo.search : ""),
		headers  : getHeaders(options.headers)
	};

	if(uo.protocol.startsWith("https"))
		requestOptions.rejectUnauthorized = false;

	requestOptions.headers.Host = requestOptions.hostname;

	if(options.method==="HEAD")
		requestOptions.agent = false;

	if(options.username && options.password)
		requestOptions.headers.Authorization = `Basic ${Buffer.from(`${options.username}:${options.password}`).toString("base64")}`;

	if(options.postData)
	{
		requestOptions.headers["Content-Type"] = options.contentType || "application/x-www-form-urlencoded";
		requestOptions.headers["Content-Length"] = Buffer.byteLength(options.postData, "utf8");
	}

	let httpRequest = null;
	let timeoutid = options.timeout ? setTimeout(() => { timeoutid = undefined; httpRequest.abort(); }, options.timeout) : undefined;
	const httpClearTimeout = function() { if(timeoutid!==undefined) { clearTimeout(timeoutid); timeoutid = undefined; } };
	const responseData = options.method!=="HEAD" ? new streamBuffers.WritableStreamBuffer() : undefined;
	const outputFileOptions = {};
	if(options.downloadTo && options.resume && fileUtil.existsSync(options.downloadTo))
	{
		outputFileOptions.flags = "a";
		requestOptions.headers.Range = `bytes=${fs.statSync(options.downloadTo).size}-`;
	}
	const outputFile = options.downloadTo ? fs.createWriteStream(options.downloadTo, outputFileOptions) : undefined;

	const httpResponse = function httpResponse(response)
	{
		//console.log(response.statusCode, response.complete, response.headers, response.method, response.statusMessage, response.url);

		// DO: Add support for 302 redirect
		if(response.statusCode===301 || response.statusCode===302)
		{
			httpClearTimeout();

			if(options.downloadTo)
				outputFile.close();

			return httpExecute((response.headers.location.startsWith("http") ? "" : (`http${(targetURL.startsWith("https") ? "s" : "")}://${uo.host}`)) + response.headers.location, options, cb);
		}

		if(options.method==="HEAD")
		{
			setImmediate(() => { httpClearTimeout(); cb(undefined, response.headers, response.statusCode); });
		}
		else if(options.downloadTo)
		{
			if(options.progressBar)
				response.pipe(progressStream({time : 100}, progress => options.progressBar.tick(progress.delta))).pipe(outputFile);
			else
				response.pipe(outputFile);

			outputFile.on("finish", () => { httpClearTimeout(); setImmediate(() => cb(undefined, response.headers, response.statusCode)); });
		}
		else
		{
			const responseFinished = function responseFinished()
			{
				 httpClearTimeout();
				 setImmediate(() => cb(undefined, responseData.getContents(), response.headers, response.statusCode));
			};

			response.on("aborted", responseFinished);
			response.on("end", responseFinished);
			response.on("data", d => responseData.write(d));
		}
	};

	httpRequest = (uo.protocol.startsWith("https") ? https : http).request(requestOptions, httpResponse);

	httpRequest.on("error", err =>
	{
		httpClearTimeout();
		if(outputFile)
		{
			outputFile.end();
			fs.unlinkSync(options.downloadTo);
		}

		if(options.retry && options.retry>=1)
		{
			//console.error("RETRYING %s", targetURL);
			options = XU.clone(options);	// eslint-disable-line no-param-reassign
			options.retry = options.retry-1;
			httpExecute(targetURL, options, cb);
		}
		else
		{
			if(options.ignoreErrors)
				return cb();

			return cb(err);
		}
	});

	if(options.postData)
		httpRequest.write(options.postData, "utf8");
	
	httpRequest.end();
}
