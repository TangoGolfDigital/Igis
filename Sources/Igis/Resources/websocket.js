var webSocketPath = window.location.pathname.substr(0, window.location.pathname.lastIndexOf("/")) + "/websocket"
var webSocketURL = "ws://" + window.location.hostname +  webSocketPath
var webSocket;
var isConnected;

var canvas;
var context;
var divStatistics;

var gradientDictionary;

var statisticsInitialTime;
var statisticsEnqueuedFrameCount;
var statisticsEmptyFrameCount;
var statisticsFramesRenderedCount;

var frameQueue;

function onLoad() {
    // Log
    divStatistics = document.getElementById("divStatistics");

    // Statistics
    statisticsInitialTime = performance.now();
    statisticsEnqueuedFrameCount = 0;
    statisticsFramesRenderedCount = 0;
    statisticsEmptyFrameCount = 0;
    statisticsMaxFrameQueueCount = 0;
    
    // Canvas
    canvas = document.getElementById("canvasMain");
    let canvasContainerRect = canvas.parentElement.getBoundingClientRect();
    canvas.setAttribute("width", canvasContainerRect.width);
    canvas.setAttribute("height", canvasContainerRect.height);
    context = canvas.getContext("2d");

    // Object dictionaries
    gradientDictionary = {};

    // Register events
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onWindowResize);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mousemove", onMouseMove);

    // Frame Queue
    frameQueue = [];

    // Connection
    isConnected = false;
    webSocket = establishConnection();
}

function logMessage(message) {
    console.log(message);
}

function logError(message) {
    console.error(message);
}

function logStatistics(message) {
    divStatistics.innerHTML = message;
}

function establishConnection() {
    let wsconnection = new WebSocket(webSocketURL);
    wsconnection.onopen = function (event) {onOpen(event)};
    wsconnection.onclose = function (event) {onClose(event)};
    wsconnection.onmessage = function (event) {onMessage(event)};
    wsconnection.onerror = function (event) {onError(event)};
    return wsconnection;
}

// Web Socket
function onOpen(event) {
    isConnected = true;
    logMessage("CONNECTED");
    
    // Notify sizes
    notifyWindowSize(window.innerWidth, window.innerHeight);
    notifyCanvasSize(canvas.getAttribute("width"), canvas.getAttribute("height"));

    // Request update frame event
    window.requestAnimationFrame(onUpdateFrame);
}

function onUpdateFrame(timestamp) {
    // Update statistics
    statisticsFramesRenderedCount += 1;

    // Process frame if available
    if (frameQueue.length > 0) {
	statisticsMaxFrameQueueCount = Math.max(statisticsMaxFrameQueueCount, frameQueue.length);
	frame = frameQueue.shift();
	processCommands(frame);
    } else {
	statisticsEmptyFrameCount += 1;
    }

    // Display statistics
    elapsedMilliseconds = performance.now() - statisticsInitialTime;
    renderedFramesPerSecond = statisticsFramesRenderedCount / elapsedMilliseconds * 1000;
    enqueuedFramesPerSecond = statisticsEnqueuedFrameCount / elapsedMilliseconds * 1000;
    emptyFramesPerSecond = statisticsEmptyFrameCount / elapsedMilliseconds * 1000;
    logStatistics("Rendered FPS: " + renderedFramesPerSecond.toFixed(2) +
		  " Enqueued FPS: " + enqueuedFramesPerSecond.toFixed(2) +
		  " Empty FPS: " + emptyFramesPerSecond.toFixed(2) +
		  " Max Frame Queue: " + statisticsMaxFrameQueueCount);

    // Request next update frame event if still connected
    if (isConnected) {
	window.requestAnimationFrame(onUpdateFrame)
    }
}

function onClose(event) {
    isConnected = false;
    logMessage("DISCONNECTED. Code: " + event.code + " Reason: " + event.reason);
}

function onMessage(event) {
    enqueueFrame(event.data);
}

function onError(event) {
    logError(event.data);
}

function doSend(message) {
    webSocket.send(message);
}

// Images
function onImageLoaded(event) {
    let id = event.target.id;
    let message = "onImageLoaded|" + id;
    doSend(message);
}

function onImageError(event) {
    let id = event.target.id;
    let message = "onImageError|" + id;
    doSend(message);
}

function createImage(id, sourceURL) {
    let divImages = document.getElementById("divImages");
    let img = document.createElement("img");
    img.id = id;
    img.src = sourceURL;
    img.style.display = "none";
    img.addEventListener("load", onImageLoaded);
    img.addEventListener("error", onImageError);
    divImages.appendChild(img);

    let message = "onImageProcessed|" + id;
    doSend(message);
}

