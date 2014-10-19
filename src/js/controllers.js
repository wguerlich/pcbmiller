function MainCtrl($scope, $http) {

}


function DashboardCtrl($scope, $rootScope, grbl)
{

    $scope.devices = []
    $scope.tty_path = ""
    $scope.grbl = grbl
    $scope.stepsize = 0.1
    $scope.autolevel = false

    $scope.refreshDevices = function(open)
    {
        if (!open)
            return
        chrome.serial.getDevices(function(devices)
        {
            $scope.devices = devices
            $scope.$apply()
        })
    }

    $scope.openDevice = function(tty_path)
    {
        grbl.connect(tty_path)

    }

    $scope.cmdln = function(gcode)
    {
        gcode = gcode.replace("%", "" + $scope.stepsize)
        grbl.sendCmd(gcode)
    }

    $scope.cmd = function(gcode)
    {

        grbl.writeSerial(gcode)
    }

    $scope.reset = function(gcode)
    {

        grbl.reset()
    }

    $scope.loadFileContent = function(txt) {
        $rootScope.commands = txt;
    };

    $scope.runCommands = function()
    {
        var cmds
        if ($scope.autolevel)
        {
            var gcm = new GCMachine();
            gcm.autoleveller = $rootScope.autoleveller
            gcm.parse($rootScope.commands)
            cmds = gcm.lines
        }
        else
        {
            cmds = $rootScope.commands.split("\n")
        }
        for (var i = 0; i < cmds.length; i++)
        {
            var cmd = cmds[i].trim()
            if (cmd.length > 0)
                grbl.sendCmd(cmd)
        }
        $rootScope.commands = ""
    }
}


function ProbingCtrl($scope, grbl, $rootScope)
{
    var gcm = new GCMachine();
    gcm.parse($rootScope.commands)

    $scope.width = Math.floor(gcm.maxval.X + 0.999)
    $scope.height = Math.floor(gcm.maxval.Y + 0.999)
    $scope.grid = 5

    $scope.runProbing = function()
    {
        var al = new AutoLeveller()
        $rootScope.autoleveller = al
        al.grbl = grbl
        al.width = $scope.width
        al.height = $scope.height
        al.grid = $scope.grid
        al.runProbing()
    }
}


function PreviewCtrl($scope, $document, $rootScope) {
    //$rootScope.autoleveller=new AutoLeveller()


    var gcm = new GCMachine();
    var inlines = $rootScope.commands
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


    gcm.handler = function(move, op) {
        //console.log(JSON.stringify(move))

        if (move.pos.Z > 0)
            return
        context.moveTo((move.pos.X - gcm.minval.X) * zoom + xoff, height - (move.pos.Y - gcm.minval.Y) * zoom - yoff)
        context.lineTo((move.targetpos.X - gcm.minval.X) * zoom + xoff, height - (move.targetpos.Y - gcm.minval.Y) * zoom - yoff)
        context.stroke()
    }
    var al = $rootScope.autoleveller
    gcm.autoleveller = al
    gcm.reset()
    gcm.parse(inlines)
    $scope.gcode = gcm.lines.join("\n")



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