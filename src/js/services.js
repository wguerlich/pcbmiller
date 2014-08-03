angular.module('main').factory('grbl', function($rootScope, $interval) {
    var service = {X:0,Y:0,Z:0};
    var n = 0;
    var inBuf = ""
    var logLines = []
    var connectionId = -1
    var xxx = 0
    var statuscallbacks=[]

    var options = {
        "bitrate": 115200,
        "ctsFlowControl": false,
        "dataBits": "eight",
        "parityBit": "no",
        "stopBits": "one"
    };
    $interval(function() {
        if (connectionId >= 0)
        {
            writeSerial("?")
        }
    }, 200);
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
        logLines.push((xxx++) + " " + s)
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
        if (info.error)
        {
            closeConnection();
        }
    }

    var writeSerial = function(str) {
        chrome.serial.send(connectionId, stringToBytes(str), onSend);
    }

    var closeConnection = function()
    {
        chrome.serial.disconnect(connectionId)
        connectionId = -1
    }



    var lineBuf = []
    var bufferLines = []

    var writeLineSerial = function(str, callback)
    {
        str += "\n"
        lineBuf.push({block: str, callback: callback})
        sendBufferIfSpace()
    }

    var sendBufferIfSpace = function()
    {
        while (true)
        {
            if (lineBuf.length == 0)
                return
            if (bufferLines.length > 0)
                return //for now, we need to send lines one by one
            var space = 127
            for (var i = 0; i < bufferLines.length; i++)
            {
                space -= bufferLines[i].block.length
            }
            console.log("space: " + space + " ql: " + bufferLines.length + " want: " + lineBuf[0].length)
            if (space >= lineBuf[0].block.length)
            {
                var line = lineBuf.shift()
                writeSerial(line.block)
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

        if (s.substring(0, 1) == "<")
        {
            s = s.substring(1, s.length - 2)
            var f = s.split(",")
            service.status = f[0]
            for (var i = 0; i < 3; i++)
            {
                var x = f[i + 4]
                x = x.substring(x.indexOf(":") + 1)
                service["XYZ".charAt(i)] = parseFloat(x)
            }
            for(var i=0;i<statuscallbacks.length;i++)
            {
                var cb=statuscallbacks[i]
                cb();
            }
            statuscallbacks=[]
        }
        else
        {
            consoleLog("< " + s)
            console.log("line: " + s);
        }
        if (s.substring(0, 2) == "ok" || s.substring(0, 5) == "error")
        {
            var cmd = bufferLines.shift();
            if (cmd.callback)
                cmd.callback(s)
            consoleLog("* " + cmd.block + " : " + s)
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

    var sendCmd = function(s, callback)
    {
        writeLineSerial(s, callback)
        consoleLog("> " + s)
    }

    var queueLen = function()
    {
        return bufferLines.length + lineBuf.length
    }

    var reset = function() {

        lineBuf = []
        bufferLines = []
        statuscallbacks=[]
        writeSerial(String.fromCharCode(24))
    }

   var queryStatus=function(callback)
   {
       statuscallbacks.push(callback)
       writeSerial("?")
   }



    service.sendCmd = sendCmd
    service.writeSerial = writeSerial
    service.logLines = logLines
    service.connect = connect
    service.queueLen = queueLen
    service.reset = reset
    service.queryStatus=queryStatus
    service.log=consoleLog
    
    return service;
});