// Audio
function onAudioLoaded(event) {
    let id = event.target.id;
    let message = "onAudioLoaded|" + id;
    doSend(message);
}

function onAudioError(event) {
    let id = event.target.id;
    let message = "onAudioError|" + id;
    doSend(message);
}

function createAudio(id, sourceURL, shouldLoop) {
    let divAudios = document.getElementById("divAudios");
    let audio = document.createElement("audio");
    audio.id = id;
    audio.src = sourceURL;
    if (shouldLoop === "true") {
	audio.setAttribute("loop", "");
    }
    audio.addEventListener("canplay", onAudioLoaded);
    audio.addEventListener("error", onAudioError);
    divAudios.appendChild(audio);

    let message = "onAudioProcessed|" + id;
    doSend(message);
}

// Canvas
function onClick(event) {
    let message = "onClick|" + event.clientX + "|" + event.clientY;
    doSend(message);
}

function onMouseDown(event) {
    let message = "onMouseDown|" + event.clientX + "|" + event.clientY;
    doSend(message);
}

function onMouseUp(event) {
    let message = "onMouseUp|" + event.clientX + "|" + event.clientY;
    doSend(message);
}

function onMouseMove(event) {
    let message = "onMouseMove|" + event.clientX + "|" + event.clientY;
    doSend(message);
}

function onKeyDown(event) {
    let key      = event.key
    let code     = event.code
    let ctrlKey  = event.ctrlKey
    let shiftKey = event.shiftKey
    let altKey   = event.altKey
    let metaKey  = event.metaKey

    let message = "onKeyDown|"   + key + "|" + code + "|" + ctrlKey + "|" + shiftKey + "|" + altKey + "|" + metaKey;
    doSend(message);

    switch (code) {
    case "F1":
	toggleDebugDisplayMode();
	break;
    case "F2":
	toggleDebugCollectMode();
	break;
    }

}

function onWindowResize(event) {
    let width = event.target.innerWidth;
    let height = event.target.innerHeight;
    notifyWindowSize(width, height);
}

function notifyCanvasSize(width, height) {
    let message = "onCanvasResize|" + width + "|" + height;
    doSend(message);
}

function notifyWindowSize(width, height) {
    let message = "onWindowResize|" + width + "|" + height;
    doSend(message);
}

function enqueueFrame(commandMessages) {
    frameQueue.push(commandMessages);
    
    // Statistics
    statisticsEnqueuedFrameCount += 1;
}

function processCommands(commandMessages) {
    commandMessages.split("||").forEach(processCommand)
}

function processCommand(commandMessage, commandIndex) {
    let commandAndArguments = commandMessage.split("|");
    if (commandAndArguments.length < 1) {
	logError("processCommand: Unable to process empty commandAndArguments list");
	return;
    }
    let command = commandAndArguments.shift();
    let arguments = commandAndArguments;
    
    switch (command) {
    case "ping":
	break;

    case "arc":
	processArc(arguments);
	break;
    case "arcTo":
	processArcTo(arguments);
	break;
    case "beginPath":
	processBeginPath(arguments);
	break;
    case "bezierCurveTo":
	processBezierCurveTo(arguments);
	break;
    case "canvasSetSize":
	processCanvasSetSize(arguments);
	break;
    case "closePath":
	processClosePath(arguments);
	break;
    case "clearRect":
	processClearRect(arguments);
	break;
    case "clip":
	processClip(arguments);
	break;
    case "createAudio":
	processCreateAudio(arguments);
	break;
    case "createImage":
	processCreateImage(arguments);
	break;
    case "createLinearGradient":
	processCreateLinearGradient(arguments);
	break;
    case "createRadialGradient":
	processCreateRadialGradient(arguments);
	break;
    case "drawImage":
	processDrawImage(arguments);
	break;
    case "ellipse":
	processEllipse(arguments);
	break;
    case "fill":
	processFill(arguments);
	break;
    case "fillRect":
	processFillRect(arguments);
	break;
    case "fillStyleSolidColor":
	processFillStyleSolidColor(arguments);
	break;
    case "fillStyleGradient":
	processFillStyleGradient(arguments);
	break;
    case "fillText":
	processFillText(arguments);
	break;
    case "font":
	processFont(arguments);
	break;
    case "globalAlpha":
	processGlobalAlpha(arguments);
	break;
    case "lineTo":
	processLineTo(arguments);
	break;
    case "lineWidth":
	processLineWidth(arguments);
	break;
    case "moveTo":
	processMoveTo(arguments);
	break;
    case "quadraticCurveTo":
	processQuadraticCurveTo(arguments);
	break;
    case "restore":
	processRestore(arguments);
	break;
    case "save":
	processSave(arguments);
	break;
    case "setAudioMode":
	processSetAudioMode(arguments);
	break;
    case "setTransform":
	processSetTransform(arguments);
	break;
    case "stroke":
	processStroke(arguments);
	break;
    case "strokeStyleSolidColor":
	processStrokeStyleSolidColor(arguments);
	break;
    case "strokeStyleGradient":
	processStrokeStyleGradient(arguments);
	break;
    case "strokeRect":
	processStrokeRect(arguments);
	break;
    case "strokeText":
	processStrokeText(arguments);
	break;
    case "transform":
	processTransform(arguments);
	break;
    default:
	logError("Unknown command: " + command);
    }
}

