var GCMachine = function()
{

    this.handler = null;
}


GCMachine.prototype.reset = function() {
    this.maxval = {X: -99999, Y: -99999, Z: -99999}
    this.minval = {X: 99999, Y: 99999, Z: 99999}
    this.pos = {X: 0, Y: 0, Z: 0}
    this.targetpos = {X: 0, Y: 0, Z: 0}
}

GCMachine.prototype.parse = function(input) {
    //this.out = []
    var lines = input.split("\n")
    for (var i = 0; i < lines.length; i++) {
        this.outline=""
        var line = lines[i] + ";"
        var numtxt = ""
        var address = ""
        for (var j = 0; j < line.length; j++) {
            var c = line.charAt(j).toUpperCase()
            if ((c >= "A" && c <= "Z") || c == ";" || c == "(") {
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
                else if (c == ";") //Zeilenende
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
    //this.out.push("min: "+JSON.stringify(this.minval))
    //this.out.push("max: "+JSON.stringify(this.maxval))
    //return this.out
}

GCMachine.prototype.processCmd = function(address, num) {
    //console.log(address + ": " + num)
    if (address >= "X" && address <= "Z")
    {
        if (this.maxval[address] < num)
            this.maxval[address] = num
        if (this.minval[address] > num)
            this.minval[address] = num
        this.targetpos[address] = num
    }
    //this.out.push(address+":"+num)
}

GCMachine.prototype.applyBlock = function() {
    if (this.handler)
        this.handler(this)
    this.pos.X = this.targetpos.X
    this.pos.Y = this.targetpos.Y
    this.pos.Z = this.targetpos.Z
    //this.out.push("complete: "+comment)
    console.log(this.outline)
}