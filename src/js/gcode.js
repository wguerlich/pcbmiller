var GCMachine = function ()
{
    this.maxval = {X: -99999, Y: -99999, Z: -99999}
    this.minval = {X: 99999, Y: 99999, Z: 99999}
    this.handler = null;
    this.autoleveller = null
    this.reset();
}


GCMachine.prototype.reset = function () {

    this.pos = {X: 0, Y: 0, Z: 0}
    this.target = {}
    this.offset = {X: 0, Y: 0, Z: 0}
    this.lines = []
    this.line = ""
    this.inchMode = false
    this.relativeMode = false
    this.moveMode = "G1"
    this.pathShortner = new PathShortener(this);
    this.vars = {$: function (n) {
            return this["$" + n]
        }}

}

GCMachine.prototype.parse = function (input) {
    //this.out = []
    var lines = input.split("\n")
    for (var i = 0; i < lines.length; i++) {
        this.outline = ""
        var line = lines[i] + ";"

        //Variable assignment
        if (line.charAt(0) == "#")
        {
            this.parseAssign(line)
            continue;
        }

        var numtxt = ""
        var address = ""
        for (var j = 0; j < line.length; j++) {
            var c = line.charAt(j).toUpperCase()
            if ((c >= "A" && c <= "Z") || c == ";" || c == "(" || c == "%") {
                if (address !== "") {
                    this.processCmd(address, this.parseMacro(numtxt))
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

GCMachine.prototype.parseAssign = function (macro)
{
    var p = macro.indexOf(";")
    if (p >= 0)
        macro = macro.substring(0, p)
    if (macro.substring(0, 4) == "#50=")
    {
        this.vars["$50"] = parseFloat(macro.substring(4).trim())
    }
}

GCMachine.prototype.parseMacro = function (macro)
{
    macro = macro.trim()
    if (macro == "[#50+0*#52]")
    {
        return  this.vars["$50"]
    }


    /*
     macro=macro.replace(/#/g,"$").replace(/\[/g,"(").replace(/\]/g,")")
     macro="with this.vars {"+macro+"}"
     var v=eval(macro)
     console.log("macro: " + macro+" value: "+v)
     return v
     */
    return parseFloat(macro)
}

GCMachine.prototype.processCmd = function (address, num) {
    //console.log(address + ": " + num)
    if ("XYZIJKRF".indexOf(address) >= 0) //alle Längenangaben 
    {
        num = Math.floor(num * 1000 * (this.inchMode ? 25.4 : 1) + 0.5) / 1000;
    }

    if ("XYZIJKR".indexOf(address) >= 0) //alle Positionsangaben 
    {
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

GCMachine.prototype.applyBlock = function () {


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
        var move = {pos: {}, targetpos: {}, isNullMove: function () {
                return this.pos.X === this.targetpos.X && this.pos.Y === this.targetpos.Y && this.pos.Z === this.targetpos.Z
            }}

        var isSimpleMove = this.moveMode == "G1" && (this.line == "" || this.line == "G1") //simple linear XY feed motion
        var includeXYZ = (this.moveMode == "G2" || this.moveMode == "G3")

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
                        isSimpleMove = false; // true; //this wasn't in the XY plane

                    this.pos[address] = num
                    move.targetpos[address] = num
                }
                //this.line += address + num.toFixed(3)
                this.line+=this.formatCmd(address,num,this.pos.X,this.pos.Y)
            }
            else if (includeXYZ && address >= "X" && address <= "Z") //avoid ID:26 error
            {
                //this.line += address + this.pos[address].toFixed(3)
                this.line+=this.formatCmd(address,this.pos[address],this.pos.X,this.pos.Y)
            }
        }

        if (!move.isNullMove()) {
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


    }
    if (this.line != "")
    {
        this.pathShortner.cleanOut()
        this.lines.push(this.line)
        this.line = ""
    }

    this.target = {}
}

GCMachine.prototype.formatCmd = function (address, num, x, y)
{
    if (address == "Z" && this.autoleveller && (this.moveMode == "G1" || this.moveMode == "G2" || this.moveMode == "G3"))
    {
        return address + (num + this.autoleveller.interpolate(x, y)).toFixed(3)
    }
    else
        return address + num.toFixed(3)
}

GCMachine.prototype.runSimpleMove = function (move) {
    var x = move.targetpos.X
    var y = move.targetpos.Y
    var z = move.targetpos.Z
    if (this.autoleveller)
    {
        z += this.autoleveller.interpolate(x, y)
    }

    var l = "G1X" + x.toFixed(3) + "Y" + y.toFixed(3) + "Z" + z.toFixed(3)
    this.lines.push(l)
    if (this.handler)
        this.handler(move)
}

var PathShortener = function (gcm)
{
    this.gcm = gcm
}

var margin = 0.02

PathShortener.prototype.addMove = function (move)
{
    var newmove = {targetpos: move.targetpos, pos: move.pos}

    if (this.move)
    {
        newmove.pos = this.move.pos
    }

    var ar = PathShortener.angleRange(newmove, margin)

    var acceptable = true
    if (ar && this.ar)
    {
        var left = PathShortener.isLeftOf(ar.leftMargin, this.ar.leftMargin) ? this.ar.leftMargin : ar.leftMargin
        var right = PathShortener.isLeftOf(ar.rightMargin, this.ar.rightMargin) ? ar.rightMargin : this.ar.rightMargin
        if (PathShortener.isLeftOf(left, right))
            this.ar = {leftMargin: left, rightMargin: right}
        else
            acceptable = false
    }
    if (!this.ar)
        this.ar = ar

    if (acceptable)
    {
        this.move = newmove
    }
    else
    {
        this.cleanOut()
        this.move = move
        this.ar = PathShortener.angleRange(move, margin)
    }

}



PathShortener.angleRange = function (move, margin)
{
    var dx = move.targetpos.X - move.pos.X
    var dy = move.targetpos.Y - move.pos.Y

    var adx = Math.abs(dx)
    var ady = Math.abs(dy)

    var len = Math.sqrt(adx * adx + ady * ady)
    if (len <= margin)
        return //is within the error margin

    var angleMargin = Math.asin(margin / len)

    var ang = adx > ady ? Math.atan(ady / adx) : Math.PI / 2 - Math.atan(adx / ady)

    if (dx <= 0 && dy >= 0)
        ang = Math.PI - ang
    else if (dx <= 0 && dy <= 0)
        ang += Math.PI
    else if (dx >= 0 && dy <= 0)
        ang = 2 * Math.PI - ang

    return {leftMargin: ang + angleMargin, rightMargin: ang - angleMargin}

}


PathShortener.isLeftOf = function (left, right)
{
    var d = left - right
    while (d < 0)
        d += 2 * Math.PI
    while (d > 2 * Math.PI)
        d -= 2 * Math.PI
    return(d < Math.PI)
}

PathShortener.prototype.cleanOut = function ()
{
    if (this.move)
    {
        this.gcm.runSimpleMove(this.move)
    }
    delete this.move
    delete this.ar
}


function AutoLeveller()
{
    this.grbl = null
    this.width = 0
    this.height = 0
    this.grid = 0
    this.probes = {}

    /* this.probes = {"1/1":1,"1/2":2,"2/1":3,"2/2":4} 
     this.widthSteps=2
     this.widthStep =50
     
     this.heightSteps = 2
     this.heightStep = 50*/
}

AutoLeveller.prototype.runProbing = function ()
{
    this.widthSteps = Math.floor(this.width / this.grid + 0.8)
    this.widthStep = this.width / this.widthSteps

    this.heightSteps = Math.floor(this.height / this.grid + 0.8)
    this.heightStep = this.height / this.heightSteps

    this.xn = 0
    this.yn = 0

    this.grbl.sendCmd("G90G21") //inch absolut
    this.grbl.sendCmd("G92X0Y0Z0") //wir sind 0,0,0

    this.nextProbe()

}

AutoLeveller.prototype.nextProbe = function ()
{
    var x = this.xn * this.widthStep
    var y = this.yn * this.heightStep
    var grbl = this.grbl
    var self = this
    grbl.sendCmd("G0X" + x.toFixed(3) + "Y" + y.toFixed(3)) //neue Position
    grbl.sendCmd("G4P0", function () { //auf Idle warten
        grbl.sendCmd("F10G38.2Z-10", function ()
        {
            grbl.queryStatus(function ()
            {
                self.handleProbeResult()
            })
        })
    })
}

AutoLeveller.prototype.handleProbeResult = function ()
{
    var z = this.grbl.Z

    this.probes[this.xn + "/" + this.yn] = z


    this.grbl.log("Probe height: " + this.grbl.Z)
    this.grbl.sendCmd("G0Z0")
    if (++this.yn > this.heightSteps)
    {
        this.yn = 0
        ++this.xn
    }
    if (this.xn <= this.widthSteps)
    {
        this.nextProbe()
    }
}

AutoLeveller.prototype.getProbe = function (x, y)
{
    var p = this.probes[x + "/" + y]
    if (typeof p == "number")
        return p
    return 0
}

AutoLeveller.prototype.interpolate = function (x, y)
{
    var xl, xh, yl, yh
    var xf = 0
    var yf = 0

    //X-Parameter berechnen
    var xn = x / this.widthStep

    if (xn <= 0)
    {
        xl = xh = 0
    }
    else
    if (xn >= this.widthSteps)
    {
        xl = xh = this.widthSteps
    }
    else
    {
        xl = Math.floor(xn)
        xh = xl + 1
        xf = xn - xl
    }

    //Y-Parameter berechen
    var yn = y / this.heightStep

    if (yn <= 0)
    {
        yl = yh = 0
    }
    else
    if (yn >= this.heightSteps)
    {
        yl = yh = this.heightSteps
    }
    else
    {
        yl = Math.floor(yn)
        yh = yl + 1
        yf = yn - yl
    }


    //unteren Wert berechnen
    var vl = this.getProbe(xl, yl) * (1 - xf) + this.getProbe(xh, yl) * xf

    //oberen Wert berechnen
    var vh = this.getProbe(xl, yh) * (1 - xf) + this.getProbe(xh, yh) * xf

    //mittleren Wert berechnen
    var v = vl * (1 - yf) + vh * yf

    //console.log("x:" + x + " y:" + y + " v:" + v)
    return v

}