function processArc(arguments) {
    if (arguments.length != 6) {
	logError("processArc: Requires six arguments");
	return;
    }
    let centerX = arguments.shift();
    let centerY = arguments.shift();
    let radius  = arguments.shift();
    let startAngle = Number(arguments.shift());
    let endAngle   = Number(arguments.shift());
    let antiClockwise = arguments.shift() === "true";
    context.arc(centerX, centerY, radius, startAngle, endAngle, antiClockwise);
}

function processArcTo(arguments) {
    if (arguments.length != 5) {
	logError("processArcTo: Requires five arguments");
	return;
    }
    let controlPoint1x = arguments.shift();
    let controlPoint1y = arguments.shift();
    let controlPoint2x = arguments.shift();
    let controlPoint2y = arguments.shift();
    let radius = arguments.shift();
    context.arcTo(controlPoint1x, controlPoint1y, controlPoint2x, controlPoint2y, radius);
}

function processBeginPath(arguments) {
    if (arguments.length != 0) {
	logError("processBeginPath: Requires zero arguments");
	return;
    }
    context.beginPath();
}

function processBezierCurveTo(arguments) {
    if (arguments.length != 6) {
	logError("processBezierCurveTo: Requires six arguments");
	return;
    }
    let controlPoint1x = arguments.shift();
    let controlPoint1y = arguments.shift();
    let controlPoint2x = arguments.shift();
    let controlPoint2y = arguments.shift();
    let endPointX = arguments.shift();
    let endPointY = arguments.shift();
    context.bezierCurveTo(controlPoint1x, controlPoint1y, controlPoint2x, controlPoint2y, endPointX, endPointY);
		    
}

function processCanvasSetSize(arguments) {
    if  (arguments.length != 2) {
	logError("processCanvasSetSize: Requires two arguments");
	return;
    }
    let width = arguments.shift();
    let height = arguments.shift();
    canvas.width = width;
    canvas.height = height;
    notifyCanvasSize(width, height);
}

function processClearRect(arguments) {
    if (arguments.length != 4) {
	logError("processClearRect: Requires four arguments");
	return;
    }
    let x = arguments.shift();
    let y = arguments.shift();
    let width = arguments.shift();
    let height = arguments.shift();
    context.clearRect(x, y, width, height);
}

function processClip(arguments) {
    if (arguments.length != 1) {
	logError("processClip: Requires one argment");
	return;
    }
    let windingRule = arguments.shift();
    context.clip(windingRule);
}

function processClosePath(arguments) {
    if (arguments.length != 0) {
	logError("processClosePath: Requires zero arguments");
	return;
    }
    context.closePath();
}

function processCreateAudio(arguments) {
    if (arguments.length != 3) {
	logError("processCreateAudio: Requires three arguments");
	return;
    }
    let id = arguments.shift();
    let sourceURL = arguments.shift();
    let shouldLoop = arguments.shift();
    createAudio(id, sourceURL, shouldLoop);
}

function processCreateLinearGradient(arguments) {
    if (arguments.length < 6) {
	logError("processCreateLinearGradient: Requires at least six arguments");
	return;
    }
    let id = arguments.shift();
    let startX = Number(arguments.shift());
    let startY = Number(arguments.shift());
    let endX = Number(arguments.shift());
    let endY = Number(arguments.shift());
    let colorStopCount = arguments.shift();

    if (arguments.length < colorStopCount * 2) {
	logError("processCreateLinearGradient: colorStopCount specified is greater than arguments available");
	return;
    }

    var linearGradient = context.createLinearGradient(startX, startY, endX, endY);
    for (var colorStopIndex = 0; colorStopIndex < colorStopCount; colorStopIndex++) {
	let position = Number(arguments.shift());
	let solidColor = arguments.shift();
	linearGradient.addColorStop(position, solidColor);
    }

    gradientDictionary[id] = linearGradient;

    let messageProcessed = "onLinearGradientProcessed|" + id;
    doSend(messageProcessed);
    let messageLoaded = "onLinearGradientLoaded|" + id;
    doSend(messageLoaded);
}

