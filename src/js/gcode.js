var GCMachine = function()
{
    this.maxval = {X: -99999, Y: -99999, Z: -99999}
    this.minval = {X: 99999, Y: 99999, Z: 99999}
    this.handler = null;
    this.reset();
}


GCMachine.prototype.reset = function() {

    this.pos = {X: 0, Y: 0, Z: 0}
    this.target = {}
    this.offset = {X: 0, Y: 0, Z: 0}
    this.lines = []
    this.line = ""
    this.inchMode = false
    this.relativeMode = false
    this.moveMode = "G1"
    this.pathShortner = new PathShortener(this);

}

GCMachine.prototype.parse = function(input) {
    //this.out = []
    var lines = input.split("\n")
    for (var i = 0; i < lines.length; i++) {
        this.outline = ""
        var line = lines[i] + ";"
        var numtxt = ""
        var address = ""
        for (var j = 0; j < line.length; j++) {
            var c = line.charAt(j).toUpperCase()
            if ((c >= "A" && c <= "Z") || c == ";" || c == "(" || c == "%") {
                if (address !== "") {
                    this.processCmd(address, parseFloat(numtxt.trim()))
                    address = ""
                    numtxt = ""
                }
                if (c == "(") //Kommentaranfang
                {
                    var cepos = line.indexOf(")", j)
                    if (cepos > 0)
                        j = cepos
                    else
                        j = line.length - 2
                }
                else if (c == ";" || c == "%") //Zeilenende
                {
                    this.applyBlock()
                    break;
                } else {
                    address = c
                }
            } else {
                numtxt += c
            }
        }

    }
    this.pathShortner.cleanOut();
    //this.out.push("min: "+JSON.stringify(this.minval))
    //this.out.push("max: "+JSON.stringify(this.maxval))
    //return this.out
}

GCMachine.prototype.processCmd = function(address, num) {
    //console.log(address + ": " + num)
    if ("XYZIJKR".indexOf(address) >= 0) //alle Positionsangaben 
    {
        num = Math.floor(num * 1000 * (this.inchMode ? 25.4 : 1) + 0.5) / 1000;
        this.target[address] = num
    }
    else
    {
        var cmd = address + num
        switch (cmd)
        {
            case "G20": //inch mode
                this.inchMode = true;
                cmd = "G21" //make it mm
                break;
            case "G21": //inch mode
                this.inchMode = false;
                break;
            case "G91": //relative mode
                this.relativeMode = true;
                cmd = "G90" //output abosulute
                break;
            case "G90": //absolute mode
                this.relativeMode = false;
                break;
            case "G92": //set axis working position, we modify the offset instead
                this.target.g92 = true
                cmd = ""
                break;
            case "G92.1": //reset offset
                this.offset = {X: 0, Y: 0, Z: 0}
                cmd = ""
                break;
            case "G0":
            case "G1":
            case "G2":
            case "G3":
                this.moveMode = cmd;
                break;
        }
        this.line += cmd
    }
}

GCMachine.prototype.applyBlock = function() {


    if (this.target.g92) //change working position
    {
        for (var n in "XYZ")
        {
            var address = "XYZ".charAt(n)
            var num = this.target[address]

            if (typeof num == "number")
            {
                this.offset[address] = this.pos[address] - num
            }
        }
    }
    else
    {
        var move = {pos: {}, targetpos: {}}

        var isSimpleMove = this.moveMode == "G1" && (this.line == "" || this.line == "G1") //simple linear XY feed motion

        for (var n in "XYZIJKR")
        {
            var address = "XYZIJKR".charAt(n)

            if (address >= "X" && address <= "Z")
            {
                move.pos[address] = this.pos[address]
                move.targetpos[address] = this.pos[address]
            }


            var num = this.target[address]

            if (typeof num == "number")
            {
                if (address >= "X" && address <= "Z")
                {
                    if (this.relativeMode)
                        num += this.pos[address]
                    else
                        num += this.offset[address] //absolute position from start

                    if (this.maxval[address] < num)
                        this.maxval[address] = num
                    if (this.minval[address] > num)
                        this.minval[address] = num

                    if (address == "Z" && this.pos[address] != num)
                        isSimpleMove = true; //this wasn't in the XY plane

                    this.pos[address] = num
                    move.targetpos[address] = num
                }
                this.line += address + num
            }
        }

        if (isSimpleMove)
        {
            this.pathShortner.addMove(move)
            this.line = ""
        }
        else
        {
            if (this.handler)
                this.handler(move)
        }


    }
    if (this.line != "")
    {
        this.pathShortner.cleanOut()
        this.lines.push(this.line)
        this.line = ""
    }

    this.target = {}
}

GCMachine.prototype.runSimpleMove = function(move) {
    var l = "G1X" + move.targetpos.X + "Y" + move.targetpos.Y + "Z" + move.targetpos.Z
    this.lines.push(l)
    if (this.handler)
        this.handler(move)
}

var PathShortener = function(gcm)
{
    this.gcm = gcm
}

PathShortener.prototype.addMove = function(move)
{
    var newmove = {targetpos: move.targetpos, pos: move.pos}

    if (this.move)
    {
        newmove.pos = this.move.pos
    }

    if (Math.sqrt((newmove.pos.X - newmove.targetpos.X) * (newmove.pos.X - newmove.targetpos.X) + (newmove.pos.Y - newmove.targetpos.Y) * (newmove.pos.Y - newmove.targetpos.Y)) < 2)
    {
        this.move = newmove
    }
    else
    {
        this.cleanOut()
        this.move = move
    }

}




PathShortener.prototype.cleanOut = function()
{
    if (this.move)
    {
        this.gcm.runSimpleMove(this.move)
        delete this.move
    }
}
