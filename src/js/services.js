angular.module('main').factory('grbl', function($rootScope) {
    var service = {};
    var n = 0;
    var inBuf = ""
    var logLines = []
    var connectionId = -1

    var options = {
        "bitrate": 115200,
        "ctsFlowControl": false,
        "dataBits": "eight",
        "parityBit": "no",
        "stopBits": "one"
    };


    //we expect ASCII-7 rather than UTF-8
    var bytesToString = function(arrbuf) {
        return String.fromCharCode.apply(null, new Uint8Array(arrbuf));
    };

    //we expect ASCII-7 rather than UTF-8
    var stringToBytes = function(s) {
        var arrbuf = new ArrayBuffer(s.length);
        var arrbufView = new Uint8Array(arrbuf);
        for (var i = 0; i < s.length; i++) {
            arrbufView[i] = s.charCodeAt(i) & 0xff;
        }
        return arrbuf;
    }

    var consoleLog = function(s)
    {
        logLines.push(s)
        while (logLines.length > 1000)
            logLines.shift()
    }

    var connect = function(tty_path)
    {
        chrome.serial.connect(tty_path, options, function(info) {
            console.log("serial connection obtained:\n" + JSON.stringify(info));
            connectionId = info.connectionId
        })
    }

    var onSend = function(info)
    {
        console.log("sent:\n" + JSON.stringify(info));
    }

    var writeSerial = function(str) {
        chrome.serial.send(connectionId, stringToBytes(str), onSend);
    }

    var lineBuf = []
    var bufferLines = []

    var writeLineSerial = function(str)
    {
        str += "\n"
        lineBuf.push(str)
        sendBufferIfSpace()
    }

    var sendBufferIfSpace = function()
    {
        while (true)
        {
            if (lineBuf.length == 0)
                return
            if(bufferLines.length>0) return
            var space = 127
            for (var i = 0; i < bufferLines.length; i++)
            {
                space -= bufferLines[i].length
            }
            console.log("space: " + space + " ql: " + bufferLines.length + " want: " + lineBuf[0].length)
            if (space >= lineBuf[0].length)
            {
                var line = lineBuf.shift()
                writeSerial(line)
                bufferLines.push(line)
            }
            else
            {
                return
            }
        }
    }

    var handleInLine = function(s)
    {
        consoleLog("< " + s)
        console.log("line: " + s);
        if (s.substring(0, 2) == "ok" || s.substring(0, 5) == "error")
        {
            var cmd = bufferLines.shift();
            consoleLog("* " + cmd + " : " + s)
            sendBufferIfSpace()
        }

    }

    chrome.serial.onReceive.addListener(function(info) {
        $rootScope.$apply(function() {
            console.log("received: (" + (n++) + ")\n" + JSON.stringify(info) + "\n" + bytesToString(info.data));
            inBuf += bytesToString(info.data);
            var pos = 0;
            while ((pos = inBuf.indexOf("\n")) >= 0)
            {
                var line = inBuf.substring(0, pos)
                inBuf = inBuf.substring(pos + 1)
                handleInLine(line)
            }
        })
    })

    var sendCmd = function(s)
    {
        writeLineSerial(s)
        consoleLog("> " + s)
    }

    var queueLen = function()
    {
        return bufferLines.length
    }

    service.sendCmd = sendCmd
    service.logLines = logLines
    service.connect = connect
    service.queueLen = queueLen

    return service;
});