function processCreateRadialGradient(arguments) {
    if (arguments.length < 8) {
	logError("processCreateRadialGradient: Requires at least eight arguments");
	return;
    }

    let id = arguments.shift();
    let center1x = Number(arguments.shift());
    let center1y = Number(arguments.shift());
    let radius1 = Number(arguments.shift());
    let center2x = Number(arguments.shift());
    let center2y = Number(arguments.shift());
    let radius2 = Number(arguments.shift());
    let colorStopCount = arguments.shift();

    if (arguments.length < colorStopCount * 2) {
	logError("processCreateLinearGradient: colorStopCount specified is greater than arguments available");
	return;
    }

    var radialGradient = context.createRadialGradient(center1x, center1y, radius1, center2x, center2y, radius2);
    for (var colorStopIndex = 0; colorStopIndex < colorStopCount; colorStopIndex++) {
	let position = Number(arguments.shift());
	let solidColor = arguments.shift();
	radialGradient.addColorStop(position, solidColor);
    }

    gradientDictionary[id] = radialGradient;

    let messageProcessed = "onRadialGradientProcessed|" + id;
    doSend(messageProcessed);
    let messageLoaded = "onRadialGradientLoaded|" + id;
    doSend(messageLoaded);
    

}

function processCreateImage(arguments) {
    if (arguments.length != 2) {
	logError("processCreateImage: Requires two arguments");
	return;
    }
    let id = arguments.shift();
    let sourceURL = arguments.shift();
    createImage(id, sourceURL);
}

function processSetAudioMode(arguments) {
    if (arguments.length != 2) {
	logError("processSetAudioMode: Requires two arguments");
    }

    let id = arguments.shift();
    let mode = arguments.shift();

    let audio = document.getElementById(id);

    if (mode == "play") {
	audio.play().then(function() {

	}).catch(function(error) {
	    var enablePlayButton = document.getElementById("enablePlayButton");
	    enablePlayButton.style = "display:block;";

	    var callback = function() {
		audio.play();
		enablePlayButton.removeEventListener('click', callback);
		enablePlayButton.style = "display:none;";
	    };

 	    enablePlayButton.addEventListener('click', callback);
	});
    } else if (mode == "pause") {
	audio.pause();
    }
    
}

function processDrawImage(arguments) {
    if (arguments.length != 3 && arguments.length != 5 && arguments.length != 9) {
	logError("processDrawImage: Requires three, five, or nine arguments");
	return;
    }

    let id = arguments.shift();
    let img = document.getElementById(id);
    
    if (arguments.length == 2) {
	let dx = arguments.shift();
	let dy = arguments.shift();
	context.drawImage(img, dx, dy);
    } else if (arguments.length == 4) {
	let dx = arguments.shift();
	let dy = arguments.shift();
	let dWidth = arguments.shift();
	let dHeight = arguments.shift();
	context.drawImage(img, dx, dy, dWidth, dHeight);
    } else if (arguments.length == 8) {
	let sx = arguments.shift();
	let sy = arguments.shift();
	let sWidth = arguments.shift();
	let sHeight = arguments.shift();
	let dx = arguments.shift();
	let dy = arguments.shift();
	let dWidth = arguments.shift();
	let dHeight = arguments.shift();
	context.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    }
}

function processEllipse(arguments) {
    if (arguments.length != 8) {
	logError("processEllipse: Requires eight arguments");
	return;
    }
    let x = arguments.shift();
    let y = arguments.shift();
    let radiusX = arguments.shift();
    let radiusY = arguments.shift();
    let rotation = Number(arguments.shift());
    let startAngle = Number(arguments.shift());
    let endAngle = Number(arguments.shift());
    let antiClockwise = arguments.shift() === "true";
    context.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, antiClockwise);
}

function processFill(arguments) {
    if (arguments.length != 0) {
	logError("processFill: Requires zero arguments");
	return;
    }
    context.fill();
}

function processFillRect(arguments) {
    if (arguments.length != 4) {
	logError("processFillRect: Requires four arguments");
	return;
    }
    let x = arguments.shift();
    let y = arguments.shift();
    let width = arguments.shift();
    let height = arguments.shift();
    context.fillRect(x, y, width, height);
}

function processFillStyleSolidColor(arguments) {
    if (arguments.length != 1) {
	logError("procesFillStyleSolidColor: Requires one argument");
	return;
    }
    let solidColor = arguments.shift();
    context.fillStyle = solidColor;
}

