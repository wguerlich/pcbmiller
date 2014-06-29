function MainCtrl($scope, $http) {

}



function HomeCtrl($scope, $document) {
    $scope.process = function() {
        var gcm = new GCMachine();
        var inlines = $scope.gcode

        gcm.parse(inlines)

        var canvas = $document[0].getElementById('board');
        var width = canvas.offsetWidth
        var height = canvas.offsetHeight
        var context = canvas.getContext('2d');
        var gcmwidth = gcm.maxval.X - gcm.minval.X
        var gcmheight = gcm.maxval.Y - gcm.minval.Y
        var xcoeff = width / gcmwidth
        var ycoeff = height / gcmheight
        var zoom = 0.9 * (xcoeff < ycoeff ? xcoeff : ycoeff)

        var xoff = width * 0.05 + (width * 0.9 - zoom * gcmwidth) / 2
        var yoff = height * 0.05 + (height * 0.9 - zoom * gcmheight) / 2


        gcm.handler = function(gcm, op) {
            if (gcm.oldpos.Z > 0)
                return
            context.moveTo((gcm.oldpos.X - gcm.minval.X) * zoom + xoff, height - (gcm.oldpos.Y - gcm.minval.Y) * zoom - yoff)
            context.lineTo((gcm.newpos.X - gcm.minval.X) * zoom + xoff, height - (gcm.newpos.Y - gcm.minval.Y) * zoom - yoff)
            context.stroke()
        }
        gcm.parse(inlines)

    }

}

function ControlsCtrl($scope, grbl)
{

    $scope.commands = ""
    $scope.logLines = grbl.logLines


    $scope.devices = []
    $scope.tty_path = ""
    chrome.serial.getDevices(function(devices)
    {
        $scope.devices = devices
        $scope.$apply()
    })

    $scope.ql = function()
    {
        return grbl.queueLen()
    }


    $scope.open = function() {
        grbl.connect($scope.tty_path)



    }

    $scope.loadFileContent = function(txt) {
        $scope.commands = txt;
    };

    $scope.sendCmd = function()
    {
        var cmds = $scope.commands.split("\n")
        for (var i = 0; i < cmds.length; i++)
        {
            var cmd = cmds[i].trim()
            if (cmd.length > 0)
                grbl.sendCmd(cmd)
        }
        $scope.commands = ""
    }
}


function JogCtrl($scope)
{
    
}