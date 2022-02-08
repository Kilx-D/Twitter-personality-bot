const cp = require("child_process").execSync;


const request = () => {
    cp("curl localhost:3000/tweet");
    setTimeout(request, 600000)
    //1800000
}

request();