function processFillStyleGradient(arguments) {
    if (arguments.length != 1) {
	logError("procesFillStyleGradient: Requires one argument");
	return;
    }
    let gradientId = arguments.shift();
    let gradient = gradientDictionary[gradientId];
    context.fillStyle = gradient;
}

function processFillText(arguments) {
    if (arguments.length != 3) {
	logError("processFillText: Requires three arguments");
	return;
    }
    let text = arguments.shift();
    let x = arguments.shift();
    let y = arguments.shift();
    context.fillText(text, x, y);
}

function processFont(arguments) {
    if (arguments.length != 1) {
	logError("processFont: Requires one argument");
	return;
    }
    let font = arguments.shift();
    context.font = font;
}

function processGlobalAlpha(arguments) {
    if (arguments.length != 1) {
	logError("processGlobalAlpha: Requires one argument");
	return;
    }
    let alphaValue = Number(arguments.shift());
    context.globalAlpha = alphaValue;
}

function processLineWidth(arguments) {
    if (arguments.length != 1) {
	logError("processLineWidth: Requires one argument");
	return;
    }
    let width = arguments.shift();
    context.lineWidth = width;
}

function processLineTo(arguments) {
    if (arguments.length != 2) {
	logError("processLineTo: Requires two arguments");
	return;
    }
    let x = arguments.shift();
    let y = arguments.shift();
    context.lineTo(x, y)
}

function processMoveTo(arguments) {
    if (arguments.length != 2) {
	logError("processMoveTo: Requires two arguments");
	return;
    }
    let x = arguments.shift();
    let y = arguments.shift();
    context.moveTo(x, y)
}

function processQuadraticCurveTo(arguments) {
    if (arguments.length != 4) {
	logError("processQuadraticCurveTo: Requires four arguments");
	return;
    }
    let controlPointX = arguments.shift();
    let controlPointY = arguments.shift();
    let endPointX = arguments.shift();
    let endPointY = arguments.shift();
    context.quadraticCurveTo(controlPointX, controlPointY, endPointX, endPointY);
}

function processRestore(arguments) {
    if (arguments.length != 0) {
	logError("processRestore: Requires zero arguments");
	return;
    }
    context.restore();
}

function processSave(arguments) {
    if (arguments.length != 0) {
	logError("processSave: Requires zero arguments");
	return;
    }
    context.save();
}

function processSetTransform(arguments) {
    if (arguments.length != 6) {
	logError("processSetTransform: Requires six arguments");
	return;
    }
    let a = Number(arguments.shift());
    let b = Number(arguments.shift());
    let c = Number(arguments.shift());
    let d = Number(arguments.shift());
    let e = Number(arguments.shift());
    let f = Number(arguments.shift());
    context.setTransform(a, b, c, d, e, f);
}

function processStroke(arguments) {
    if (arguments.length != 0) {
	logError("processStroke: Requires zero arguments");
	return;
    }
    context.stroke();
}

function processStrokeRect(arguments) {
    if (arguments.length != 4) {
	logError("processStrokeRect: Requires four arguments");
	return;
    }
    let x = arguments.shift();
    let y = arguments.shift();
    let width = arguments.shift();
    let height = arguments.shift();
    context.strokeRect(x, y, width, height);
}

function processStrokeStyleSolidColor(arguments) {
    if (arguments.length != 1) {
	logError("procesStrokeStyle: Requires one argument");
	return;
    }
    let solidColor = arguments.shift();
    context.strokeStyle = solidColor;
}

function processStrokeStyleGradient(arguments) {
    if (arguments.length != 1) {
	logError("procesStrokeStyleGradient: Requires one argument");
	return;
    }
    let gradientId = arguments.shift();
    let gradient = gradientDictionary[gradientId];
    context.strokeStyle = gradient;
}

function processStrokeText(arguments) {
    if (arguments.length != 3) {
	logError("processStrokeText: Requires three arguments");
	return;
    }
    let text = arguments.shift();
    let x = arguments.shift();
    let y = arguments.shift();
    context.strokeText(text, x, y);
}

function processTransform(arguments) {
    if (arguments.length != 6) {
	logError("processTransform: Requires six arguments");
	return;
    }
    let a = Number(arguments.shift());
    let b = Number(arguments.shift());
    let c = Number(arguments.shift());
    let d = Number(arguments.shift());
    let e = Number(arguments.shift());
    let f = Number(arguments.shift());
    context.transform(a, b, c, d, e, f);
}

document.addEventListener("DOMContentLoaded", onLoad);
